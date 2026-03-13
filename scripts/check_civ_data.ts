import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function checkData() {
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, name, build_orders, videos')

  if (error) {
    console.error('Error fetching civilizations:', error)
    return
  }

  console.log('--- Civs with Content in DB ---')
  data.forEach(civ => {
    const boCount = civ.build_orders?.length || 0
    const videoCount = civ.videos?.length || 0
    if (boCount > 0 || videoCount > 0) {
      console.log(`${civ.name} (${civ.id}): BOs=${boCount}, Videos=${videoCount}`)
      if (boCount > 0) {
        console.log(`  BOs: ${civ.build_orders.map((b: any) => b.title).join(', ')}`)
      }
    }
  })
}

checkData()
