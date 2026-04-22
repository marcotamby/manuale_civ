-- Add missing columns to stream_overlays table
ALTER TABLE stream_overlays 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

ALTER TABLE stream_overlays 
ADD COLUMN IF NOT EXISTS description TEXT;
