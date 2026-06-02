import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

let envPath = '.env.local';
if (!fs.existsSync(envPath)) envPath = '.env';
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Reading migration file...');
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase_privacy_migration.sql'), 'utf8');

  console.log('Executing SQL migration on Supabase...');
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: sql
  });

  if (error) {
    console.error('❌ Error executing migration:', error);
  } else {
    console.log('✅ Migration executed successfully!', data);
  }
}

runMigration();
