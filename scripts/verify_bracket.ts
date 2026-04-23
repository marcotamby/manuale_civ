import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function verify() {
  const id = 'tournament-1v1-bracket';
  console.log(`Testing update on ${id}...`);
  const { data: updateData, error: updateError } = await supabase
    .from('stream_overlays')
    .upsert({ id, description: 'bracket-test-' + Date.now() }, { onConflict: 'id' })
    .select();

  if (updateError) {
    console.error('Update Error:', updateError);
  } else {
    console.log('Update Data (Select):', updateData);
  }

  const { data: selectData } = await supabase
    .from('stream_overlays')
    .select('*')
    .eq('id', id)
    .single();
    
  console.log('Final State:', selectData);
}

verify();
