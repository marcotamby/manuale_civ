import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function examineData() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, name, passive_bonuses, strengths, weaknesses, build_orders');

  if (error) {
    console.error("Error fetching civilizations:", error);
    return;
  }

  console.log(`Fetched ${data.length} civilizations.`);
  
  const report = data.map(c => ({
    id: c.id,
    name: c.name,
    bonusesCount: c.passive_bonuses?.length || 0,
    strengthsCount: c.strengths?.length || 0,
    weaknessesCount: c.weaknesses?.length || 0,
    buildOrdersCount: c.build_orders?.length || 0,
    hasContent: (c.passive_bonuses?.length > 0) || (c.strengths?.length > 0) || (c.weaknesses?.length > 0) || (c.build_orders?.length > 0)
  }));

  console.table(report);
  
  fs.writeFileSync('scripts/supabase_civ_dump.json', JSON.stringify(data, null, 2));
  console.log("Dump saved to scripts/supabase_civ_dump.json");
}

examineData();
