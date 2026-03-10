import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Force redeploy: 2026-03-10T09:55:00Z
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
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS, status: 204 })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  
  try {
    const timestamp = new Date().toISOString()
    console.log(`[DEBUG v2.3][${timestamp}] Function invoked.`)

    const { data: suggestions, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .neq('status', 'pending')
      .eq('notified', false)

    if (fetchError) {
       console.error(`[DEBUG v2.3] Fetch error: ${fetchError.message}`)
       return new Response(JSON.stringify({ error: fetchError.message }), { 
         status: 500, 
         headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
       })
    }

    const count = suggestions?.length || 0
    if (count === 0) {
      return new Response(JSON.stringify({ message: 'No pending notifications', success: true }), { 
        status: 200, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      })
    }

    const groups: Record<string, any[]> = {}
    suggestions.forEach(s => {
      if (s.user_email) {
        if (!groups[s.user_email]) groups[s.user_email] = []
        groups[s.user_email].push(s)
      }
    })

    const emailResults = []
    for (const [email, userSuggestions] of Object.entries(groups)) {
      console.log(`[DEBUG v2.3] Sending to ${email}...`)
      
      const firstName = (userSuggestions[0]?.user_name || '').split(' ')[0]
      const greeting = firstName ? `Ciao ${firstName}` : 'Ciao'
      let html = `<h1>Novità sulle tue proposte - Manuale Civ</h1><p>${greeting},</p><p>Esito suggerimenti:</p><ul>`
      userSuggestions.forEach(s => {
        const isApp = s.status === 'implemented'
        html += `<li>${isApp ? '✅' : '❌'} ${s.civ_name}: ${isApp ? s.section : (s.rejection_reason || 'N/A')}</li>`
      })
      html += `</ul>`

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'Manuale Civ <onboarding@resend.dev>',
            to: [email],
            subject: `Aggiornamento proposte Manuale Civ`,
            html,
          }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        console.log(`[DEBUG v2.3] Resend response for ${email}: ${res.status}`)
        emailResults.push({ email, ok: res.ok, status: res.status })
      } catch (err: any) {
        console.error(`[DEBUG v2.3] Error sending to ${email}: ${err.message}`)
        emailResults.push({ email, ok: false, error: err.message })
      }
    }

    // Final database update
    const ids = suggestions.map(s => s.id)
    const { error: updateError } = await supabase.from('suggestions').update({ notified: true }).in('id', ids)

    if (updateError) {
      console.error(`[DEBUG v2.3] Update DB error: ${updateError.message}`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count, 
      emailResults,
      debug: 'v2.3'
    }), { 
      status: 200, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    console.error(`[DEBUG v2.3] Global error: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    })
  }
});
