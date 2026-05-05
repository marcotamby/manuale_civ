const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://laliiuqjpxanhwhxajlm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ5MjEsImV4cCI6MjA4ODU0MDkyMX0.1xIE1MXy1JxgGzpP0Hitotz8o3aMwASV8NUr06bQjkA'); 

async function check() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) console.error(error);
    else if (data && data[0]) {
        console.log('FULL PROFILE DATA:', data[0]);
    } else {
        console.log('No profile found to inspect');
    }
}
check();
