
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://laliiuqjpxanhwhxajlm.supabase.co";
const supabaseAnonKey = "sb_publishable_YqzdNb426zLf8O_AQNp92w_Ped6jeB0";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkVideos() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, name, videos');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- Video Data ---');
  data.forEach(c => {
    console.log(`Civ: ${c.name} (${c.id})`);
    console.log(`Videos: ${JSON.stringify(c.videos)}`);
    console.log('---');
  });
}

checkVideos();
