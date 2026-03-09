import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: civs } = await supabase.from('civilizations').select('name');
  console.log("Civ names in DB:", civs?.map(c => `"${c.name}"`));
  
  const { data: suggs } = await supabase.from('suggestions').select('civ_name');
  console.log("Civ names in Suggestions:", suggs?.map(s => `"${s.civ_name}"`));
}

check();
