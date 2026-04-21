import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenziali Supabase mancanti nel file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_BACKUP = [
  'civilizations',
  'suggestions',
  'faq_settings',
  'faq_sections',
  'faq_items',
  'profiles',
  'build_order_votes'
];

async function backupDatabase() {
  console.log('🚀 Inizio backup del database Supabase...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const sessionBackupDir = path.join(backupDir, `backup_${timestamp}`);
  fs.mkdirSync(sessionBackupDir, { recursive: true });

  for (const table of TABLES_TO_BACKUP) {
    console.log(`📡 Scaricamento tabella ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`❌ Errore scaricamento ${table}:`, error.message);
      continue;
    }

    if (data) {
      const tablePath = path.join(sessionBackupDir, `${table}.json`);
      const latestPath = path.join(backupDir, `${table}_latest.json`);
      
      fs.writeFileSync(tablePath, JSON.stringify(data, null, 2));
      fs.writeFileSync(latestPath, JSON.stringify(data, null, 2));
      console.log(`✅ Table '${table}' salvata (${data.length} righe)`);
    }
  }

  console.log('\n🎉 Backup dei file JSON completato con successo!');
}

backupDatabase();
