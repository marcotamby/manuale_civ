import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const FALLBACK_URL = 'https://laliiuqjpxanhwhxajlm.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ5MjEsImV4cCI6MjA4ODU0MDkyMX0.1xIE1MXy1JxgGzpP0Hitotz8o3aMwASV8NUr06bQjkA';

const rawUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\s/g, '');
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl : FALLBACK_URL;

const rawServiceKey = (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').replace(/\s/g, '');
const rawAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').replace(/\s/g, '');
const supabaseKey = rawServiceKey || rawAnonKey || FALLBACK_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadFolder(bucketName: string, folderPath: string, localBaseDir: string) {
  console.log(`📡 Esplorazione bucket '${bucketName}', cartella '${folderPath}'...`);
  
  const { data: items, error } = await supabase.storage.from(bucketName).list(folderPath);
  
  if (error) {
    console.error(`❌ Errore durante il listing di '${folderPath}':`, error.message);
    return;
  }

  if (!items) return;

  for (const item of items) {
    const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
    
    // Supabase JS client: items with no id or specific metadata are usually folders
    if (!item.id && !item.metadata) {
      console.log(`📂 Trovata sottocartella: ${fullPath}`);
      await downloadFolder(bucketName, fullPath, localBaseDir);
      continue;
    }

    // It's a file
    console.log(`📥 Scaricamento file: ${fullPath}...`);
    const { data, error: downloadError } = await supabase.storage.from(bucketName).download(fullPath);
    
    if (downloadError) {
      console.warn(`⚠️ Possibile cartella o errore download ${fullPath}. Riprovo come cartella...`);
      await downloadFolder(bucketName, fullPath, localBaseDir);
      continue;
    }

    if (data) {
      const localFilePath = path.join(localBaseDir, fullPath);
      const localFileDir = path.dirname(localFilePath);
      
      if (!fs.existsSync(localFileDir)) {
        fs.mkdirSync(localFileDir, { recursive: true });
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(localFilePath, buffer);
      console.log(`✅ File salvato: ${localFilePath}`);
    }
  }
}

async function backupStorage() {
  console.log('🚀 INIZIO BACKUP STORAGE SUPABASE...');
  const rootDir = process.cwd();
  const backupDir = path.join(rootDir, 'backups', 'storage');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const BUCKETS = ['civilizations', 'tournaments'];
  
  for (const bucket of BUCKETS) {
      try {
          await downloadFolder(bucket, '', backupDir);
      } catch (e) {
          console.warn(`⚠️ Impossibile accedere al bucket ${bucket}`);
      }
  }

  console.log('🎉 Backup Storage completato!');
}

backupStorage().catch(err => {
  console.error('💥 Errore critico backup storage:', err);
});
