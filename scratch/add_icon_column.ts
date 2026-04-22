import { createClient } from '@supabase/supabase-client';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addIconColumn() {
  console.log('Adding icon_url column to stream_overlays...');
  const { error } = await supabase.rpc('execute_sql', {
    sql_query: 'ALTER TABLE stream_overlays ADD COLUMN IF NOT EXISTS icon_url TEXT;'
  });

  if (error) {
    console.error('Error adding column:', error);
  } else {
    console.log('Column added successfully!');
  }
}

addIconColumn();
