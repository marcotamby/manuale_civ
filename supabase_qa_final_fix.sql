-- Consolidation and Fix for Q&A Threading and User Identifiers

-- 1. Correct user_id type to TEXT (since we use emails)
ALTER TABLE questions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE answers ALTER COLUMN user_id TYPE TEXT;

-- 2. Remove outdated foreign key constraints if they exist
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_user_id_fkey') THEN
        ALTER TABLE questions DROP CONSTRAINT questions_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_user_id_fkey') THEN
        ALTER TABLE answers DROP CONSTRAINT answers_user_id_fkey;
    END IF;
END $$;

-- 3. Add parent_id column to answers for threading support
ALTER TABLE answers ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES answers(id) ON DELETE CASCADE;

-- 4. Update status check to include 'rejected' if needed (already in migration but just in case)
-- (Optionally) ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_status_check;
-- ALTER TABLE answers ADD CONSTRAINT answers_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- 5. Final verification of policies
-- Ensure RLS allows insert for anon users (based on current app logic)
DROP POLICY IF EXISTS "Anyone can ask questions" ON questions;
DROP POLICY IF EXISTS "Anyone can answer questions" ON answers;
CREATE POLICY "Anyone can ask questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can answer questions" ON answers FOR INSERT WITH CHECK (true);
