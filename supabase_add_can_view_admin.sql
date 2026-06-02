-- 1. Add can_view_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_view_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Update is_admin() function to grant admin privileges to users who have can_view_admin set to true
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE email = auth.jwt() ->> 'email' 
      AND (role IN ('admin', 'owner', 'superadmin') OR can_view_admin = true)
    )
    OR (auth.jwt() ->> 'email' = 'marco.tamborrino.94@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
