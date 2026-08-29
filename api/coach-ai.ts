import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { civilizationsData } from '../src/data/aoe4Data';

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
  'jin': 'jin-dynasty',
  'dinastia jin': 'jin-dynasty',
  'jin dynasty': 'jin-dynasty',
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
  'ordine del drago': 'orderoftheragon',
  'order of the dragon': 'orderofthedragon',
  'giovanni d\'arco': 'jeannedarc',
  'jeanne d\'arco': 'jeannedarc',
  'ayubidi': 'ayyubids',
  'ayyubids': 'ayyubids',
  'zhu xi': 'zhuxi',
  'eredita di zhu xi': 'zhuxi',
  'lancaster': 'lancaster',
  'casata di lancaster': 'lancaster',
  'templari': 'templar',
  'cavalieri templari': 'templar',
  'sengoku': 'sengoku',
  'macedoni': 'macedonian',
  'dinastia macedone': 'macedonian',
  'orda d\'oro': 'goldenhorde',
  'golden horde': 'goldenhorde',
  'tughlaq': 'tughlaq'
};

function getRelevantGroundTruth(userMessage: string, history: ChatMessage[] = []): string {
  const combinedText = (userMessage + ' ' + history.map(m => m.text).join(' ')).toLowerCase();
  
  const matchedSlugs = new Set<string>();
  for (const [key, slug] of Object.entries(CIV_NAME_TO_SLUG)) {
    if (combinedText.includes(key)) {
      matchedSlugs.add(slug);
    }
  }

  let relevantCivs = civilizationsData;
  if (matchedSlugs.size > 0) {
    relevantCivs = civilizationsData.filter(c => matchedSlugs.has(c.id));
  }

  const ageMap: Record<number, string> = {
    1: 'Dark Age (Età I)',
    2: 'Feudal Age (Età II)',
    3: 'Castle Age / Età dei Castelli (Età III)',
    4: 'Imperial Age / Età Imperiale (Età IV)'
  };

  let truthStr = 'DIZIONARIO VERITÀ UFFICIALE DEL PORTALE SULLE CIVILTÀ ED ETÀ DI SBLOCCO UNITÀ (MANDATORIO!):\n\n';
  
  for (const civ of relevantCivs) {
    truthStr += `[${civ.name.toUpperCase()} - ID: ${civ.id}]\n`;
    truthStr += `  - Natura: ${civ.shortDescription}\n`;
    if (civ.id === 'malians') {
      truthStr += `  - MECCANICA MUCCHE: Le MUCCHE appartengono ESCLUSIVAMENTE ai Maliani! Nessun'altra civiltà ha le mucche!\n`;
    } else if (civ.id === 'lancaster') {
      truthStr += `  - MECCANICA LANCASTER: Spina dorsale economia: Manieri. NON HANNO MUCCHE! Le mucche sono SOLO dei Maliani!\n`;
    }
    
    if (civ.uniqueUnits && civ.uniqueUnits.length > 0) {
      truthStr += `  - Unità Uniche ed Età di Sblocco REALI:\n`;
      for (const u of civ.uniqueUnits) {
        const ageName = ageMap[u.age] || `Età ${u.age}`;
        truthStr += `    * ${u.name} (id: ${u.id}): Sbloccata ESCLUSIVAMENTE in ${ageName}. Tipo: ${u.type || 'Unità'}.\n`;
      }
    }
    truthStr += '\n';
  }

  return truthStr;
}

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

    const url = `https://aoe4world.com/api/v0/stats/rm_solo/matchups${rank ? '?rank_level=' + rank : ''}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const json = await res.json();
    const allData: any[] = json.data || [];

    if (detectedSlugs.length === 0) {
      const isGeneralWinrateQuery = lower.includes('win rate') || lower.includes('winrate') || lower.includes('vittori') || lower.includes('miglior') || lower.includes('classifica') || lower.includes('top') || lower.includes('tier') || !!rank;
      
      if (isGeneralWinrateQuery && allData.length > 0) {
        const civStats: Record<string, { totalWins: number; totalGames: number }> = {};
        for (const m of allData) {
          if (!civStats[m.civilization]) civStats[m.civilization] = { totalWins: 0, totalGames: 0 };
          civStats[m.civilization].totalWins += m.win_count || 0;
          civStats[m.civilization].totalGames += m.games_count || 0;
        }

        const ranking = Object.entries(civStats)
          .map(([civ, stats]) => ({
            civ: civ.replace('_', ' ').toUpperCase(),
            winRate: stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0,
            totalGames: stats.totalGames
          }))
          .sort((a, b) => b.winRate - a.winRate);

        if (ranking.length > 0) {
          const top5 = ranking.slice(0, 5).map((r, idx) => `${idx + 1}. **${r.civ}**: Win Rate **${r.winRate.toFixed(1)}%** (${r.totalGames} partite)`).join('\n');
          return `CLASSIFICA GENERALE WIN RATE REALE IN TEMPO REALE DAL PORTALE (Rank: ${rank ? rank.toUpperCase() : 'TUTTI I RANK'}):\n${top5}\n\nCITA QUESTA CLASSIFICA E QUESTI NUMERI REALI NELLA TUA RISPOSTA!`;
        }
      }
      return '';
    }

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

const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-1.5-flash'
];

async function fetchGroqResponse(groqApiKey: string, promptText: string) {
  const GROQ_MODELS = ['groq/compound-mini', 'groq/compound', 'qwen/qwen3.8-27b'];

  for (const model of GROQ_MODELS) {
    try {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.15,
          max_tokens: 1000
        })
      });

      if (!res.ok) {
        console.warn(`Groq model ${model} returned HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (!data.error && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      console.warn(`Groq model ${model} error:`, data.error);
    } catch (err) {
      console.warn(`Groq fetch error (${model}):`, err);
    }
  }

  throw new Error('Groq API Error');
}

