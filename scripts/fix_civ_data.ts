
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://laliiuqjpxanhwhxajlm.supabase.co";
const supabaseAnonKey = "sb_publishable_YqzdNb426zLf8O_AQNp92w_Ped6jeB0";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndFix() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, name, flag');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Current Civs:');
  data.forEach(c => console.log(`${c.id}: ${c.name} (${c.flag})`));

  // Find Abbasid mislabeled as Byzantine
  const abbasidEntry = data.find(c => c.id === 'abbasid' || c.flag.includes('Abbasid'));
  
  if (abbasidEntry && abbasidEntry.name === 'Bizantini') {
    console.log('Fixing Abbasid name...');
    const { error: updateError } = await supabase
      .from('civilizations')
      .update({ name: 'Dinastia Abbaside' })
      .eq('id', abbasidEntry.id);
    
    if (updateError) console.error('Update Error:', updateError);
    else console.log('Fixed Abbasid name.');
  }

  // Ensure Byzantines are correct
  const byzantineEntry = data.find(c => c.id === 'byzantines');
  if (byzantineEntry && !byzantineEntry.flag.includes('Byzantines')) {
     console.log('Fixing Byzantines flag...');
      await supabase
      .from('civilizations')
      .update({ flag: '/civs/Byzantines.png' })
      .eq('id', 'byzantines');
  }
}

checkAndFix();
