import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FALLBACK_URL = 'https://laliiuqjpxanhwhxajlm.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ5MjEsImV4cCI6MjA4ODU0MDkyMX0.1xIE1MXy1JxgGzpP0Hitotz8o3aMwASV8NUr06bQjkA';

const rawUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\s/g, '');
const rawServiceKey = (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').replace(/\s/g, '');
const rawAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').replace(/\s/g, '');

// Build candidate clients in priority order:
// 1. Env URL + Service Role Key (if present)
// 2. Env URL + Env Anon Key (if present)
// 3. Guaranteed working project URL + project Anon Key
const clients = [
  ...(rawUrl.startsWith('https://') && rawServiceKey ? [createClient(rawUrl, rawServiceKey)] : []),
  ...(rawUrl.startsWith('https://') && rawAnonKey ? [createClient(rawUrl, rawAnonKey)] : []),
  ...(rawServiceKey ? [createClient(FALLBACK_URL, rawServiceKey)] : []),
  createClient(FALLBACK_URL, FALLBACK_ANON_KEY)
];

// Active tables in Supabase
const TABLES_TO_BACKUP = [
  'civilizations',
  'global_units',
  'suggestions',
  'questions',
  'announcements',
  'faq_settings',
  'faq_sections',
  'faq_items',
  'profiles',
  'build_order_votes',
  'betting_markets',
  'user_bets',
  'betting_notifications',
  'tournaments',
  'tournament_matches',
  'stream_overlays',
  'draft_presets',
  'draft_rooms',
  'qa_votes',
  'audit_log',
  'coach_ai_logs'
];

async function fetchTableRows(table: string) {
  let lastError: any = null;

  for (const client of clients) {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;
    let hadError = false;

    while (hasMore) {
      try {
        const { data, error } = await client
          .from(table)
          .select('*')
          .range(from, from + step - 1);

        if (error) {
          lastError = error;
          hadError = true;
          hasMore = false;
          break;
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
      } catch (err) {
        lastError = err;
        hadError = true;
        hasMore = false;
        break;
      }
    }

    if (!hadError) {
      return { data: allData, error: null };
    }
  }

  return {
    data: null,
    error: new Error(lastError?.message || String(lastError || `Impossibile scaricare la tabella ${table}`))
  };
}

async function backupDatabase() {
  console.log('🚀 INIZIO BACKUP TOTALE DEL DATABASE SUPABASE...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rootDir = process.cwd();
  const backupDir = path.join(rootDir, 'backups');
  const latestDir = path.join(backupDir, 'latest');

  [backupDir, latestDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const sessionBackupDir = path.join(backupDir, `full_backup_${timestamp}`);
  fs.mkdirSync(sessionBackupDir, { recursive: true });

  let successCount = 0;
  let failCount = 0;
  let totalRows = 0;

  for (const table of TABLES_TO_BACKUP) {
    console.log(`📡 Scaricamento tabella: ${table}...`);
    const { data: allData, error } = await fetchTableRows(table);

    if (error || !allData) {
      console.error(`❌ Errore scaricamento ${table}:`, error?.message);
      failCount++;
      continue;
    }

    const tableFileName = `${table}.json`;
    fs.writeFileSync(
      path.join(sessionBackupDir, tableFileName),
      JSON.stringify(allData, null, 2)
    );
    fs.writeFileSync(
      path.join(latestDir, tableFileName),
      JSON.stringify(allData, null, 2)
    );

    totalRows += allData.length;
    console.log(`✅ Tabella '${table}' salvata (${allData.length} righe)`);
    successCount++;
  }

  const manifest = {
    timestamp,
    tables: TABLES_TO_BACKUP,
    success: successCount,
    failed: failCount,
    totalRows
  };
  fs.writeFileSync(path.join(sessionBackupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(latestDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n=========================================`);
  console.log(`🎉 BACKUP COMPLETATO!`);
  console.log(`✅ Successi: ${successCount}`);
  console.log(`❌ Falliti: ${failCount}`);
  console.log(`📊 Righe totali salvate: ${totalRows}`);
  console.log(`📂 Salvato in: ${sessionBackupDir}`);
  console.log(`=========================================\n`);

  if (successCount === 0) {
    process.exit(1);
  }
}

backupDatabase().catch(err => {
  console.error('💥 ERRORE CRITICO DURANTE IL BACKUP:', err);
  process.exit(1);
});
