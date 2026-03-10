import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  // 1. Fetch suggestions that need notification
  const { data: suggestions, error: fetchError } = await supabase
    .from('suggestions')
    .select('*')
    .neq('status', 'pending')
    .eq('notified', false)

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
  }

  if (!suggestions || suggestions.length === 0) {
    return new Response(JSON.stringify({ message: 'No pending notifications' }), { status: 200 })
  }

  // 2. Group by email
  const groups: Record<string, any[]> = {}
  suggestions.forEach(s => {
    if (s.user_email) {
      if (!groups[s.user_email]) groups[s.user_email] = []
      groups[s.user_email].push(s)
    }
  })

  const results = []

  // 3. Send email for each group
  for (const [email, userSuggestions] of Object.entries(groups)) {
    const approved = userSuggestions.filter(s => s.status === 'implemented')
    const rejected = userSuggestions.filter(s => s.status === 'rejected')

    let html = `<h1>Aggiornamento sulle tue proposte - Manuale Civ</h1>`
    html += `<p>Ciao,</p><p>Abbiamo revisionato i tuoi recenti contributi. Ecco il riepilogo:</p>`

    if (approved.length > 0) {
      html += `<h3>✅ Proposte Approvate:</h3><ul>`
      approved.forEach(s => {
        html += `<li><strong>${s.civ_name}</strong> (${s.section}): <em>"${s.suggestion_text.substring(0, 50)}..."</em></li>`
      })
      html += `</ul>`
    }

    if (rejected.length > 0) {
      html += `<h3>❌ Proposte non accettate:</h3><ul>`
      rejected.forEach(s => {
        html += `<li><strong>${s.civ_name}</strong>: <em>"${s.suggestion_text.substring(0, 50)}..."</em><br/>
                <small style="color: #666">Motivo: ${s.rejection_reason || 'Nessun motivo specificato'}</small></li>`
      })
      html += `</ul>`
    }

    html += `<p>Puoi vedere i cambiamenti direttamente sul sito <a href="https://manualeciv.vercel.app">Manuale Civ</a>.</p>`
    html += `<p>Grazie per il tuo supporto!</p>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Manuale Civ <noreply@resend.dev>',
        to: [email],
        subject: `Riepilogo aggiornamenti proposte - Manuale Civ`,
        html,
      })
    })
    
    results.push({ email, success: res.ok })
  }

  // 4. Mark as notified
  const idsToUpdate = suggestions.map(s => s.id)
  await supabase
    .from('suggestions')
    .update({ notified: true })
    .in('id', idsToUpdate)

  return new Response(JSON.stringify({ results }), { status: 200 })
})
