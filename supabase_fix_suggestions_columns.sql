-- Migration to add missing columns for build order signatures
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_nickname TEXT;
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_rank TEXT;

-- Verify columns (optional, for manual check in Supabase console)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'suggestions';
