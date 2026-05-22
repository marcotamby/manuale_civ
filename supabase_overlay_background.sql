-- Aggiunge la colonna background_url alla tabella stream_overlays
-- Eseguire questo script su Supabase > SQL Editor

ALTER TABLE stream_overlays
ADD COLUMN IF NOT EXISTS background_url TEXT;
