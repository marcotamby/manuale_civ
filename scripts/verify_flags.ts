
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://laliiuqjpxanhwhxajlm.supabase.co";
const supabaseAnonKey = "sb_publishable_YqzdNb426zLf8O_AQNp92w_Ped6jeB0";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, name, flag');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- Database Mapping ---');
  data.forEach(c => console.log(`${c.id}: ${c.name} flag-> ${c.flag}`));
  
  const malians = data.find(c => c.id === 'malians');
  const ayyubids = data.find(c => c.id === 'ayyubids');
  
  if (malians && ayyubids) {
    console.log('\nFixing if necessary...');
    
    // Ensure correct mapping
    if (malians.flag !== '/civs/Malians.png') {
       console.log('Updating Maliani flag...');
       await supabase.from('civilizations').update({ flag: '/civs/Malians.png' }).eq('id', 'malians');
    }
    
    if (ayyubids.flag !== '/civs/Ayyubids.png') {
       console.log('Updating Ayyubidi flag...');
       await supabase.from('civilizations').update({ flag: '/civs/Ayyubids.png' }).eq('id', 'ayyubids');
    }
    
    console.log('Done.');
  }
}

check();
