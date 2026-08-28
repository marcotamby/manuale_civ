import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

// Helper to fetch live site knowledge from Supabase
async function fetchSiteKnowledge() {
  if (!supabase) return '';
  try {
    const knowledgePieces: string[] = [];

    // 1. Fetch approved questions & answers from community Q&A
    const { data: qData } = await supabase
      .from('questions')
      .select('question_text, civ_id')
      .eq('status', 'approved')
      .limit(10);

    if (qData && qData.length > 0) {
      knowledgePieces.push('DOMANDE COMMUNITY APPROVATE:\n' + qData.map(q => `- (${q.civ_id}): ${q.question_text}`).join('\n'));
    }

    // 2. Fetch recent coach interaction logs for learning
    const { data: logData } = await supabase
      .from('coach_ai_logs')
      .select('prompt, reply')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logData && logData.length > 0) {
      knowledgePieces.push('INTERAZIONI RECENTI DI COACH BEASTY (APPRENDIMENTO COMMUNITY):\n' + logData.map(l => `Utente: ${l.prompt}\nCoach: ${l.reply.substring(0, 150)}...`).join('\n\n'));
    }

    return knowledgePieces.join('\n\n');
  } catch (err) {
    console.warn('Impossibile recuperare memoria da Supabase:', err);
    return '';
  }
}

// Helper to log interaction for continuous learning
async function logInteraction(userNickname: string, prompt: string, reply: string) {
  if (!supabase) return;
  try {
    await supabase.from('coach_ai_logs').insert([
      {
        user_nickname: userNickname || 'nabbo',
        prompt: prompt,
        reply: reply.substring(0, 1000),
        created_at: new Date().toISOString()
      }
    ]);
  } catch (e) {
    // Silent catch if table doesn't exist yet
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { }
  }

  const { message, history = [], userNickname } = body || {};

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

    // Fetch live site knowledge and interaction logs
    const siteKnowledge = await fetchSiteKnowledge();

    // Format chat history
    let formattedHistory = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-6);
      formattedHistory = 'CRONOLOGIA CONVERSAZIONE:\n' + recent.map((m: ChatMessage) => 
        `${m.sender === 'user' ? 'Utente' : 'Coach Beasty'}: ${m.text}`
      ).join('\n') + '\n\n';
    }

    const nameToUse = (userNickname && userNickname.trim()) ? userNickname.trim() : 'nabbo';

    const systemPrompt = `Sei "Coach Beasty AI", il coach virtuale ed esperto assoluto di Age of Empires IV per il portale "Manuale Civ".
Sei un coach di livello mondiale: analitico, diretto, schietto e profondamente esperto di AoE4. ImPARI costantemente dalle risorse del sito Manuale Civ e dalle interazioni con la community.

${siteKnowledge ? `CONOSCENZA E MEMORIA APPRESA DAL SITO & COMMUNITY:\n${siteKnowledge}\n\n` : ''}

REGOLE CRITICHE E MANDATORIE:
1. RIVOLGITI ALL'UTENTE:
   Il nome dell'utente è "${nameToUse}".
   - Se l'utente ha un nickname valido, chiamalo con il suo nickname (es: "Ciao ${nameToUse}!", "Vedi ${nameToUse}, in questo matchup...").
   - Se l'utente NON ha un nickname ed è "nabbo", rivolgiti a lui chiamandolo esplicitamente "nabbo" in modo scherzoso ma autorevole da vero coach (es: "Ascolta nabbo", "Vedi nabbo, la strategia giusta è...", "Ciao nabbo!").

2. TERMINOLOGIA FISSA SUGLI ABITANTI (FONDAMENTALE):
   - VIETATO ASSOLUTAMENTE l'uso della parola "villici"!
   - Usa ESCLUSIVAMENTE "villi" o "abitanti" (o "abitanti del villaggio").

3. TERMINOLOGIA TECNICA AOE4:
   - "cibo", "legna", "oro", "pietra", "centro città", "monumento".
   - Edifici militari: "caserma", "stalla" (mai 'stabile'), "poligono di tiro" o "arceria", "officina d'assedio".
   - Termini specifici civiltà in minuscolo (es. ovoo, cisterna, pozzo minerario).

4. FORMATO RISPOSTA JSON:
   Rispondi ESCLUSIVAMENTE in formato JSON valido con questa struttura:
   {
     "reply": "stringa markdown dettagliata con consigli, tattiche e posizionamento",
     "tacticalCard": {
       "title": "Titolo opzionale (es. Inglesi vs Francesi Feudale)",
       "age": "Opzionale (es. Età II - Feudale)",
       "counterUnits": [
         { "name": "Nome Unità", "icon": "Emoji (es. 🗡️, 🏹, 🐎, 🛡️)", "role": "Ruolo breve" }
       ],
       "villi": {
         "food": 0,
         "wood": 0,
         "gold": 0,
         "stone": 0
       },
       "proTip": "Consiglio pro tattico avanzato"
     }
   }

Se la risposta è generica, puoi impostare "tacticalCard": null.`;

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
      parsedResult = { reply: rawResultText, tacticalCard: null };
    }

    // Async log interaction for continuous learning
    logInteraction(nameToUse, message.trim(), parsedResult.reply);

    return res.status(200).json(parsedResult);

  } catch (error: any) {
    console.error('Coach Beasty AI API error:', error);
    return res.status(500).json({ error: error.message || 'Errore interno del server' });
  }
}
