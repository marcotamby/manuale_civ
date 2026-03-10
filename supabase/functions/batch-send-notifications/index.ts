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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS, status: 204 })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Function invoked.`)

  if (!RESEND_API_KEY) {
    console.error('CRITICAL: RESEND_API_KEY is not defined in secrets!')
    return new Response(JSON.stringify({ error: 'Resend API Key missing' }), { 
      status: 500, headers: CORS_HEADERS 
    })
  }

  try {
    console.log('Fetching suggestions with notified=false...')
    const { data: suggestions, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .neq('status', 'pending')
      .eq('notified', false)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(JSON.stringify({ error: `Fetch error: ${fetchError.message}` }), { 
        status: 500, headers: CORS_HEADERS 
      })
    }

    const count = suggestions?.length || 0
    console.log(`Found ${count} suggestions back from DB.`)

    if (count === 0) {
      return new Response(JSON.stringify({ message: 'No pending notifications' }), { 
        status: 200, headers: CORS_HEADERS 
      })
    }

    const groups: Record<string, any[]> = {}
    let noEmailCount = 0
    suggestions.forEach(s => {
      if (s.user_email && s.user_email.trim() !== '') {
        if (!groups[s.user_email]) groups[s.user_email] = []
        groups[s.user_email].push(s)
      } else {
        noEmailCount++
      }
    })

    console.log(`Groups: ${Object.keys(groups).length}. suggestions without email: ${noEmailCount}`)

    const emailResults = []
    const emailPromises = Object.entries(groups).map(async ([email, userSuggestions]) => {
      console.log(`Processing email for: ${email} (${userSuggestions.length} items)`)
      const fullName = userSuggestions[0]?.user_name || ''
      const firstName = fullName.split(' ')[0]
      const greeting = firstName ? `Ciao ${firstName}` : 'Ciao'

      let html = `<h1>Novità sulle tue proposte - Manuale Civ</h1>`
      html += `<p>${greeting},</p><p>Ecco l'esito dei tuoi suggerimenti:</p>`

      const approved = userSuggestions.filter(s => s.status === 'implemented')
      const rejected = userSuggestions.filter(s => s.status === 'rejected')

      if (approved.length > 0) {
        html += `<h3>✅ Approvate:</h3><ul>`
        approved.forEach(s => html += `<li>${s.civ_name}: ${s.section}</li>`)
        html += `</ul>`
      }
      if (rejected.length > 0) {
        html += `<h3>❌ Non accettate:</h3><ul>`
        rejected.forEach(s => html += `<li>${s.civ_name}: ${s.rejection_reason || 'N/A'}</li>`)
        html += `</ul>`
      }

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'Manuale Civ <noreply@resend.dev>',
            to: [email],
            subject: `Aggiornamento proposte Manuale Civ`,
            html,
          })
        })
        const data = await res.json().catch(() => ({}))
        console.log(`Resend response for ${email}:`, res.status, data)
        return { email, ok: res.ok, status: res.status, data }
      } catch (err: any) {
        console.error(`Fetch error for ${email}:`, err.message)
        return { email, ok: false, error: err.message }
      }
    })

    const results = await Promise.all(emailPromises)
    console.log('Marking suggestions as notified in DB...')
    const { error: updateError } = await supabase
      .from('suggestions')
      .update({ notified: true })
      .in('id', suggestions.map(s => s.id))

    if (updateError) {
      console.error('DB Update error:', updateError)
      return new Response(JSON.stringify({ error: `DB Update error: ${updateError.message}`, results }), { 
        status: 500, headers: CORS_HEADERS 
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count, 
      notified: suggestions.length,
      emailResults: results 
    }), { 
      status: 200, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    console.error('Global error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, headers: CORS_HEADERS 
    })
  }
});
