-- Add unique constraint to slug column to allow upsert
ALTER TABLE tournaments ADD CONSTRAINT tournaments_slug_key UNIQUE (slug);
