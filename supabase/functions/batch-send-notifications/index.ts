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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS, status: 204 })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const timestamp = new Date().toISOString()
    console.log(`[LOG][${timestamp}] Function invoked.`)

    const { data: suggestions, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .neq('status', 'pending')
      .eq('notified', false)

    if (fetchError) {
      console.error(`Fetch error: ${fetchError.message}`)
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
      const firstName = (userSuggestions[0]?.user_name || '').split(' ')[0]
      const greeting = firstName ? `Ciao ${firstName}` : 'Ciao'

      let itemsHtml = ''
      userSuggestions.forEach(s => {
        const isApp = s.status === 'implemented'
        itemsHtml += `
          <div style="margin-bottom: 12px; padding: 12px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid ${isApp ? '#10b981' : '#ef4444'};">
            <div style="font-weight: bold; color: #111827; margin-bottom: 4px;">
              ${isApp ? '✅ Implementata' : '❌ Non approvata'} - ${s.civ_name}
            </div>
            <div style="font-size: 14px; color: #4b5563;">
              <strong>Sezione:</strong> ${s.section}<br/>
              ${!isApp && s.rejection_reason ? `<strong>Motivo:</strong> ${s.rejection_reason}` : ''}
            </div>
          </div>`
      })

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center;">
              <h1 style="color: #f8fafc; margin: 0; font-size: 24px; letter-spacing: 0.05em;">Manuale Civ</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="margin-top: 0; color: #111827;">${greeting},</h2>
              <p style="color: #4b5563; font-size: 16px;">Ci sono novità riguardo i suggerimenti che hai inviato per migliorare il manuale di Age of Empires 4.</p>
              
              <div style="margin-top: 25px;">
                ${itemsHtml}
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">Grazie per il tuo contributo alla community!</p>
                <a href="https://manualeciv.vercel.app" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Torna al Manuale</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; ${new Date().getFullYear()} Manuale Civ. Tutti i diritti riservati.</p>
            </div>
          </div>
        </body>
        </html>
      `

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
            from: 'Manuale Civ <noreply@aoe4guide.it>',
            to: [email],
            subject: `Aggiornamento proposte Manuale Civ`,
            html,
          }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        console.log(`Resend response for ${email}: ${res.status}`)
        emailResults.push({ email, ok: res.ok, status: res.status })
      } catch (err: any) {
        console.error(`Error sending to ${email}: ${err.message}`)
        emailResults.push({ email, ok: false, error: err.message })
      }
    }

    const ids = suggestions.map(s => s.id)
    const { error: updateError } = await supabase.from('suggestions').update({ notified: true }).in('id', ids)

    if (updateError) {
      console.error(`Update DB error: ${updateError.message}`)
    }

    return new Response(JSON.stringify({
      success: true,
      count,
      emailResults,
      version: '2.4'
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error(`Global error: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }
});
