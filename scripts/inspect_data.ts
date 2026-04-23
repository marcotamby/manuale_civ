import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function inspect() {
  const { data, error } = await supabase
    .from('stream_overlays')
    .select('*');

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Table Data:', JSON.stringify(data, null, 2));
  }
}

inspect();
