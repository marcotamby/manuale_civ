
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function fixMissingIds() {
  const { data, error } = await supabase.from('civilizations').select('id, build_orders');
  if (error) {
    console.error(error);
    return;
  }
  
  for (const civ of data) {
    if (civ.build_orders && Array.isArray(civ.build_orders)) {
      let changed = false;
      const updatedBOs = civ.build_orders.map((bo: any, index: number) => {
        if (!bo.id) {
          changed = true;
          return {
            ...bo,
            id: `bo-fixed-${Date.now()}-${index}`
          };
        }
        return bo;
      });
      
      if (changed) {
        console.log(`Fixing IDs for ${civ.id}...`);
        const { error: updateError } = await supabase
          .from('civilizations')
          .update({ build_orders: updatedBOs })
          .eq('id', civ.id);
          
        if (updateError) {
          console.error(`Error updating ${civ.id}:`, updateError);
        } else {
          console.log(`Successfully fixed IDs for ${civ.id}`);
        }
      }
    }
  }
  console.log("Fix complete.");
}

fixMissingIds();
