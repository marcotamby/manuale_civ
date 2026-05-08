import { execSync } from 'child_process';
import path from 'path';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌟 AVVIO PROCESSO DI BACKUP TOTALE (DB + STORAGE)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('\n[1/2] Avvio backup Database...');
    execSync('npx tsx scripts/backup_ultimate.ts', { stdio: 'inherit' });
    
    console.log('\n[2/2] Avvio backup Storage...');
    execSync('npx tsx scripts/backup_storage_ultimate.ts', { stdio: 'inherit' });

    console.log('\n✅ PROCESSO DI BACKUP COMPLETATO CON SUCCESSO!');
  } catch (error) {
    console.error('\n❌ ERRORE DURANTE IL PROCESSO DI BACKUP.');
    process.exit(1);
  }
}

main();
