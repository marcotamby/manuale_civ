-- 🔑 Admin Permissions Restore 🔑
-- Questo script aggiunge le policy necessarie affinché gli admin possano 
-- continuare a gestire i contenuti (Editor, Suggerimenti, FAQ, Q&A).

BEGIN;

-- 1. Civilizzazioni e Unità (Accesso completo per utenti autenticati/admin)
DROP POLICY IF EXISTS "Admins can manage civilizations" ON civilizations;
CREATE POLICY "Admins can manage civilizations" ON civilizations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage global_units" ON global_units;
CREATE POLICY "Admins can manage global_units" ON global_units FOR ALL USING (auth.role() = 'authenticated');

-- 2. Suggerimenti (Gli admin devono poter leggere tutto e aggiornare lo stato)
DROP POLICY IF EXISTS "Admins can manage suggestions" ON suggestions;
CREATE POLICY "Admins can manage suggestions" ON suggestions FOR ALL USING (auth.role() = 'authenticated');

-- 3. Q&A (Gli admin devono poter approvare/rifiutare/eliminare)
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
CREATE POLICY "Admins can manage questions" ON questions FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage answers" ON answers;
CREATE POLICY "Admins can manage answers" ON answers FOR ALL USING (auth.role() = 'authenticated');

-- 4. Favoriti (Mancava l'attivazione RLS in precedenza)
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON user_favorites;
CREATE POLICY "Users can manage their own favorites" ON user_favorites 
FOR ALL USING (true) WITH CHECK (true); -- Per ora permettiamo l'uso libero basato su email come da logica app

COMMIT;
