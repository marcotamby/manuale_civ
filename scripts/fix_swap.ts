
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://laliiuqjpxanhwhxajlm.supabase.co";
const supabaseAnonKey = "sb_publishable_YqzdNb426zLf8O_AQNp92w_Ped6jeB0";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
  console.log('Fixing Ayyubidi and Maliani...');
  
  // Fix Ayyubidi name and flag
  const { error: ayError } = await supabase
    .from('civilizations')
    .update({ 
      name: 'Ayyubidi',
      flag: '/civs/Ayyubids.png' 
    })
    .eq('id', 'ayyubids');
  
  if (ayError) console.error('Ayyubidi Error:', ayError);
  else console.log('Ayyubidi fixed.');

  // Fix Maliani name and flag
  const { error: maError } = await supabase
    .from('civilizations')
    .update({ 
      name: 'Maliani',
      flag: '/civs/Malians.png' 
    })
    .eq('id', 'malians');

  if (maError) console.error('Maliani Error:', maError);
  else console.log('Maliani fixed.');
}

fix();
