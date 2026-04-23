import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function verify() {
  console.log('Testing update on aoe4-match...');
  const { data: updateData, error: updateError } = await supabase
    .from('stream_overlays')
    .upsert({ id: 'aoe4-match', description: 'desc-test-' + Date.now() }, { onConflict: 'id' })
    .select();

  if (updateError) {
    console.error('Update Error:', updateError);
  } else {
    console.log('Update Data (Select):', updateData);
  }

  const { data: selectData } = await supabase
    .from('stream_overlays')
    .select('*')
    .eq('id', 'aoe4-match')
    .single();
    
  console.log('Final State:', selectData);
}

verify();
