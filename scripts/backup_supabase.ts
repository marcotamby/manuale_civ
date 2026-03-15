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

async function backupDatabase() {
  console.log('🚀 Inizio backup del database Supabase...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  // Backup Civilizations
  console.log('📡 Scaricamento tabella civilizations...');
  const { data: civs, error: civsError } = await supabase.from('civilizations').select('*');
  if (civsError) {
    console.error('❌ Errore scaricamento civiltà:', civsError);
  } else {
    const civsPath = path.join(backupDir, `civilizations_backup_${timestamp}.json`);
    const civsLatestPath = path.join(backupDir, `civilizations_latest.json`);
    fs.writeFileSync(civsPath, JSON.stringify(civs, null, 2));
    fs.writeFileSync(civsLatestPath, JSON.stringify(civs, null, 2)); // Sovrascrive il latest
    console.log(`✅ Salvate ${civs.length} civiltà in ${civsPath}`);
  }

  // Backup Suggestions
  console.log('📡 Scaricamento tabella suggestions...');
  const { data: suggestions, error: suggError } = await supabase.from('suggestions').select('*');
  if (suggError) {
    console.error('❌ Errore scaricamento suggerimenti:', suggError);
  } else {
    const suggPath = path.join(backupDir, `suggestions_backup_${timestamp}.json`);
    const suggLatestPath = path.join(backupDir, `suggestions_latest.json`);
    fs.writeFileSync(suggPath, JSON.stringify(suggestions, null, 2));
    fs.writeFileSync(suggLatestPath, JSON.stringify(suggestions, null, 2)); // Sovrascrive il latest
    console.log(`✅ Salvati ${suggestions.length} suggerimenti in ${suggPath}`);
  }

  // Backup FAQ
  console.log('📡 Scaricamento tabella faq...');
  const { data: faq, error: faqError } = await supabase.from('faq').select('*');
  if (faqError) {
    console.error('❌ Errore scaricamento FAQ:', faqError);
  } else {
    const faqPath = path.join(backupDir, `faq_backup_${timestamp}.json`);
    const faqLatestPath = path.join(backupDir, `faq_latest.json`);
    fs.writeFileSync(faqPath, JSON.stringify(faq, null, 2));
    fs.writeFileSync(faqLatestPath, JSON.stringify(faq, null, 2)); // Sovrascrive il latest
    console.log(`✅ Salvate ${faq.length} FAQ in ${faqPath}`);
  }

  console.log('\n🎉 Backup completato con successo! Tutti i dati sono al sicuro sul tuo PC.');
}

backupDatabase();
