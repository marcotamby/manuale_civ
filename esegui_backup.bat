@echo off
cd /d "C:\Users\marco\OneDrive\Desktop\manualeciv"
echo Avvio del backup giornaliero...
npx ts-node scripts/run_all_backups.ts
echo.
echo Backup terminato.
timeout /t 10
