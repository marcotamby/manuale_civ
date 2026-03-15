import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching past state from Supabase (restored to 7 AM)...');
  const { data: pastCivs, error } = await supabase
    .from('civilizations')
    .select('*');

  if (error) {
    console.error('Error fetching past civs:', error);
    process.exit(1);
  }

  const presentStatePath = path.join(process.cwd(), 'scripts', 'supabase_civs_present_state.json');
  const presentCivs = JSON.parse(fs.readFileSync(presentStatePath, 'utf-8'));

  let mergedCount = 0;
  
  // Civs we specifically want to ensure we recover from the past state
  const civsToRecover = ['mongols', 'delhi', 'french', 'abbasid'];
  
  console.log('Merging past build orders into present state...');

  for (const presentCiv of presentCivs) {
    const pastCiv = pastCivs.find((c: any) => c.id === presentCiv.id);
    
    if (pastCiv && pastCiv.build_orders && pastCiv.build_orders.length > 0) {
      // If present civ has no build orders, or is one of the specifically targeted ones
      if (!presentCiv.build_orders || presentCiv.build_orders.length === 0 || civsToRecover.includes(presentCiv.id)) {
        
        presentCiv.build_orders = presentCiv.build_orders || [];
        
        for (const pastBo of pastCiv.build_orders) {
          // Avoid duplicating if it already exists
          if (!presentCiv.build_orders.some((bo: any) => bo.title === pastBo.title)) {
            presentCiv.build_orders.push(pastBo);
            console.log(`✅ Recovered build order '${pastBo.title}' for ${presentCiv.id}`);
            mergedCount++;
          }
        }
      }
    }
  }

  const mergedOutputPath = path.join(process.cwd(), 'scripts', 'supabase_civs_merged_state.json');
  fs.writeFileSync(mergedOutputPath, JSON.stringify(presentCivs, null, 2));
  console.log(`\n🎉 Successfully merged ${mergedCount} build orders from the past!`);
  console.log(`Saved full merged database to ${mergedOutputPath}`);
}

main();
