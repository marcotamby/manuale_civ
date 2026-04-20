-- Aggiunge la colonna display_name alla tabella stream_overlays
-- Eseguire questo script su Supabase > SQL Editor

ALTER TABLE stream_overlays
ADD COLUMN IF NOT EXISTS display_name TEXT;
