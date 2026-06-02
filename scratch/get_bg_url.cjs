const { createClient } = require('@supabase/supabase-js');

const SUB_URL = "https://laliiuqjpxanhwhxajlm.supabase.co";
const SUB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ5MjEsImV4cCI6MjA4ODU0MDkyMX0.1xIE1MXy1JxgGzpP0Hitotz8o3aMwASV8NUr06bQjkA";

const client = createClient(SUB_URL, SUB_KEY);

async function run() {
  const { data, error } = await client
    .from('stream_overlays')
    .select('background_url')
    .eq('id', 'draft-matching')
    .single();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("BACKGROUND_URL_IS:", data.background_url);
  }
}

run();
