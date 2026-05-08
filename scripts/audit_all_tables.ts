import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  // Using a query to get all tables from public schema
  const { data, error } = await supabase.rpc('get_tables'); // If RPC exists
  
  // If no RPC, let's try a direct query on a system table (if allowed) or just check known ones plus others
  if (error) {
    console.log("No RPC found, trying manual check of known and potential tables...");
    const tablesToCheck = [
      'civilizations', 'suggestions', 'faq_settings', 'faq_sections', 'faq_items', 
      'profiles', 'build_orders', 'build_order_votes', 'betting_markets', 
      'user_bets', 'betting_notifications', 'tournaments', 'tournament_teams', 
      'tournament_matches', 'stream_overlays', 'votes', 'qa_votes'
    ];
    
    for (const table of tablesToCheck) {
      const { error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (!tableError) {
        console.log(`✅ Table '${table}' exists.`);
      }
    }
  } else {
    console.log("Tables found via RPC:", data);
  }
}

listAllTables();
