
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

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

async function inspectJin() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('*')
    .eq('id', 'jin-dynasty')
    .single();

  if (error) {
    console.error('Error fetching Jin Dynasty:', error);
    return;
  }

  console.log('Jin Dynasty in Supabase:');
  console.log(JSON.stringify(data, null, 2));
}

inspectJin();
