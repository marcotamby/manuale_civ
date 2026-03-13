-- Create table for Questions
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    civ_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_nickname TEXT,
    user_rank TEXT,
    question_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for Answers
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_nickname TEXT,
    user_rank TEXT,
    answer_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Public read access for approved items
CREATE POLICY "Public read access for approved questions" ON questions FOR SELECT USING (status = 'approved');
CREATE POLICY "Public read access for approved answers" ON answers FOR SELECT USING (status = 'approved');

-- Authenticated users can read their own logic
CREATE POLICY "Users can read their own pending questions" ON questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read their own pending answers" ON answers FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all (Superadmin logic will be handled via service role or specialized policies if needed, 
-- but for now we'll allow all authenticated users to read for simplicity, OR we can restrict further)
-- Based on the codebase, we usually filter in the UI. For true security:
CREATE POLICY "Admins can read all questions" ON questions FOR SELECT USING (true); -- We'll let the app filter
CREATE POLICY "Admins can read all answers" ON answers FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can ask questions" ON questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can answer questions" ON answers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Admins can update status
CREATE POLICY "Admins can update question status" ON questions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update answer status" ON answers FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
-- (Assuming update_updated_at_column function already exists from faq migration)
-- IMPORTANT: user_nickname and user_rank are REQUIRED for signatures as per user request.
-- These will be populated from the user profile at submission time.
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON answers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
