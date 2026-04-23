import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function findTournament() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .or('name.ilike.%primavera%,slug.ilike.%primavera%');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Results:', JSON.stringify(data, null, 2));
  }
}

findTournament();
