import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkRLS() {
  const { data, error } = await supabase
    .rpc('get_policies_for_table', { table_name: 'stream_overlays' });

  if (error) {
    console.log('RPC get_policies_for_table not found, trying alternative.');
    // Check if we can just do a test update and see the error message
    const { error: updateError } = await supabase
      .from('stream_overlays')
      .update({ description: 'test' })
      .eq('id', 'aoe4-match');
    
    if (updateError) {
      console.error('Test update error:', updateError);
    } else {
      console.log('Test update successful (or at least no error returned).');
    }
  } else {
    console.log('Policies:', data);
  }
}

checkRLS();
