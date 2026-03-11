-- Add image_id column to global_units table
ALTER TABLE global_units ADD COLUMN IF NOT EXISTS image_id TEXT;
