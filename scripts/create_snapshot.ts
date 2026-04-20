import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
  'build_orders'
];

async function createSnapshot() {
  const comment = process.argv[2] || 'manual_snapshot';
  const cleanComment = comment.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log(`🚀 Creazione snapshot: ${comment}...`);
  const backupDir = path.join(process.cwd(), 'backups', 'snapshots');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const snapshotDir = path.join(backupDir, `${timestamp}_${cleanComment}`);
  fs.mkdirSync(snapshotDir, { recursive: true });

  for (const table of TABLES_TO_BACKUP) {
    console.log(`📡 Scaricamento tabella ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`❌ Errore scaricamento ${table}:`, error.message);
      continue;
    }

    if (data) {
      const tablePath = path.join(snapshotDir, `${table}.json`);
      fs.writeFileSync(tablePath, JSON.stringify(data, null, 2));
      console.log(`✅ Table '${table}' salvata (${data.length} righe)`);
    }
  }

  console.log('\n📦 Automatizzazione Git...');
  try {
    execSync('git add backups/', { stdio: 'inherit' });
    execSync(`git commit -m "Database snapshot: ${comment} (${timestamp})"`, { stdio: 'inherit' });
    console.log('✅ Commit Git eseguito con successo.');
  } catch (gitError: any) {
    console.warn('⚠️ Impossibile eseguire il commit Git:', gitError.message);
  }

  console.log(`\n🎉 Snapshot completato in: ${snapshotDir}`);
}

createSnapshot();
