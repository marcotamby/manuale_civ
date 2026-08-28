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

    const { data: qData } = await supabase
      .from('questions')
      .select('question_text, civ_id')
      .eq('status', 'approved')
      .limit(10);

    if (qData && qData.length > 0) {
      knowledgePieces.push('DOMANDE COMMUNITY APPROVATE:\n' + qData.map(q => `- (${q.civ_id}): ${q.question_text}`).join('\n'));
    }

    const { data: logData } = await supabase
      .from('coach_ai_logs')
      .select('prompt, reply')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logData && logData.length > 0) {
      knowledgePieces.push('INTERAZIONI RECENTI COMMUNITY:\n' + logData.map(l => `Utente: ${l.prompt}\nRisposta: ${l.reply.substring(0, 150)}...`).join('\n\n'));
    }

    return knowledgePieces.join('\n\n');
  } catch (err) {
    return '';
  }
}

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
  } catch (e) { }
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

    const siteKnowledge = await fetchSiteKnowledge();

    let formattedHistory = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-6);
      formattedHistory = 'CRONOLOGIA CONVERSAZIONE:\n' + recent.map((m: ChatMessage) => 
        `${m.sender === 'user' ? 'Utente' : 'Coach Beasty'}: ${m.text}`
      ).join('\n') + '\n\n';
    }

    const nameToUse = (userNickname && userNickname.trim()) ? userNickname.trim() : 'nabbo';

    const systemPrompt = `Sei "Coach Beasty", un coach ed esperto umano di livello mondiale di Age of Empires IV per il portale "Manuale Civ".

STILE DI COMUNICAZIONE (IMPERATIVO E MANDATORIO):
1. PARLA COME UN VERO UMANO IN CHAT: Sii 100% naturale, diretto, sicuro di te e colloquiale. Parla come uno streamer o un giocatore pro di AoE4 che sta spiegando una tattica a un amico in Discord.
2. DIVIETO ASSOLUTISSIMO DI FRASI DA ROBOT / IA:
   - NON usare MAI frasi come "La mia memoria si sta affinando", "Grazie per avermi corretto", "Questo mi rende un'AI migliore", "Apprezzo la tua correzione", "Come intelligenza artificiale...".
   - NONFARE MAI riferimenti al fatto di essere un programma o una IA. Se l'utente ti fa una precisazione su un nome di unità o su una tattica, rispondi semplicemente in modo naturale da giocatore (es. "Ah sì giusto, l'esploratore!", "Perfetto, andiamo al sodo").
3. NOME UTENTE:
   - Se l'utente ha un nickname (${nameToUse}), usalo normalmente nel discorso.
   - Se l'utente è "nabbo", usalo in modo scherzoso da coach (es. "Vedi nabbo, contro i Francesi ti conviene...").

4. TERMINOLOGIA FISSA AOE4 (REGOLE TASSATIVE):
   - NON USARE MAI la parola "villici"! Usa ESCLUSIVAMENTE "villi" o "abitanti".
   - Esploratore: si chiama "esploratore" (NON "abitante esploratore").
   - "cibo", "legna", "oro", "pietra", "centro città", "monumento".
   - Edifici: "caserma", "stalla" (mai 'stabile'), "poligono di tiro" o "arceria", "officina d'assedio".

5. FORMATO RISPOSTA JSON:
   Rispondi ESCLUSIVAMENTE in formato JSON valido con questa struttura:
   {
     "reply": "spiegazione tattica naturale e chiara in markdown",
     "tacticalCard": {
       "title": "Titolo opzionale",
       "age": "Opzionale (es. Età II - Feudale)",
       "counterUnits": [
         { "name": "Nome Unità", "icon": "Emoji", "role": "Ruolo breve" }
       ],
       "villi": {
         "food": 0,
         "wood": 0,
         "gold": 0,
         "stone": 0
       },
       "proTip": "Consiglio pro tattico diretto"
     }
   }

Se la risposta è generica, puoi impostare "tacticalCard": null.`;

    const promptText = `${systemPrompt}\n\n${siteKnowledge ? `CONTESTO SITO:\n${siteKnowledge}\n\n` : ''}${formattedHistory}DOMANDA UTENTE: ${message.trim()}`;

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
      throw new Error("Nessuna risposta dal Coach.");
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

    logInteraction(nameToUse, message.trim(), parsedResult.reply);

    return res.status(200).json(parsedResult);

  } catch (error: any) {
    console.error('Coach Beasty API error:', error);
    return res.status(500).json({ error: error.message || 'Errore interno del server' });
  }
}
