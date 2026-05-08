import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBets() {
  const { data, count, error } = await supabase
    .from('user_bets')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('❌ Errore:', error.message);
    return;
  }

  console.log(`📊 Totale scommesse trovate: ${count}`);
  if (data && data.length > 0) {
    console.log('Recenti:');
    data.slice(-5).forEach(bet => {
      console.log(`- User: ${bet.user_id}, Amount: ${bet.amount}, Created: ${bet.created_at}`);
    });
  }
}

checkBets();
