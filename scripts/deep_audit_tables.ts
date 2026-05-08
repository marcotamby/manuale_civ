import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  // Query to get all tables from public schema using SQL
  const { data, error } = await supabase
    .from('civilizations') // Need a table to run query? No, we use RPC or just try a raw query if possible.
    .select('id')
    .limit(1);

  // Since I don't have direct SQL access via JS client easily without RPC, 
  // I will use a more robust detection: I'll try to fetch 0 rows from every likely table name.
  // Actually, the previous audit was quite good. Let's add a few more likely ones.
  const commonNames = ['units', 'landmarks', 'technologies', 'matchups', 'players', 'teams', 'matches', 'brackets', 'logs', 'audit_log'];
  
  console.log("Checking additional common table names...");
  for (const table of commonNames) {
    const { error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!tableError) {
        console.log(`✅ Table '${table}' exists.`);
    }
  }
}

listAllTables();
