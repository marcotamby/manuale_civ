import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportTable(tableName: string) {
  console.log(`📡 Exporting ${tableName}...`);
  const { data, error } = await supabase.from(tableName).select('*');

  if (error) {
    console.error(`Error exporting ${tableName}:`, error.message);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const fileName = `${tableName}_backup_${timestamp}.json`;
  const filePath = path.join(backupDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ ${tableName} exported to ${filePath}`);
  
  // Also update a 'latest' file for easy git tracking
  const latestPath = path.join(backupDir, `${tableName}_latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(data, null, 2));
}

async function runBackup() {
  await exportTable('civilizations');
  await exportTable('suggestions');
  await exportTable('build_orders');
  console.log('🎉 Backup process finished.');
}

runBackup();
