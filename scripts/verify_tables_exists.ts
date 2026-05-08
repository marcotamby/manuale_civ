import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  const tablesToCheck = [
      'civilizations', 'suggestions', 'faq_settings', 'faq_sections', 'faq_items', 
      'profiles', 'build_orders', 'build_order_votes', 'betting_markets', 
      'user_bets', 'betting_notifications', 'tournaments', 'tournament_teams', 
      'tournament_matches', 'stream_overlays', 'votes', 'qa_votes',
      'units', 'landmarks', 'technologies', 'matchups', 'players', 'teams', 'matches', 'brackets', 'logs', 'audit_log'
  ];
  
  for (const table of tablesToCheck) {
    const { error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!tableError) {
        console.log(`✅ '${table}': EXISTS`);
    } else {
        console.log(`❌ '${table}': FAILED - ${tableError.message}`);
    }
  }
}

listAllTables();
