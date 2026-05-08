import { execSync } from 'child_process';
import path from 'path';

async function runAll() {
  const root = process.cwd();
  const timestamp = new Date().toLocaleString();
  console.log(`\n=========================================`);
  console.log(`🌑 BACKUP NOTTURNO - ${timestamp}`);
  console.log(`=========================================`);

  try {
    console.log('\n--- [1/2] DATABASE (TESTI & STRUTTURA) ---');
    execSync('npx ts-node scripts/backup_ultimate.ts', { stdio: 'inherit', cwd: root });

    console.log('\n--- [2/2] STORAGE (IMMAGINI & COPERTINE) ---');
    execSync('npx ts-node scripts/backup_storage_ultimate.ts', { stdio: 'inherit', cwd: root });

    console.log('\n✨ OPERAZIONE COMPLETATA CON SUCCESSO!');
    console.log(`=========================================\n`);
  } catch (error) {
    console.error('\n💥 ERRORE CRITICO DURANTE IL BACKUP:', error);
    process.exit(1);
  }
}

runAll();
