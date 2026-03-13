import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from the project
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFavorites() {
  console.log('--- Checking user_favorites Table ---');
  
  const { data, error, count } = await supabase
    .from('user_favorites')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching favorites:', error);
    return;
  }

  console.log(`Total rows in user_favorites: ${count}`);
  console.log('Sample Data:', data?.slice(0, 10));

  // Check specific civs mentioned by user
  const civsToCheck = ['hre', 'holy-roman-empire', 'sengoku', 'japanese'];
  for (const civId of civsToCheck) {
    const { count: civCount } = await supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('civ_id', civId);
    console.log(`- Count for ${civId}: ${civCount}`);
  }
}

checkFavorites();
