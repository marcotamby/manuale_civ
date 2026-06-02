
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://laliiuqjpxanhwhxajlm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk2NDkyMSwiZXhwIjoyMDg4NTQwOTIxfQ.fkoCf369ixqfkkeaOxlsvk-HRF0cdVkOGLXdBZa2tc8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const email = 'marco.tamborrino.94@gmail.com';
  
  console.log(`Checking profile for ${email}...`);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
  } else {
    console.log('Profile:', profile);
  }

  console.log(`Checking recent bets for ${email}...`);
  const { data: bets, error: betsError } = await supabase
    .from('user_bets')
    .select('*, betting_markets(title)')
    .ilike('user_email', email)
    .order('created_at', { ascending: false })
    .limit(10);

  if (betsError) {
    console.error('Error fetching bets:', betsError);
  } else {
    console.log('Recent Bets:', bets.map(b => ({
      market: b.betting_markets?.title,
      amount: b.amount,
      status: b.status,
      created_at: b.created_at
    })));
  }
}

checkUser();
