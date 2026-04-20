
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://laliiuqjpxanhwhxajlm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ5MjEsImV4cCI6MjA4ODU0MDkyMX0.1xIE1MXy1JxgGzpP0Hitotz8o3aMwASV8NUr06bQjkA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixFlag() {
  console.log('Aggiorno la bandiera per jeannedarc...');
  
  const { data, error } = await supabase
    .from('civilizations')
    .update({ flag: '/civs/jeannedarc.webp' })
    .eq('id', 'jeannedarc');

  if (error) {
    console.error('Errore durante l\'aggiornamento:', error);
  } else {
    console.log('Bandiera aggiornata con successo nel database!');
  }
}

fixFlag();
