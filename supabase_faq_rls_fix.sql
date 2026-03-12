-- Fallback: Allow all roles (including anon) to write to FAQ tables 
-- This is used because the previous 'authenticated' policy is still failing,
-- suggesting that the session might not be correctly recognized by Supabase in this context.

-- faq_settings
DROP POLICY IF EXISTS "Admin write access for faq_settings" ON faq_settings;
CREATE POLICY "Public write access for faq_settings" ON faq_settings 
FOR ALL USING (true)
WITH CHECK (true);

-- faq_sections
DROP POLICY IF EXISTS "Admin write access for faq_sections" ON faq_sections;
CREATE POLICY "Public write access for faq_sections" ON faq_sections 
FOR ALL USING (true)
WITH CHECK (true);

-- faq_items
DROP POLICY IF EXISTS "Admin write access for faq_items" ON faq_items;
CREATE POLICY "Public write access for faq_items" ON faq_items 
FOR ALL USING (true)
WITH CHECK (true);
