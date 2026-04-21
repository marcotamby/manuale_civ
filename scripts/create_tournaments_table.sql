-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('startgg', 'challonge')),
    organizer TEXT NOT NULL,
    direct_link TEXT,
    period TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read tournaments" ON tournaments
    FOR SELECT USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "Admin full access tournaments" ON tournaments
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('marcotamby@gmail.com', 'marco.tamborrino.94@gmail.com', 'alessio.bella97@gmail.com', 'contattodisparta@gmail.com')
    );
