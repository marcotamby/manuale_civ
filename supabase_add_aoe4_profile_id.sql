-- Add aoe4_profile_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aoe4_profile_id TEXT;
