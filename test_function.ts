import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunction() {
  console.log('Invoking function...');
  try {
    const { data, error } = await supabase.functions.invoke('batch-send-notifications');
    if (error) {
      console.error('Function Error:', error);
    } else {
      console.log('Function Data:', data);
    }
  } catch (err) {
    console.error('Catch Error:', err);
  }
}

testFunction();
