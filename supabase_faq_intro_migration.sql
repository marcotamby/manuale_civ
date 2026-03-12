-- Create table for FAQ settings (Intro)
CREATE TABLE IF NOT EXISTS faq_settings (
    id TEXT PRIMARY KEY, -- e.g. 'intro'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE faq_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for faq_settings" ON faq_settings FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Admin write access for faq_settings" ON faq_settings FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE TRIGGER update_faq_settings_updated_at BEFORE UPDATE ON faq_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert initial content
INSERT INTO faq_settings (id, title, content) 
VALUES ('intro', 'Cos''è il Manuale delle Civiltà?', 'Questo portale è nato per offrire alla community italiana di Age of Empires IV uno strumento completo, rapido e intuitivo per consultare ogni dettaglio del gioco. Che tu sia un giocatore alle prime armi o un veterano in cerca di micro-ottimizzazioni, qui troverai tutto ciò che serve per dominare la scala competitiva.')
ON CONFLICT (id) DO NOTHING;
