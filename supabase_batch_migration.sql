-- Migration to add notified column to suggestions table
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE;

-- Set existing suggestions to notified = TRUE so we don't send emails for old data
UPDATE suggestions SET notified = TRUE WHERE status != 'pending';
