
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpCivs() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching civilizations:', error);
    process.exit(1);
  }

  fs.writeFileSync('current_supabase_civs.json', JSON.stringify(data, null, 2));
  console.log('Dumped current Supabase civilizations to current_supabase_civs.json');
}

dumpCivs();
