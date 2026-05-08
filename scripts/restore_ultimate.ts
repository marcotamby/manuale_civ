import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Order is important due to foreign key constraints
const TABLES_ORDER = [
  'profiles',
  'civilizations',
  'tournaments',
  'tournament_teams',
  'tournament_matches',
  'betting_markets',
  'user_bets',
  'betting_notifications',
  'suggestions',
  'faq_settings',
  'faq_sections',
  'faq_items',
  'build_orders',
  'build_order_votes',
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

async function restoreTable(tableName: string, data: any[]) {
  console.log(`📡 Ripristino tabella '${tableName}' (${data.length} righe)...`);
  
  if (data.length === 0) {
      console.log(`⚠️ Nessun dato per ${tableName}, salto.`);
      return;
  }

  // First, try to clear existing data (Careful with dependencies!)
  // In a real scenario, we might need to delete in reverse order.
  // But for now, let's use upsert if the table has a primary key.
  
  // Split into chunks of 100 for safety
  const chunkSize = 100;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk);
    
    if (error) {
      console.error(`❌ Errore durante il ripristino di ${tableName} (chunk ${i/chunkSize}):`, error.message);
      // If upsert fails because of missing columns or constraints, we log it but continue
    }
  }
}

async function runRestore(backupPath: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 AVVIO RIPRISTINO TOTALE DATABASE');
  console.log(`📂 Sorgente: ${backupPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Percorso backup non trovato!');
    return;
  }

  for (const table of TABLES_ORDER) {
    const filePath = path.join(backupPath, `${table}.json`);
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      await restoreTable(table, data);
    } else {
      console.log(`ℹ️ File per '${table}' non trovato, salto.`);
    }
  }

  console.log('\n✅ RIPRISTINO COMPLETATO!');
}

const arg = process.argv[2] || 'backups/latest';
const absolutePath = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
runRestore(absolutePath).catch(console.error);
