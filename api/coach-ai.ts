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

const CIV_NAME_TO_SLUG: Record<string, string> = {
  'jin': 'jin_dynasty',
  'dinastia jin': 'jin_dynasty',
  'jin dynasty': 'jin_dynasty',
  'mongoli': 'mongols',
  'mongols': 'mongols',
  'inglesi': 'english',
  'english': 'english',
  'francesi': 'french',
  'french': 'french',
  'bisantini': 'byzantines',
  'byzantines': 'byzantines',
  'ottomani': 'ottomans',
  'ottomans': 'ottomans',
  'rus': 'rus',
  'maliani': 'malians',
  'malians': 'malians',
  'delhi': 'delhi_sultanate',
  'sultanato di delhi': 'delhi_sultanate',
  'cinesi': 'chinese',
  'chinese': 'chinese',
  'giapponesi': 'japanese',
  'japanese': 'japanese',
  'sri': 'holy_roman_empire',
  'sacro romano impero': 'holy_roman_empire',
  'hre': 'holy_roman_empire',
  'ordine del drago': 'order_of_the_dragon',
  'order of the dragon': 'order_of_the_dragon',
  'giovanni d\'arco': 'jeanne_darc',
  'jeanne d\'arco': 'jeanne_darc',
  'ayubidi': 'ayyubids',
  'ayyubids': 'ayyubids',
  'zhu xi': 'zhu_xis_legacy',
  'eredita di zhu xi': 'zhu_xis_legacy',
  'lancaster': 'house_of_lancaster',
  'casata di lancaster': 'house_of_lancaster',
  'templari': 'knights_templar',
  'cavalieri templari': 'knights_templar',
  'sengoku': 'sengoku_daimyo',
  'macedoni': 'macedonian_dynasty',
  'dinastia macedone': 'macedonian_dynasty',
  'orda d\'oro': 'golden_horde',
  'golden horde': 'golden_horde',
  'tughlaq': 'tughlaq_dynasty'
};

const AOE4_GROUND_TRUTH_UNITS = `
DIZIONARIO DI VERITÀ UFFICIALE CIVILTÀ E UNITÀ DEL PORTALE "MANUALE CIV" (MANDATORIO):

1. DINASTIA JIN (Jin Dynasty - PRESENTE SUL SITO):
   - NATURA CIVILTÀ: Civiltà imperiale/cinese d'élite (ATTENZIONE: NON È UNA CIVILTÀ NOMADE! I Mongoli sono nomadi, la Dinastia Jin NO!).
   - Caratteristiche: Domina con la sua cavalleria pesante d'élite (Pagoda di Ferro / Iron Pagoda), fortificazioni, tributari ed economia avanzata.
   - VIETATO ASSOLUTAMENTE definire la Dinastia Jin come "civiltà nomade"!

2. MONGOLI (Mongols):
   - NATURA CIVILTÀ: Civiltà nomade per eccellenza (edifici mobili, Ovoo, Mangudai, Khan).

3. DINASTIA MACEDONE (Macedonian Dynasty)
4. ORDA D'ORO (Golden Horde - Civiltà nomade variante)
5. SENGOKU DAIMYO (Variante Giapponese)
6. CAVALIERI TEMPLARI (Knights Templar)
7. DINASTIA TUGHLAQ (Tughlaq Dynasty)
8. INGLESI (English): Arcieri Lunghi (Longbowmen), Rete dei Castelli, Fattorie.
9. LA CASATA DI LANCASTER (Lancaster): Yeoman (Arcieri Yeoman con Tiro Sincronizzato), Lord of Lancaster, Manieri.
10. FRANCESI (French): Cavalieri Reali, Arbalétrier.
11. GIOVANNI D'ARCO (Jeanne d'Arc): Eroe Giovanni d'Arco con livelli.
12. OTTOMANI (Ottomans): Giannizzeri, Sipahi, Grande Bombarda.
13. BISANTINI (Byzantines): Catrafatti, Varangiani, Cheirosiphon.
14. SACRO ROMANO IMPERO (HRE): Landsknecht, Prelato.
15. ORDINE DEL DRAGO (Order of the Dragon): Unità Gildate.
16. CINESI (Chinese): Zhuge Nu, Dinastie.
17. EREDITÀ DI ZHU XI (Zhu Xi's Legacy): Zhuge Nu Gildati.
18. GIAPPONESI (Japanese): Samurai, Shinobi.
19. MALIANI (Malians): Donso, Musofadi, Giavellottisti.
20. SULTANATO DI DELHI (Delhi Sultanate): Elefanti da Guerra, Saggi.
21. RUS (Rus): Strel'cy, Monaci Guerrieri.
22. AYUBIDI (Ayyubids): Cavalieri e Arcieri su Cammello.
`;

