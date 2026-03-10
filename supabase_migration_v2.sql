-- Migration to add user_rank to suggestions table
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_rank TEXT;

-- Update existing notified logic if needed
COMMENT ON COLUMN suggestions.notified IS 'Flag to track if user has been notified of status change';
