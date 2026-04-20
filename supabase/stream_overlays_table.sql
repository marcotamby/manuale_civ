-- Creazione della tabella per la gestione degli overlay stream
CREATE TABLE IF NOT EXISTS stream_overlays (
    id TEXT PRIMARY KEY,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilitiamo il Realtime per questa tabella
ALTER PUBLICATION supabase_realtime ADD TABLE stream_overlays;

-- Policy di Sicurezza (RLS)
ALTER TABLE stream_overlays ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere gli overlay (per OBS e anteprime)
CREATE POLICY "Public Read Access" 
ON stream_overlays FOR SELECT 
USING (true);

-- Solo gli amministratori possono aggiornare lo stato
-- (Semplificato per usare il ruolo 'authenticated' come nelle altre tabelle admin del sito)
CREATE POLICY "Admin Update Access" 
ON stream_overlays FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Inserimento del record iniziale per l'overlay AoE4 Match
INSERT INTO stream_overlays (id, state)
VALUES ('aoe4-match', '{
  "t1": { "name": "Team A", "score": 0, "players": ["Giocatore 1", "Giocatore 2", "Giocatore 3"] },
  "t2": { "name": "Team B", "score": 0, "players": ["Giocatore 4", "Giocatore 5", "Giocatore 6"] },
  "maps": [],
  "timer": { "active": false, "min": 5, "sec": 0, "timestamp": 0 },
  "casters": [
    { "active": true, "name": "Caster 1" },
    { "active": false, "name": "Caster 2" }
  ]
}')
ON CONFLICT (id) DO NOTHING;
