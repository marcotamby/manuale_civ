import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addEventLevelColumn() {
  console.log('Adding event_level column to betting_markets...');
  const { error } = await supabase.rpc('execute_sql', {
    sql_query: 'ALTER TABLE betting_markets ADD COLUMN IF NOT EXISTS event_level TEXT DEFAULT \'High Elo\';'
  });

  if (error) {
    console.error('Error adding column:', error);
  } else {
    console.log('Column added successfully!');
  }
}

addEventLevelColumn();
