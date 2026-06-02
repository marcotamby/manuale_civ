process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const url = 'https://laliiuqjpxanhwhxajlm.supabase.co/rest/v1/tournaments?select=id,slug,name,source,direct_link';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ5MjEsImV4cCI6MjA4ODU0MDkyMX0.1xIE1MXy1JxgGzpP0Hitotz8o3aMwASV8NUr06bQjkA';

fetch(url, {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
})
.then(res => res.json())
.then(data => {
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
