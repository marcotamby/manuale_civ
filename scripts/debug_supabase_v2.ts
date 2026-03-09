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
  console.log("--- Checking civilizations table ---");
  const { data, error } = await supabase.from('civilizations').select('*').limit(1);
  if (error) {
    console.error("Error fetching civilizations:", error);
  } else if (data && data[0]) {
    console.log("Keys in civilizations row:", Object.keys(data[0]));
    console.log("Example data types:", Object.entries(data[0]).map(([k, v]) => `${k}: ${v === null ? 'null' : (Array.isArray(v) ? 'array' : typeof v)}`));
  } else {
    console.log("No data in civilizations table.");
  }
  
  console.log("\n--- Checking suggestions table ---");
  const { data: suggestions, error: sError } = await supabase.from('suggestions').select('*').eq('status', 'pending');
  if (sError) {
    console.error("Suggestions Error:", sError);
  } else {
    console.log("Pending Suggestions:", suggestions.length);
    if (suggestions.length > 0) {
      console.log("Example suggestion row keys:", Object.keys(suggestions[0]));
    }
  }
}

check();
