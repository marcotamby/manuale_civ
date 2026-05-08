
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Try to find .env or .env.local
let envPath = '.env.local';
if (!fs.existsSync(envPath)) envPath = '.env';

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCivs() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, name');

  if (error) {
    console.error('Error fetching civs:', error);
    return;
  }

  console.log('Civs in Supabase:', data.length);
  data.forEach((c: any, i: number) => {
    console.log(`${i + 1}. ${c.id} (${c.name})`);
  });
}

checkCivs();
