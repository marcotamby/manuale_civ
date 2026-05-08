import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenziali Supabase mancanti nel file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Full list of tables identified in the audit
const TABLES_TO_BACKUP = [
  'civilizations',
  'suggestions',
  'faq_settings',
  'faq_sections',
  'faq_items',
  'profiles',
  'build_orders',
  'build_order_votes',
  'betting_markets',
  'user_bets',
  'betting_notifications',
  'tournaments',
  'tournament_teams',
  'tournament_matches',
  'stream_overlays',
  'votes',
  'qa_votes',
  'units',
  'landmarks',
  'technologies',
  'matchups',
  'players',
  'teams',
  'matches',
  'brackets',
  'logs',
  'audit_log'
];

async function backupDatabase() {
  console.log('🚀 INIZIO BACKUP TOTALE DEL DATABASE SUPABASE...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rootDir = process.cwd();
  const backupDir = path.join(rootDir, 'backups');
  const latestDir = path.join(backupDir, 'latest');

  // Ensure directories exist
  [backupDir, latestDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const sessionBackupDir = path.join(backupDir, `full_backup_${timestamp}`);
  fs.mkdirSync(sessionBackupDir, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (const table of TABLES_TO_BACKUP) {
    console.log(`📡 Scaricamento tabella: ${table}...`);
    
    // Fetch with pagination for safety, though most tables are small
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + step - 1);

      if (error) {
        console.error(`❌ Errore scaricamento ${table}:`, error.message);
        failCount++;
        hasMore = false;
        continue;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }

    if (allData.length > 0 || successCount >= 0) { // Even empty tables are backed up as []
      const tableFileName = `${table}.json`;
      
      // Save to timestamped folder
      fs.writeFileSync(
        path.join(sessionBackupDir, tableFileName), 
        JSON.stringify(allData, null, 2)
      );
      
      // Save to latest folder for easy git tracking
      fs.writeFileSync(
        path.join(latestDir, tableFileName), 
        JSON.stringify(allData, null, 2)
      );
      
      console.log(`✅ Tabella '${table}' salvata (${allData.length} righe)`);
      successCount++;
    }
  }

  // Create a manifest file
  const manifest = {
    timestamp,
    tables: TABLES_TO_BACKUP,
    success: successCount,
    failed: failCount,
    totalRows: 0 // Could sum if needed
  };
  fs.writeFileSync(path.join(sessionBackupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(latestDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n=========================================`);
  console.log(`🎉 BACKUP COMPLETATO!`);
  console.log(`✅ Successi: ${successCount}`);
  console.log(`❌ Falliti: ${failCount}`);
  console.log(`📂 Salvato in: ${sessionBackupDir}`);
  console.log(`=========================================\n`);
}

backupDatabase().catch(err => {
  console.error('💥 ERRORE CRITICO DURANTE IL BACKUP:', err);
  process.exit(1);
});
