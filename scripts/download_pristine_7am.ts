import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching pristine 7 AM state from Supabase...');
  const { data, error } = await supabase
    .from('civilizations')
    .select('*');

  if (error) {
    console.error('Error fetching civilizations:', error);
    process.exit(1);
  }

  const outputPath = path.join(process.cwd(), 'scripts', 'state_7am_pristine.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Successfully saved ${data.length} civilizations to ${outputPath}`);
}

main();
