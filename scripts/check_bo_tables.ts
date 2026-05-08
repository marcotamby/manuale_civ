import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Checking for build_orders table...');
  const { data, error } = await supabase
    .from('build_orders')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error querying build_orders table:', error.message);
  } else {
    console.log(`Found ${data.length} rows in build_orders table.`);
    console.log(JSON.stringify(data, null, 2));
  }

  console.log('\nChecking for build_order_votes table...');
  const { data: votes, error: votesError } = await supabase
    .from('build_order_votes')
    .select('*')
    .limit(5);

  if (votesError) {
    console.error('Error querying build_order_votes table:', votesError.message);
  } else {
    console.log(`Found ${votes.length} rows in build_order_votes table.`);
  }
}

main();
