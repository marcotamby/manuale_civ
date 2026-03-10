-- Migration to add rejection_reason to suggestions table
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Note: Ensure that the 'suggestions' table has a 'user_email' column for notifications.
-- If not, you might need to add it, but based on the code it seems to exist.
