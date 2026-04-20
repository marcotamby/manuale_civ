
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error(error);
    return;
  }
  console.log('Available buckets:', data.map(b => b.name));
}

run();
