-- Esegui questo comando nel SQL Editor di Supabase
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Opzionale: Ricarica lo schema cache se l'errore persiste
-- NOTIFY pgrst, 'reload schema';
