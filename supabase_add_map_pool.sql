-- Migration to add map_pool JSONB column to draft_presets table if not already present
ALTER TABLE public.draft_presets 
ADD COLUMN IF NOT EXISTS map_pool JSONB DEFAULT '[]'::jsonb;
