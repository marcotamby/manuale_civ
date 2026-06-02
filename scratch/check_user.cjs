
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://laliiuqjpxanhwhxajlm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk2NDkyMSwiZXhwIjoyMDg4NTQwOTIxfQ.fkoCf369ixqfkkeaOxlsvk-HRF0cdVkOGLXdBZa2tc8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function refund() {
  const email = 'marco.tamborrino.94@gmail.com';
  
  const { data: p } = await supabase.from('profiles').select('sheep_balance').ilike('email', email).maybeSingle();
  const newBalance = p.sheep_balance + 40;
  
  await supabase.from('profiles').update({ sheep_balance: newBalance }).ilike('email', email);
  console.log(`Refund applied. New balance: ${newBalance}`);
}

refund();
