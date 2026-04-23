import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function cleanup() {
  console.log('Cleaning up test descriptions...');
  await supabase
    .from('stream_overlays')
    .update({ description: null })
    .in('id', ['aoe4-match', 'tournament-1v1-bracket']);
  console.log('Cleanup done.');
}

cleanup();
