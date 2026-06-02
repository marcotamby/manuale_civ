import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('privacy_policy').select('*').limit(1);
  if (error) {
    console.log('Error or table does not exist:', error.message);
  } else {
    console.log('Table exists! Data:', data);
  }
}

check();
