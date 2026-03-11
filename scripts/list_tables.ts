import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // Supabase doesn't have a direct "list tables" in the JS client for simple users,
  // but we can try to query some known tables or use an RPC if available.
  // Alternatively, we can try to guess or use the information from previous logs.
  
  console.log("Checking for common tables...");
  const tables = ['civilizations', 'build_orders', 'units', 'landmarks', 'suggestions', 'proposals', 'users', 'profiles'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Table '${table}' does not exist or error:`, error.message);
    } else {
      console.log(`✅ Table '${table}' exists. Row count: ${count}`);
    }
  }
}

listTables();
