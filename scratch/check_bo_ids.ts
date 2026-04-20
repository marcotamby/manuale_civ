
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const { data, error } = await supabase.from('civilizations').select('id, build_orders');
  if (error) {
    console.error(error);
    return;
  }
  
  data.forEach(c => {
    if (c.build_orders && Array.isArray(c.build_orders)) {
      c.build_orders.forEach((bo: any) => {
        console.log(`Civ: ${c.id} | BO Title: ${bo.title} | ID: ${bo.id}`);
      });
    }
  });
}

run();
