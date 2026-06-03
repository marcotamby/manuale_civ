-- Migration: Add unlocked_services column to Profiles table
-- Run this script in the Supabase SQL editor to add the column for tracking redeemed services like coaching and replay reviews.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unlocked_services text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.unlocked_services IS 'Servizi e coaching sbloccati dall''utente riscattandoli con le pecore';
