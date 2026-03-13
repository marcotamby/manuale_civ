-- Permessi per eliminare domande e risposte (Admin)
DROP POLICY IF EXISTS "Admins can delete questions" ON questions;
DROP POLICY IF EXISTS "Admins can delete answers" ON answers;

CREATE POLICY "Allow anyone to delete questions" ON questions FOR DELETE USING (true);
CREATE POLICY "Allow anyone to delete answers" ON answers FOR DELETE USING (true);
