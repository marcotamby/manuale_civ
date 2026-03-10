import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS, status: 204 })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  console.log('Function invoked. Starting batch notification process...')

  try {
    // 1. Fetch suggestions that need notification
    console.log('Fetching pending suggestions...')
    const { data: suggestions, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .neq('status', 'pending')
      .eq('notified', false)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), { 
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${suggestions?.length || 0} suggestions to notify.`)

    if (!suggestions || suggestions.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending notifications' }), { 
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    // 2. Group by email
    const groups: Record<string, any[]> = {}
    suggestions.forEach(s => {
      if (s.user_email) {
        if (!groups[s.user_email]) groups[s.user_email] = []
        groups[s.user_email].push(s)
      }
    })

    console.log(`Grouped into ${Object.keys(groups).length} email distinct users.`)
    const results = []

    // 3. Send email for each group
    for (const [email, userSuggestions] of Object.entries(groups)) {
      console.log(`Processing notifications for ${email}...`)
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

      console.log(`Sending email via Resend to ${email}...`)
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
      
      const resData = await res.json().catch(() => ({}))
      console.log(`Resend response for ${email}:`, { status: res.status, ok: res.ok, data: resData })
      results.push({ email, success: res.ok, resendData: resData })
    }

    // 4. Mark as notified
    console.log('Marking suggestions as notified in DB...')
    const idsToUpdate = suggestions.map(s => s.id)
    const { error: updateError } = await supabase
      .from('suggestions')
      .update({ notified: true })
      .in('id', idsToUpdate)

    if (updateError) {
      console.error('Update notified error:', updateError)
    } else {
      console.log('Successfully updated notified status.')
    }

    return new Response(JSON.stringify({ results }), { 
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('Unhandled function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }
});
