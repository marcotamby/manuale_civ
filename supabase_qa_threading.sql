-- Migration to support threaded Q&A
ALTER TABLE answers ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES answers(id) ON DELETE CASCADE;
