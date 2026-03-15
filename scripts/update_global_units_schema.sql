-- Add missing columns to global_units table
ALTER TABLE global_units 
ADD COLUMN IF NOT EXISTS image_id TEXT,
ADD COLUMN IF NOT EXISTS excluded_civs TEXT[] DEFAULT '{}';
