-- Migration: Create audit_log table and setup security policies
-- Path: supabase/migrations/20260602_create_audit_log.sql

-- 1. Create table public.audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_email TEXT NOT NULL,
    user_nickname TEXT,
    action TEXT NOT NULL,         -- e.g., 'SHEEP_REFILL', 'SAVE_TOURNAMENT', 'APPROVE_SUGGESTION', etc.
    target_type TEXT,            -- e.g., 'suggestions', 'tournaments', 'profiles', 'civilizations'
    target_id TEXT,              -- UUID or slug of the target entity
    description TEXT NOT NULL,    -- Human readable summary of the action
    details JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Security Policies for Select (Read) and Insert (Write)
-- Restricts access strictly to SuperAdmins, Owners, and Admins.
DROP POLICY IF EXISTS "Admins can select logs" ON public.audit_log;
CREATE POLICY "Admins can select logs" ON public.audit_log 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'owner', 'superadmin'))
  OR (auth.jwt() ->> 'email' = 'marco.tamborrino.94@gmail.com')
);

DROP POLICY IF EXISTS "Admins can insert logs" ON public.audit_log;
CREATE POLICY "Admins can insert logs" ON public.audit_log 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'owner', 'superadmin'))
  OR (auth.jwt() ->> 'email' = 'marco.tamborrino.94@gmail.com')
);

-- 4. Enable Realtime if needed (optional, but useful if they want to monitor logs in real-time)
-- ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
