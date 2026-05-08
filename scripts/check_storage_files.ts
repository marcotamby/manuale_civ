import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFiles() {
  console.log('📡 Listing files in civilizations bucket...');
  const { data, error } = await supabase.storage.from('civilizations').list('build-orders');
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  console.log('✅ Files in build-orders/ folder:', data.length);
  data.forEach(f => console.log(`- ${f.name}`));
}

listFiles();
