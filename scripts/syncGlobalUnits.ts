import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { unitsList } from '../src/data/aoe4Data';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function syncGlobalUnits() {
    console.log('📦 Sincronizzazione unità globali...');

    for (const unit of unitsList) {
        console.log(`📡 Aggiornamento ${unit.id} (${unit.name})...`);
        
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
                description: unit.description,
                image_id: unit.imageId,
                excluded_civs: unit.excludedCivs || []
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.error(`❌ Errore su ${unit.id}:`, error.message);
        } else {
            console.log(`✅ ${unit.id} aggiornata.`);
        }
    }

    console.log('🎉 Sincronizzazione unità globali completata!');
}

syncGlobalUnits().catch(err => {
    console.error('💥 Errore fatale:', err);
});
