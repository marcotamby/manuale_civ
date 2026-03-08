import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { civilizationsData } from '../src/data/aoe4Data';
const civsToSync = civilizationsData as any;

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * SQL TO RUN IN SUPABASE BEFORE RUNNING THIS SCRIPT:
 * 
 * -- 1. Disable RLS (if not already done)
 * ALTER TABLE civilizations DISABLE ROW LEVEL SECURITY;
 * 
 * -- 2. Add missing columns
 * ALTER TABLE civilizations 
 * ADD COLUMN IF NOT EXISTS unique_units JSONB[] DEFAULT '{}',
 * ADD COLUMN IF NOT EXISTS technologies JSONB[] DEFAULT '{}',
 * ADD COLUMN IF NOT EXISTS landmarks JSONB[] DEFAULT '{}';
 */

async function syncAllData() {
    console.log('🚀 Sincronizzazione completa di tutte le civiltà...');

    for (const civ of civsToSync) {
        console.log(`📡 Aggiornamento ${civ.id} (${civ.name})...`);
        
        const { error } = await supabase
            .from('civilizations')
            .upsert({ 
                id: civ.id,
                name: civ.name,
                difficulty: civ.difficulty,
                short_description: civ.shortDescription,
                passive_bonuses: civ.passiveBonuses,
                unique_units: civ.uniqueUnits,
                technologies: civ.technologies,
                landmarks: civ.landmarks,
                videos: civ.videos || [],
                build_orders: civ.buildOrders || []
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.error(`❌ Errore su ${civ.id}:`, error.message);
        } else {
            console.log(`✅ ${civ.id} aggiornata.`);
        }
    }

    console.log('🎉 Sincronizzazione completata con successo!');
}

syncAllData().catch(err => {
    console.error('💥 Errore fatale durante la sincronizzazione:', err);
});
