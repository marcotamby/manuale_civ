-- Add button columns to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS btn_label TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS btn_url TEXT;
