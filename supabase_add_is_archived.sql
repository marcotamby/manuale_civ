-- Migrazione per aggiungere il campo is_archived alla tabella tournaments e draft_rooms
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.draft_rooms ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

