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

async function restoreCivilizations(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File non trovato: ${filePath}`);
    process.exit(1);
  }

  console.log(`📂 Caricamento dati da: ${filePath}...`);
  const rawData = fs.readFileSync(filePath, 'utf8');
  const civilizations = JSON.parse(rawData);

  if (!Array.isArray(civilizations)) {
    console.error('❌ Il file di backup non sembra contenere un array di oggetti.');
    process.exit(1);
  }

  console.log(`📡 Ripristino di ${civilizations.length} civiltà su Supabase...`);

  for (const civ of civilizations) {
    console.log(`📡 Aggiornamento ${civ.id}...`);
    // Usiamo update invece di upsert per evitare di dover passare tutti i campi obbligatori come 'name'
    const { error } = await supabase
      .from('civilizations')
      .update(civ)
      .eq('id', civ.id);

    if (error) {
      console.error(`❌ Errore durante il ripristino di ${civ.id}: ${error.message}`);
    } else {
      console.log(`✅ ${civ.id} ripristinata.`);
    }
  }

  console.log('✅ Operazione di ripristino completata!');
}

const arg = process.argv[2];
if (!arg) {
  console.log('Utilizzo: npx tsx scripts/restore_civilizations.ts <percorso_file_json>');
  process.exit(1);
}

const absolutePath = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
restoreCivilizations(absolutePath).catch(console.error);
