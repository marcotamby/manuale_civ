-- Migration: Sheep Shop System & Profile Customization Columns
-- Run this script in the Supabase SQL editor to create the necessary columns.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS selected_title text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unlocked_titles text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS selected_avatar_effect text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unlocked_avatar_effects text[] DEFAULT '{}'::text[];

-- Enable RLS updates (already configured but ensuring columns are public read/write by owners and admins)
COMMENT ON COLUMN public.profiles.selected_title IS 'Titolo equipaggiato dall''utente';
COMMENT ON COLUMN public.profiles.unlocked_titles IS 'Titoli sbloccati dall''utente riscattandoli con le pecore';
COMMENT ON COLUMN public.profiles.selected_avatar_effect IS 'Effetto bordo avatar equipaggiato';
COMMENT ON COLUMN public.profiles.unlocked_avatar_effects IS 'Effetti bordo avatar sbloccati';
