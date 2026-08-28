import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { }
  }

  const { message, history = [] } = body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Messaggio non valido o vuoto' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API Key di Gemini non configurata. Imposta GEMINI_API_KEY nelle variabili di ambiente.' 
      });
    }

    // Format chat history for prompt context
    let formattedHistory = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-6); // last 6 messages
      formattedHistory = 'CRONOLOGIA CONVERSAZIONE:\n' + recent.map((m: ChatMessage) => 
        `${m.sender === 'user' ? 'Utente' : 'Coach Beasty'}: ${m.text}`
      ).join('\n') + '\n\n';
    }

    const systemPrompt = `Sei "Coach Beasty AI", il coach virtuale ed esperto assoluto di Age of Empires IV per il portale "Manuale Civ".
Sei un coach di livello mondiale: analitico, diretto, motivante, chiarissimo e profondamente competente in tutte le 16+ civiltà di AoE4, i matchup, le contromisure delle unità, le build order, i villager distribution e le strategie di mappa.

REGOLE MANDATORIE DI RISPOSTA:
1. LINGUA: Rispondi ESCLUSIVAMENTE in italiano con terminologia tecnica di AoE4.
2. TERMINOLOGIA: Usa i termini italiani traslitterati propri di AoE4:
   - "villi/abitanti", "cibo", "legna", "oro", "pietra", "centro città", "monumento".
   - Edifici militari: "caserma", "stalla" (non usare mai 'stabile'), "poligono di tiro" o "arceria", "officina d'assedio".
   - Termini specifici civiltà: usa l'iniziale minuscola per i termini comuni (es. ovoo, cisterna, pozzo minerario, ecc.).
3. FORMATO DI RISPOSTA:
   Devi rispondere SEMPRE in formato JSON valido con questa struttura esatta:
   {
     "reply": "stringa markdown con la spiegazione dettagliata, consigli, tattiche e posizionamento",
     "tacticalCard": {
       "title": "Titolo opzionale (es. Inglesi vs Francesi Feudale)",
       "age": "Opzionale (es. Età II - Feudale)",
       "counterUnits": [
         { "name": "Nome Unità", "icon": "Emoji o icona (es. 🗡️, 🏹, 🐎, 🛡️, 🪵)", "role": "Ruolo breve (es. Bonus anti-cavalleria)" }
       ],
       "villagers": {
         "food": 0,
         "wood": 0,
         "gold": 0,
         "stone": 0
       },
       "proTip": "Consiglio pro tattico avanzato o posizionamento strutture"
     }
   }

N.B.: Se la domanda dell'utente è un saluto o generica e non richiede schede di contromisura o villici, puoi lasciare "tacticalCard": null o includere solo "reply".
Sii conciso, professionale ma amichevole e appassionato di AoE4!`;

    const promptText = `${systemPrompt}\n\n${formattedHistory}DOMANDA UTENTE: ${message.trim()}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.85,
          topK: 40
        }
      })
    });

    const data = await geminiRes.json();

    if (data.error) {
      throw new Error(`Gemini API Error: ${data.error.message}`);
    }

    const rawResultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawResultText) {
      throw new Error("Nessuna risposta dall'IA.");
    }

    // Try parsing JSON output
    let parsedResult = { reply: rawResultText, tacticalCard: null };
    try {
      let cleaned = rawResultText.trim();
      if (cleaned.includes('```')) {
        const matches = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) cleaned = matches[1].trim();
      }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        const obj = JSON.parse(cleaned);
        if (obj.reply) {
          parsedResult = obj;
        }
      }
    } catch (parseErr) {
      // Fallback to raw text reply if JSON parsing fails
      parsedResult = { reply: rawResultText, tacticalCard: null };
    }

    return res.status(200).json(parsedResult);

  } catch (error: any) {
    console.error('Coach Beasty AI API error:', error);
    return res.status(500).json({ error: error.message || 'Errore interno del server' });
  }
}
