-- Migration to add vods JSONB column to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS vods JSONB DEFAULT '[]'::jsonb;
