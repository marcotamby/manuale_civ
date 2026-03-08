import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { civilizationsData, unitsList } from '../src/data/aoe4Data.js';
import * as url from 'url';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Errore: Le variabili VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY non sono definite nel file .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("🚀 Inizio migrazione verso Supabase...\n");

  try {
    // 1. Migrazione Unità Globali (unitsList)
    console.log(`📦 Caricamento di ${unitsList.length} unità globali...`);
    for (const unit of unitsList) {
      const { error } = await supabase
        .from('global_units')
        .upsert({
          id: unit.id,
          name: unit.name,
          type: unit.type,
          age: unit.age,
          stats: unit.stats,
          strengths: unit.strengths,
          weaknesses: unit.weaknesses,
          description: unit.description
        }, { onConflict: 'id' });

      if (error) console.error(`Errore caricamento unità ${unit.id}:`, error.message);
    }
    console.log("✅ Unità globali caricate!\n");

    // 2. Migrazione Civiltà
    console.log(`🌍 Caricamento di ${civilizationsData.length} civiltà...`);
    for (const civ of civilizationsData) {
      const { error } = await supabase
        .from('civilizations')
        .upsert({
          id: civ.id,
          name: civ.name,
          flag: civ.flag,
          difficulty: civ.difficulty,
          short_description: civ.shortDescription,
          passive_bonuses: civ.passiveBonuses,
          unique_units: civ.uniqueUnits,
          technologies: civ.technologies,
          landmarks: civ.landmarks,
          videos: civ.videos || [],
          build_orders: civ.buildOrders || []
        }, { onConflict: 'id' });
        
      if (error) {
        console.error(`Errore caricamento civiltà ${civ.id}:`, error.message);
      } else {
        console.log(`   🔸 ${civ.name} caricata.`);
      }
    }
    console.log("\n✅ Tutte le civiltà sono state caricate su Supabase!");
    console.log("🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!");

  } catch (err) {
    console.error("Si è verificato un errore critico durante la migrazione:", err);
  }
}

migrate();
