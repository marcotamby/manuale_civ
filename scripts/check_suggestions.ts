import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function checkSuggestions() {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching suggestions:', error)
    return
  }

  console.log('--- Recent Suggestions ---')
  data.forEach(s => {
    console.log(`ID: ${s.id} | Civ: ${s.civ_name} | Status: ${s.status} | Text: ${s.suggestion_text.slice(0, 50)}...`)
  })
}

checkSuggestions()
