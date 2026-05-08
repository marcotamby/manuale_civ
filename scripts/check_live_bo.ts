import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, name, build_orders')
    .eq('id', 'english')
    .single();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`Civ: ${data.name}`);
    console.log(`Build Orders: ${JSON.stringify(data.build_orders, null, 2)}`);
  }
}

main();