async function fetchMatchupContext(userMessage: string): Promise<string> {
  try {
    const lower = userMessage.toLowerCase();
    
    let rank = '';
    if (lower.includes('conqueror')) rank = 'conqueror';
    else if (lower.includes('diamond') || lower.includes('diamante')) rank = 'diamond';
    else if (lower.includes('platinum') || lower.includes('platino')) rank = 'platinum';
    else if (lower.includes('gold') || lower.includes('oro')) rank = 'gold';
    else if (lower.includes('silver') || lower.includes('argento')) rank = 'silver';
    else if (lower.includes('bronze') || lower.includes('bronzo')) rank = 'bronze';

    const detectedSlugs: string[] = [];
    for (const [key, slug] of Object.entries(CIV_NAME_TO_SLUG)) {
      if (lower.includes(key) && !detectedSlugs.includes(slug)) {
        detectedSlugs.push(slug);
      }
    }

    if (detectedSlugs.length === 0) return '';

    const url = `https://aoe4world.com/api/v0/stats/rm_solo/matchups${rank ? '?rank_level=' + rank : ''}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const json = await res.json();
    const allData: any[] = json.data || [];

    if (detectedSlugs.length >= 2) {
      const civA = detectedSlugs[0];
      const civB = detectedSlugs[1];
      const match = allData.find(m => 
        (m.civilization === civA && m.other_civilization === civB) ||
        (m.civilization === civB && m.other_civilization === civA)
      );

      if (match) {
        const isCivAFrist = match.civilization === civA;
        const winRateA = isCivAFrist ? match.win_rate : (100 - match.win_rate);
        const winRateB = isCivAFrist ? (100 - match.win_rate) : match.win_rate;
        const nameA = civA.replace('_', ' ').toUpperCase();
        const nameB = civB.replace('_', ' ').toUpperCase();
        
        return `STATISTICHE UFFICIALI E REALI IN TEMPO REALE DAL PORTALE / AOE4WORLD (Rank: ${rank ? rank.toUpperCase() : 'TUTTI I RANK'}):\n- ${nameA}: Win Rate **${winRateA.toFixed(1)}%** (${match.win_count} vittorie su ${match.games_count} partite totali)\n- ${nameB}: Win Rate **${winRateB.toFixed(1)}%**\nCITA OBBLIGATORIAMENTE QUESTI DATI E PERCENTUALI PRECISE NELLA TUA RISPOSTA!`;
      }
    } else if (detectedSlugs.length === 1) {
      const civA = detectedSlugs[0];
      const matches = allData.filter(m => m.civilization === civA);
      if (matches.length > 0) {
        const topList = matches.slice(0, 5).map(m => `- contro ${m.other_civilization.replace('_', ' ')}: Win Rate ${m.win_rate.toFixed(1)}% (${m.games_count} partite)`).join('\n');
        return `STATISTICHE LIVE DAL SITO PER ${civA.toUpperCase()} (Rank: ${rank ? rank.toUpperCase() : 'TUTTI I RANK'}):\n${topList}\nUSALI NELLA RISPOSTA!`;
      }
    }

    return '';
  } catch (e) {
    return '';
  }
}

async function fetchSiteKnowledge() {
  if (!supabase) return '';
  try {
    const knowledgePieces: string[] = [];

    const { data: qData } = await supabase
      .from('questions')
      .select('question_text, civ_id')
      .eq('status', 'approved')
      .limit(5);

    if (qData && qData.length > 0) {
      knowledgePieces.push('DOMANDE COMMUNITY APPROVATE:\n' + qData.map(q => `- (${q.civ_id}): ${q.question_text}`).join('\n'));
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
        user_nickname: userNickname || 'utente',
        prompt: prompt,
        reply: reply.substring(0, 1000),
        created_at: new Date().toISOString()
      }
    ]);
  } catch (e) { }
}

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

async function generateWithModelFallback(apiKey: string, promptText: string) {
  let lastErrorMsg = '';

  for (const model of MODELS_TO_TRY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.15,
            topP: 0.8,
            topK: 30
          }
        })
      });

      const data = await geminiRes.json();

      if (data.error) {
        console.warn(`Modello ${model} non disponibile o errore: ${data.error.message}, provo il prossimo...`);
        lastErrorMsg = data.error.message;
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resultText) return resultText;
    } catch (err: any) {
      console.warn(`Errore con il modello ${model}:`, err);
      lastErrorMsg = err.message || 'Errore durante la generazione';
      continue;
    }
  }

  throw new Error(lastErrorMsg ? `Servizio occupato (${lastErrorMsg}). Riprova tra poco!` : 'Servizio temporaneamente occupato. Riprova tra 15 secondi!');
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
    const matchupLiveStats = await fetchMatchupContext(message);

    let formattedHistory = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-2);
      formattedHistory = 'CRONOLOGIA RECENTE:\n' + recent.map((m: ChatMessage) => 
        `${m.sender === 'user' ? 'Utente' : 'Coach Beasty'}: ${m.text}`
      ).join('\n') + '\n\n';
    }

    const hasRealNickname = userNickname && userNickname.trim() && userNickname.trim() !== 'nabbo';
    const nameToUse = hasRealNickname ? userNickname.trim() : '';

    const systemPrompt = `Sei "Coach Beasty", un coach ed esperto umano di livello mondiale di Age of Empires IV per il portale "Manuale Civ".

${AOE4_GROUND_TRUTH_UNITS}

REGOLA AUREA ED INFLESSIBILE: ZERO ALLUCINAZIONI / DATI REALI DAL SITO (MANDATORIO!)
- Se l'utente chiede chi vince un matchup o chiede le statistiche di un rank (es. Conqueror, Diamond, Gold, ecc.), DEVI USARE I DATI ED I WIN RATE IN TEMPO REALE FORNITI SOTTO!
- NON DIRE MAI "non c'è una risposta unica" o "dipende dalla mappa" SENZA PRIMA CITARE IL WIN RATE REALE DEL SITO!

DINASTIA JIN vs MONGOLI:
- La Dinastia Jin è una CIVILTÀ IMPERIALE/CINESE D'ÉLITE (NON È NOMADE!).
- I Mongoli sono una CIVILTÀ NOMADE.
- VIETATO chiamare la Dinastia Jin "civiltà nomade"!

STILE DI COMUNICAZIONE:
1. TONO PULITO, NATURALE E PROFESSIONALE:
   - Parla come un coach esperto, amichevole e competente. Usa un italiano naturale, pulito e chiaro.
2. NOME UTENTE & RISPETTO:
   - ${hasRealNickname ? `Rivolgiti all'utente con il suo nickname (**${nameToUse}**) con naturalezza.` : `Rivolgiti all'utente in modo amichevole e cordiale.`}
   - VIETATO USARE A RIPETIZIONE LA PAROLA "NABBO"!

3. FORMATO RISPOSTA JSON:
   Rispondi ESCLUSIVAMENTE in formato JSON valido con questa struttura:
   {
     "reply": "spiegazione tattica spigliata, simpatica e chiara in markdown citando i win rate reali se richiesti",
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

    const promptText = `${systemPrompt}\n\n${matchupLiveStats ? `DATI REALI MATCHUP DAL SITO:\n${matchupLiveStats}\n\n` : ''}${siteKnowledge ? `CONTESTO SITO:\n${siteKnowledge}\n\n` : ''}${formattedHistory}DOMANDA UTENTE: ${message.trim()}`;

    const rawResultText = await generateWithModelFallback(apiKey, promptText);

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
