import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('civilizations').select('id, name, shortDescription, passiveBonuses, strengths, weaknesses');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Civilizations found:", data.length);
    data.forEach(c => console.log(`- ID: ${c.id}, Name: "${c.name}"`));
  }
  
  const { data: suggestions, error: sError } = await supabase.from('suggestions').select('*').eq('status', 'pending');
  if (sError) {
    console.error("Suggestions Error:", sError);
  } else {
    console.log("Pending Suggestions:", suggestions.length);
    suggestions.forEach(s => console.log(`- Suggestion for: "${s.civ_name}" (section: ${s.section})`));
  }
}

check();
