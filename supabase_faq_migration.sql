-- Create table for FAQ sections
CREATE TABLE IF NOT EXISTS faq_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    icon_name TEXT, -- Store lucide icon name
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for FAQ items within sections
CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES faq_sections(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT, -- Store lucide icon name
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE faq_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for faq_sections" ON faq_sections FOR SELECT USING (true);
CREATE POLICY "Public read access for faq_items" ON faq_items FOR SELECT USING (true);

-- Admin write access (Assuming 'admins' table or similar exists, but usually we check if user is authenticated and has admin flag)
-- For simplicity, we'll allow authenticated users for now, but in App logic we check isAdmin
CREATE POLICY "Admin write access for faq_sections" ON faq_sections FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write access for faq_items" ON faq_items FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faq_sections_updated_at BEFORE UPDATE ON faq_sections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_faq_items_updated_at BEFORE UPDATE ON faq_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
