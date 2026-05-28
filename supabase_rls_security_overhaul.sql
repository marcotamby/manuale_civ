BEGIN;

-- 1. Create helper functions for granular permission checks

-- General Admin Check
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM profiles WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'owner', 'superadmin'))
    OR (auth.jwt() ->> 'email' = 'marco.tamborrino.94@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Civs and Units Manager Check
CREATE OR REPLACE FUNCTION can_manage_civs() 
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM profiles WHERE email = auth.jwt() ->> 'email' AND (can_manage_civs = true OR role IN ('admin', 'owner', 'superadmin')))
    OR (auth.jwt() ->> 'email' = 'marco.tamborrino.94@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tournaments Manager Check
CREATE OR REPLACE FUNCTION can_manage_tournaments() 
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM profiles WHERE email = auth.jwt() ->> 'email' AND (can_manage_tournaments = true OR role IN ('admin', 'owner', 'superadmin')))
    OR (auth.jwt() ->> 'email' = 'marco.tamborrino.94@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Apply Secure Policies to tables

-- FAQ tables (settings, sections, items)
DROP POLICY IF EXISTS "Public write faq_settings" ON faq_settings;
DROP POLICY IF EXISTS "Public write access for faq_settings" ON faq_settings;
CREATE POLICY "Admin write access for faq_settings" ON faq_settings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public write faq_sections" ON faq_sections;
DROP POLICY IF EXISTS "Public write access for faq_sections" ON faq_sections;
CREATE POLICY "Admin write access for faq_sections" ON faq_sections FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public write faq_items" ON faq_items;
DROP POLICY IF EXISTS "Public write access for faq_items" ON faq_items;
CREATE POLICY "Admin write access for faq_items" ON faq_items FOR ALL USING (is_admin());

-- Civilizations & Global Units
DROP POLICY IF EXISTS "Admins can manage civilizations" ON civilizations;
CREATE POLICY "Admins can manage civilizations" ON civilizations FOR ALL USING (can_manage_civs());

DROP POLICY IF EXISTS "Admins can manage global_units" ON global_units;
CREATE POLICY "Admins can manage global_units" ON global_units FOR ALL USING (can_manage_civs());

-- Tournaments
DROP POLICY IF EXISTS "Admin full access tournaments" ON tournaments;
CREATE POLICY "Admin full access tournaments" ON tournaments FOR ALL USING (can_manage_tournaments());

-- User Profiles (Prevent others from updating user balance, role, etc. except the admin or the user themselves)
DROP POLICY IF EXISTS "Allow anyone to update profiles" ON profiles;
CREATE POLICY "Users and admins can update profiles" ON profiles FOR UPDATE 
USING (
  (auth.jwt() ->> 'email' = email) OR is_admin()
);

-- Suggestions (Only admins can read/update suggestions, anyone can submit/insert)
DROP POLICY IF EXISTS "Admin read suggestions" ON suggestions;
CREATE POLICY "Admin read/write suggestions" ON suggestions FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage suggestions" ON suggestions;
CREATE POLICY "Admins can manage suggestions" ON suggestions FOR ALL USING (is_admin());

COMMIT;
