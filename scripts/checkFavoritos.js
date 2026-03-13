import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple env parser
function loadEnv() {
  const content = fs.readFileSync('.env', 'utf8');
  const lines = content.split('\n');
  const env = {};
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

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
  console.log('Sample Data:', JSON.stringify(data?.slice(0, 5), null, 2));

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
