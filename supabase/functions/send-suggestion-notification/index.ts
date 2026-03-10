import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { record, old_record, type } = await req.json()

  // Only proceed if it's an update where the status changed
  if (type !== 'UPDATE' || record.status === old_record.status) {
    return new Response(JSON.stringify({ message: 'No status change' }), { status: 200 })
  }

  const userEmail = record.user_email
  if (!userEmail) {
    return new Response(JSON.stringify({ message: 'No user email' }), { status: 200 })
  }

  let subject = ''
  let html = ''

  if (record.status === 'implemented') {
    subject = `Ottime notizie! La tua proposta per ${record.civ_name} è stata accettata!`
    html = `
      <h1>Grazie per il tuo contributo!</h1>
      <p>Ciao,</p>
      <p>Siamo felici di informarti che la tua proposta per la civiltà <strong>${record.civ_name}</strong> è stata approvata e implementata sul sito.</p>
      <p>Puoi vederla ora su <a href="https://manualeciv.vercel.app">Manuale Civ</a>.</p>
      <p>Grazie per aiutarci a far crescere la community!</p>
    `
  } else if (record.status === 'rejected') {
    subject = `Aggiornamento sulla tua proposta per ${record.civ_name}`
    html = `
      <h1>Aggiornamento Proposta</h1>
      <p>Ciao,</p>
      <p>Ti informiamo che la tua proposta per la civiltà <strong>${record.civ_name}</strong> è stata revisionata.</p>
      <p>Purtroppo non è stata accettata per il seguente motivo:</p>
      <blockquote style="background: #f4f4f4; padding: 10px; border-left: 5px solid #ccc;">
        ${record.rejection_reason || 'Nessuna motivazione specifica fornita.'}
      </blockquote>
      <p>Ti invitiamo comunque a continuare a contribuire con nuovi suggerimenti.</p>
      <p>Grazie,</p>
      <p>Il team di Manuale Civ</p>
    `
  }

  if (subject && html) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Manuale Civ <noreply@resend.dev>', // You should change this to your verified domain later
        to: [userEmail],
        subject,
        html,
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { status: 200 })
  }

  return new Response(JSON.stringify({ message: 'Status ignored' }), { status: 200 })
})
