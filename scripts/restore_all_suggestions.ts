import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreSuggestions() {
  const filePath = path.join(process.cwd(), 'scripts', 'suggestions_full_recovery.json');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Recovery file not found!');
    return;
  }

  const suggestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📂 Loaded ${suggestions.length} suggestions.`);

  // Grouped by civilization
  const civUpdates: Record<string, any> = {};

  for (const sig of suggestions) {
    if (sig.status !== 'implemented') continue;

    const civName = sig.civ_name;
    if (!civUpdates[civName]) {
      civUpdates[civName] = {
        strengths: [],
        weaknesses: [],
        build_orders: [],
        bonus: []
      };
    }

    const section = sig.section;
    const text = sig.suggestion_text;

    if (section === 'punti_di_forza') {
      civUpdates[civName].strengths.push(text);
    } else if (section === 'punti_di_debolezza') {
      civUpdates[civName].weaknesses.push(text);
    } else if (section === 'build_order') {
        // For build orders, we currently store them as a single step or try to parse if possible.
        // For now, let's keep it simple and add it as a "Full Build Order" step if it's long text.
        civUpdates[civName].build_orders.push({
            title: "Build Order Recuperata",
            description: text,
            steps: [] // We'll need to parse this if we want it structured
        });
    } else if (section === 'bonus' || section === 'caratteristiche') {
        civUpdates[civName].bonus.push(text);
    }
  }

  console.log('🚀 Starting restoration...');

  const nameMapping: Record<string, string> = {
    'Dinastia Abbaside': 'Abbasidi',
    'Dinastia di Tughlaq': 'Dinastia di Tughlaq', // Match
    'Sultanato di Delhi': 'Sultanato di Delhi', // Match
    'Civ di Test (AI)': 'TEST_SKIP',
    'Civ di Test (Premium)': 'TEST_SKIP'
  };

  for (let [civName, updates] of Object.entries(civUpdates)) {
    if (nameMapping[civName]) {
        if (nameMapping[civName] === 'TEST_SKIP') continue;
        civName = nameMapping[civName];
    }
    console.log(`📡 Updating ${civName}...`);
    
    // 1. Get current civ data (especially the ID)
    const { data: civs, error: fetchError } = await supabase
      .from('civilizations')
      .select('*')
      .ilike('name', civName);

    if (fetchError || !civs || civs.length === 0) {
      console.error(`❌ Could not find civilization ${civName}`);
      continue;
    }

    const civ = civs[0];
    
    // 2. Merge data
    // We append if they are empty or just replace for now to ensure a "clean" restoration
    const finalStrengths = Array.from(new Set([...(civ.strengths || []), ...updates.strengths]));
    const finalWeaknesses = Array.from(new Set([...(civ.weaknesses || []), ...updates.weaknesses]));
    const finalBuildOrders = updates.build_orders; // For build orders, we replace to avoid duplicates of the messy text
    const finalBonus = Array.from(new Set([...(civ.passive_bonuses || []), ...updates.bonus]));

    const { error: updateError } = await supabase
      .from('civilizations')
      .update({
        strengths: finalStrengths,
        weaknesses: finalWeaknesses,
        build_orders: finalBuildOrders,
        passive_bonuses: finalBonus
      })
      .eq('id', civ.id);

    if (updateError) {
      console.error(`❌ Error updating ${civName}:`, updateError.message);
    } else {
      console.log(`✅ ${civName} restored.`);
    }
  }

  console.log('🎉 Restoration finished!');
}

restoreSuggestions().catch(console.error);
