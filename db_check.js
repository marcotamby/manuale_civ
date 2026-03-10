import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://laliiuqjpxanhwhxajlm.supabase.co';
const supabaseKey = 'sb_publishable_YqzdNb426zLf8O_AQNp92w_Ped6jeB0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSuggestions() {
  console.log('Checking suggestions...');
  const { data, error } = await supabase
    .from('suggestions')
    .select('id, user_email, status, notified, civ_name')
    .neq('status', 'pending')
    .eq('notified', false);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Pending notifications:', data?.length || 0);
    console.log(JSON.stringify(data, null, 2));
  }
}

checkSuggestions();
