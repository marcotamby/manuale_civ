-- ============================================================
-- Migration: Discord Tournament Registrations & Live Brackets
-- ============================================================

-- 1. Aggiornamento Tabella Tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 8;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Programmato'; -- 'Programmato', 'In corso', 'Concluso'
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS discord_channel_id TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS discord_message_id TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS auto_bracket BOOLEAN DEFAULT TRUE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS map TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS event_time TEXT;

-- 2. Tabella Partecipanti Torneo (Iscritti da Discord)
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tournament_user UNIQUE(tournament_id, discord_user_id)
);

ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS seed INTEGER DEFAULT 1;

-- 3. Tabella Match / Tabellone (Bracket)
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
  next_match_id UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  next_match_slot INTEGER DEFAULT 1, -- 1 per player1, 2 per player2
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indici per performance
CREATE INDEX IF NOT EXISTS idx_tp_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tm_tournament ON tournament_matches(tournament_id);

-- 5. Abilitazione Row Level Security (RLS)
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Policy per consentire lettura pubblica
CREATE POLICY "Public Read Participants" ON tournament_participants FOR SELECT USING (true);
CREATE POLICY "Public Read Matches" ON tournament_matches FOR SELECT USING (true);

-- Policy per consentire inserimento/modifica ad utenti autenticati / service role
CREATE POLICY "Admin Insert/Update Participants" ON tournament_participants FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin Insert/Update Matches" ON tournament_matches FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 6. Aggiunta alla pubblicazione Realtime di Supabase (se abilitato)
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_participants;
