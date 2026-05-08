import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, sheep_balance')
    .limit(5);

  if (error) {
    console.error('❌ Errore:', error.message);
    return;
  }

  console.log('Profiles check:');
  data.forEach(p => {
    console.log(`- ${p.email}: ${p.sheep_balance} 🐑`);
  });
}

checkProfiles();
