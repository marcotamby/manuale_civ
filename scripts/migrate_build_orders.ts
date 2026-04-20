
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateBuildOrders() {
  console.log('🚀 Starting Build Order migration...');

  const { data: civs, error } = await supabase
    .from('civilizations')
    .select('id, build_orders');

  if (error) {
    console.error('Error fetching civs:', error);
    return;
  }

  for (const civ of civs) {
    if (!civ.build_orders || !Array.isArray(civ.build_orders)) continue;

    let modified = false;
    const newBuildOrders = civ.build_orders.map((bo: any) => {
      let newDifficulty = bo.difficulty;
      
      if (bo.difficulty === 'Easy') {
        newDifficulty = 1;
        modified = true;
      } else if (bo.difficulty === 'Medium') {
        newDifficulty = 2;
        modified = true;
      } else if (bo.difficulty === 'Advanced') {
        newDifficulty = 3;
        modified = true;
      } else if (typeof bo.difficulty === 'string') {
          if (bo.difficulty.toLowerCase().includes('fac')) newDifficulty = 1;
          else if (bo.difficulty.toLowerCase().includes('med')) newDifficulty = 2;
          else newDifficulty = 3;
          modified = true;
      }

      return {
        ...bo,
        difficulty: newDifficulty,
        banner_url: bo.banner_url || ''
      };
    });

    console.log(`Checking civ: ${civ.id}`);
    const { error: updateError } = await supabase
      .from('civilizations')
      .update({ build_orders: newBuildOrders })
      .eq('id', civ.id);

    if (updateError) {
      console.error(`Error updating civ ${civ.id}:`, updateError);
    }
  }

  console.log('✅ Migration complete!');
}

migrateBuildOrders();
