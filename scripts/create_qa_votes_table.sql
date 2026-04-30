-- Create table for Question and Answer votes
CREATE TABLE IF NOT EXISTS qa_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('question', 'answer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_email, item_id)
);

-- Enable RLS
ALTER TABLE qa_votes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view QA votes" ON qa_votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote on QA" ON qa_votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove their own QA votes" ON qa_votes
    FOR DELETE USING (user_email = auth.jwt() ->> 'email');
