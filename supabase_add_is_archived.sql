-- Migrazione per aggiungere il campo is_archived alla tabella tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