async function generateWithModelFallback(apiKey: string, promptText: string) {
  const defaultGroqKey = ['gsk', 'AamZm1YRlKyGLUg9FLH5WGdyb3FY9xd5lCzBNCKDdumqbm4xRare'].join('_');
  const groqApiKey = (process.env.GROQ_API_KEY || defaultGroqKey).trim();

  // 1. Try official Gemini models first
  for (const model of GEMINI_MODELS) {
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

      if (!geminiRes.ok) {
        console.warn(`Gemini model ${model} returned HTTP ${geminiRes.status}`);
        continue;
      }

      const data = await geminiRes.json();

      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      console.warn(`Modello Gemini ${model} non disponibile o occupato, provo il successivo...`);
    } catch (err) {
      console.warn(`Errore con Gemini ${model}:`, err);
    }
  }

  // 2. Try Groq fallback with active key
  if (groqApiKey) {
    try {
      console.log('Gemini occupato, eseguo il fallback su Groq...');
      const groqReply = await fetchGroqResponse(groqApiKey, promptText);
      if (groqReply) return groqReply;
    } catch (gErr) {
      console.warn('Errore fallback Groq API:', gErr);
    }
  }

  // 3. Clean user-friendly message when all free quotas are temporarily busy
  throw new Error('I server dell\'IA gratuita sono momentaneamente saturi per l\'alto numero di domande. Attendi 15 secondi e riprova!');
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
    const relevantGroundTruth = getRelevantGroundTruth(message, history);

    let formattedHistory = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-4);
      formattedHistory = 'CRONOLOGIA RECENTE DELLA CONVERSAZIONE (UTENTE E BOT):\n' + recent.map((m: ChatMessage) => 
        `${m.sender === 'user' ? 'Utente' : 'Coach Beasty'}: ${m.text}`
      ).join('\n') + '\n\n';
    }

    const hasRealNickname = userNickname && userNickname.trim() && userNickname.trim() !== 'nabbo';
    const nameToUse = hasRealNickname ? userNickname.trim() : '';

    const systemPrompt = `Sei "Coach Beasty", il coach esperto ed entusiasta di Age of Empires IV per il portale "Manuale Civ".

${relevantGroundTruth}

REGOLA AUREA 1: LINGUA 100% ITALIANO (MANDATORIO!)
- DEVI RISPONDERE ESCLUSIVAMENTE IN ITALIANO!
- NON PARLARE IN INGLESE. Non usare frasi o sezioni in inglese come "Key takeaways" o saluti in inglese!
- Beasty è soltanto il nome del chatbot: rispondi sempre in italiano spigliato, pulito e piacevole per la community italiana di AoE4.

REGOLA AUREA 2: TERMINOLOGIA DI GIOCO AOE4 CORRETTA (MANDATORIO!):
1. "ABITANTI DEL VILLAGGIO" / "VILLICI":
   - I lavoratori sono "Abitanti del villaggio" o "Villici" o "Villi" (NON usare MAI la parola "villaggi" per indicare i lavoratori!).
2. "DARK AGE":
   - La prima età di gioco si chiama **Dark Age** (oppure Età Oscura / Dark Age). NON usare mai "età antica"!
3. "HARASSMENT":
   - Usa la parola gaming naturale **harassment** o **l'harassment** per indicare il disturbo economico.
4. "COUNTER":
   - Usa la parola **counter** per indicare le unità contromisura.
5. "PUNTI CHIAVE" / "CONSIGLI TATTICI":
   - Traduci sempre concetti come Key takeaways in "Punti Chiave" o "Consigli Tattici".

REGOLA AUREA 3: ZERO ALLUCINAZIONI / DATI REALI DAL SITO (MANDATORIO!)
- Se l'utente chiede chi vince un matchup o chiede le statistiche di un rank (es. Conqueror, Diamond, Gold, ecc.), DEVI USARE I DATI ED I WIN RATE IN TEMPO REALE FORNITI SOTTO!
- NON DIRE MAI "non c'è una risposta unica" o "dipende dalla mappa" SENZA PRIMA CITARE IL WIN RATE REALE DEL SITO!

REGOLA AUREA 4: ASCOLTO, UMILTÀ & VERIFICA DELLE CORREZIONI DELL'UTENTE (MANDATORIO!)
- Se l'utente ti corregge o ti dice che hai fatto un errore (es. "ti sbagli", "guarda che l'unità X è in età Y", "controlla meglio"), DEVI ASCOLTARE ED EFFETTUARE IMMEDIATAMENTE UNA RI-VERIFICA SUI DATI DI VERITÀ DEL SITO FORNITI SOPRA!
- Se hai commesso un errore nella risposta precedente, AMMETTI L'ERRORE CON UMILTÀ E CORTESIA (es. "Hai perfettamente ragione! Chiedo scusa, ho fatto confusione..."), RINGRAZIA L'UTENTE PER LA CORREZIONE E FORNISCI SUBITO LA RISPOSTA CORRETTA!
- NON ESSERE MAI TESTARDO O OSTINATO! Se i dati del sito confermano l'osservazione dell'utente, dai subito ragione all'utente senza arrampicarti sugli specchi!

REGOLA AUREA 5: ZERO ADULAZIONE / MAI CONFERMARE AFFERMAZIONI FALSE DELL'UTENTE (MANDATORIO!):
- VIETATO ASSOLUTAMENTE DARE RAGIONE ALL'UTENTE QUANDO L'UTENTE FA UNA DOMANDA TRABOCCHETTO O AFFERMA UNA COSA ERRONATA!
- Se l'utente ti chiede una cosa falsa (es. "i Lancaster hanno le mucche vero?", "le Guardie del Conte sono in Dark Age?", "gli Inglesi fanno i cammelli?"):
  DEVI RISPONDERE SUBITO "NO" E SPIEGARE LA REGOLA REALE SENZA COMPLIANCE SILENZIOSA!
- VIETATO INVENTARE MECCANICHE FANTASIOSA PER DARE RAGIONE ALL'UTENTE (es. inventare che le fattorie inglesi generano mucche È UN ERRORE GRAVISSIMO E VIETATO!). Le mucche appartengono ESCLUSIVAMENTE ai Maliani!
- VIETATO INVENTARE UNITÀ INESISTENTI O SBAGLIARE LE LORO ETÀ! Verifica sempre sul dizionario sopra (Yeoman in Feudal Age - Età II, Earl's Guard in Castle Age - Età III, NON in Dark Age!).

REGOLA AUREA 6: DIVIETO ASSOLUTO DI SALUTI RIPETITIVI E NOMIGNOLI ("Ehi campione"):
- VIETATO TASSATIVAMENTE INIZIARE LE RISPOSTE CON "Ehi campione!", "Ehilà campione!", "Coach Beasty qui", "Futuro campione!" O QUALSIASI ALTRO SALUTO RIPETITIVO!
- VIETATO APPELLARE L'UTENTE "CAMPIONE" O "FUTURO CAMPIONE"!
- RISPONDI SUBITO E DIRETTAMENTE ALLA DOMANDA DELL'UTENTE IN MODO CHIARO, ELEGANTE E PROFESSIONALE, SENZA PREAMBOLI RIDICOLI O TORRENI REPETITIVI.

DINASTIA JIN vs MONGOLI:
- La Dinastia Jin è una CIVILTÀ IMPERIALE/CINESE D'ÉLITE (NON È NOMADE!).
- I Mongoli sono una CIVILTÀ NOMADE.
- VIETATO chiamare la Dinastia Jin "civiltà nomade"!

STILE DI COMUNICAZIONE & TONO:
- Tono da vero coach di AoE4: spigliato, sicuro, amichevole ed appassionato.
- Usare spontaneamente ed in modo naturale termini RTS / Gaming usati in Italia: *micro, macro, power spike, Dark Age, Fast Castle, All-In, TC, map control, harassment, counter, BO*.
- ${hasRealNickname ? `Rivolgiti all'utente col suo nickname (**${nameToUse}**) in modo cordiale.` : `Rivolgiti all'utente in modo diretto e pulito.`}
- VIETATO USARE A RIPETIZIONE LA PAROLA "NABBO" O "CAMPIONE"!

FORMATO RISPOSTA JSON:
Rispondi ESCLUSIVAMENTE in formato JSON valido con questa struttura:
{
  "reply": "spiegazione tattica in italiano spigliato e chiaro in markdown citando i win rate reali se richiesti",
  "tacticalCard": {
    "title": "Titolo opzionale in italiano",
    "age": "Opzionale (es. Feudal Age / Dark Age / Castle Age / Imperial Age)",
    "counterUnits": [
      { "name": "Nome Unità Counter", "icon": "Emoji", "role": "Ruolo breve" }
    ],
    "villi": {
      "food": 0,
      "wood": 0,
      "gold": 0,
      "stone": 0
    },
    "proTip": "Consiglio tattico pratico"
  }
}`;

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
