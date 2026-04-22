-- Migration to add regulation fields to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS has_regolamento BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS regolamento_content TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
