-- Creazione tabella per registrare i log delle interazioni di Coach Beasty AI
CREATE TABLE IF NOT EXISTS coach_ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_nickname TEXT,
    prompt TEXT NOT NULL,
    reply TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita Row Level Security (RLS)
ALTER TABLE coach_ai_logs ENABLE ROW LEVEL SECURITY;

-- Permetti l'inserimento dall'API serverless
CREATE POLICY "Allow serverless insert on coach_ai_logs" ON coach_ai_logs FOR INSERT WITH CHECK (true);

-- Permetti la lettura per il backend / admin
CREATE POLICY "Allow read access on coach_ai_logs" ON coach_ai_logs FOR SELECT USING (true);
