import { createClient } from '@supabase/supabase-api';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking user_bets table...');
  const { data, error } = await supabase
    .from('user_bets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching user_bets:', error);
  } else {
    console.log('Recent bets:', data);
  }

  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, username, sheep_balance')
    .limit(5);
  
  if (pError) console.error('Error fetching profiles:', pError);
  else console.log('Profiles:', profiles);
}

check();
