-- Migration: Create service_redemptions table & secure policies
-- Run this script in the Supabase SQL editor.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.service_redemptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email text NOT NULL,
    service_id text NOT NULL,
    cost integer NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.service_redemptions ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.service_redemptions;
DROP POLICY IF EXISTS "Users can insert their own redemptions" ON public.service_redemptions;
DROP POLICY IF EXISTS "Admins and staff can read all redemptions" ON public.service_redemptions;
DROP POLICY IF EXISTS "Admins and staff can update all redemptions" ON public.service_redemptions;

-- 4. Create secure RLS policies
-- Policy A: Users can view their own redemptions
CREATE POLICY "Users can view their own redemptions" 
ON public.service_redemptions 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' IS NOT NULL 
  AND lower(auth.jwt() ->> 'email') = lower(user_email)
);

-- Policy B: Authenticated users can insert their own redemptions
CREATE POLICY "Users can insert their own redemptions" 
ON public.service_redemptions 
FOR INSERT 
WITH CHECK (
  auth.jwt() ->> 'email' IS NOT NULL 
  AND lower(auth.jwt() ->> 'email') = lower(user_email)
);

-- Policy C: Admins and staff can read all redemptions
CREATE POLICY "Admins and staff can read all redemptions" 
ON public.service_redemptions 
FOR SELECT 
USING (
  is_admin() 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = auth.jwt() ->> 'email' AND role = 'staff'
  )
);

-- Policy D: Admins and staff can update all redemptions
CREATE POLICY "Admins and staff can update all redemptions" 
ON public.service_redemptions 
FOR UPDATE 
USING (
  is_admin() 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = auth.jwt() ->> 'email' AND role = 'staff'
  )
);

-- 5. Optional: Automatic Discord Webhook Notification Trigger
-- To use this trigger, replace 'YOUR_DISCORD_WEBHOOK_URL' below and uncomment the lines.
-- 
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- 
-- CREATE OR REPLACE FUNCTION notify_shop_redemption_discord()
-- RETURNS trigger AS $$
-- DECLARE
--   payload jsonb;
--   discord_url text := 'YOUR_DISCORD_WEBHOOK_URL';
-- BEGIN
--   IF discord_url = 'YOUR_DISCORD_WEBHOOK_URL' THEN
--     RETURN NEW;
--   END IF;
--   
--   payload := jsonb_build_object(
--     'content', format('🛒 **Nuovo riscatto sul Negozio Pecore!**' || chr(10) || 
--                       '- **Utente:** %s' || chr(10) ||
--                       '- **Servizio:** %s' || chr(10) ||
--                       '- **Costo:** %s 🐑' || chr(10) ||
--                       'Accedi al CRM Admin per gestire e completare l''erogazione!',
--                       NEW.user_email,
--                       CASE WHEN NEW.service_id = 'replay_review' THEN '🎥 Analisi Replay con lo Staff'
--                            WHEN NEW.service_id = 'coaching_1h' THEN '👨‍🏫 1h di Coaching'
--                            ELSE NEW.service_id
--                       END,
--                       NEW.cost::text)
--   );
--   
--   PERFORM net.http_post(
--     url := discord_url,
--     headers := '{"Content-Type": "application/json"}'::jsonb,
--     body := payload::text
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- 
-- CREATE OR REPLACE TRIGGER trigger_notify_shop_redemption
-- AFTER INSERT ON public.service_redemptions
-- FOR EACH ROW
-- EXECUTE FUNCTION notify_shop_redemption_discord();

-- 6. Comments
COMMENT ON TABLE public.service_redemptions IS 'Storico dei riscatti dei servizi dal negozio pecore';
COMMENT ON COLUMN public.service_redemptions.status IS 'Stato del servizio: pending (in attesa), delivered (erogato)';
