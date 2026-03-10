import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://laliiuqjpxanhwhxajlm.supabase.co';
const supabaseKey = 'sb_publishable_YqzdNb426zLf8O_AQNp92w_Ped6jeB0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTest() {
  console.log('Creating test suggestion...');
  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      civ_name: 'Civ di Test (AI)',
      section: 'Test Automatizzato',
      suggestion_text: 'Questo è un test per verificare le notifiche v2.2',
      user_email: 'marco.tamborrino.94@gmail.com',
      user_name: 'Marco Test',
      status: 'implemented',
      notified: false
    });

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Test suggestion created successfully!');
  }
}

createTest();
