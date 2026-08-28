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

const AOE4_GROUND_TRUTH_UNITS = `
DIZIONARIO DI VERITÀ UFFICIALE CIVILTÀ E UNITÀ DEL PORTALE "MANUALE CIV" (MANDATORIO - TUTTE QUESTE CIVILTÀ ESISTONO SUL SITO):

1. DINASTIA JIN (Jin Dynasty - PRESENTE SUL SITO!):
   - Descrizione: Civiltà nomade e imperiale che domina con la sua cavalleria d'élite e la potenza d'assedio superiore. I Jin eccellono nel controllo della mappa grazie ai villaggi a cavallo e ai tributari che potenziano la loro economia.
   - NON negare MAI l'esistenza della Dinastia Jin! È una civiltà registrata ed attiva sul portale Manuale Civ.

2. DINASTIA MACEDONE (Macedonian Dynasty - PRESENTE SUL SITO!):
   - Descrizione: Civiltà con potente falange, fanteria d'élite e monumenti di conquista.

3. ORDA D'ORO (Golden Horde - PRESENTE SUL SITO!):
   - Descrizione: Variante nomade dominatrice delle steppe con cavalleria d'attacco rapido e tributi.

4. SENGOKU DAIMYO (PRESENTE SUL SITO!):
   - Descrizione: Variante giapponese basata sui feudi dei Daimyo e guerrieri provinciali.

5. CAVALIERI TEMPLARI (Knights Templar - PRESENTE SUL SITO!):
   - Descrizione: Ordine cavalleresco con forte cavalleria pesante, fortezze e bonus di fede.

6. DINASTIA TUGHLAQ (Tughlaq Dynasty - PRESENTE SUL SITO!):
   - Descrizione: Dinastia indiana d'élite focalizzata su elefanti da guerra, fortificazioni ed economia.

7. INGLESI (English - Civiltà Base):
   - Unità uniche: Arcieri Lunghi (Longbowmen).
   - Meccaniche: Rete dei Castelli, Fattorie Enclosures, Centro Città difensivo.
   - Monumenti: Sala del Consiglio (Council Hall), Abbazia del Re, Torre Bianca (White Tower), Palazzo Berkshire.

8. LA CASATA DI LANCASTER (Lancaster - Civiltà Variante degli Inglesi):
   - Unità uniche: **Yeoman** (Arcieri Yeoman con abilità Synchronized Shot / Tiro Sincronizzato), Lord of Lancaster, Nobili Lancaster.
   - Meccaniche: Manieri (Manors), Tassazione dei Manieri.
   - Monumenti: Castello di Lancaster (Lancaster Castle).
   - Gli Yeoman ESISTONO e sono gli arcieri unici dei Lancaster!

9. FRANCESI (French - Civiltà Base):
   - Unità uniche: Cavalieri Reali (Royal Knights), Arbalétrier, Galea da Guerra Cannoniera.
   - Meccaniche: produzione villi più veloce ad ogni età, centri commerciali scontati.

10. GIOVANNI D'ARCO (Jeanne d'Arc - Civiltà Variante dei Francesi):
    - Unità uniche: Giovanni d'Arco (Eroe con livelli/abilità), Compagni di Giovanni, Cavalieri Reali.

11. OTTOMANI (Ottomans):
    - Unità uniche: Giannizzeri (Janissaries), Sipahi, Grande Bombarda (Great Bombard), Mehter (Tamburino).
    - Meccaniche: Scuole Militari (produzione truppe gratuita), Sistema di Vizir.

12. BISANTINI (Byzantines):
    - Unità uniche: Catrafatti (Cataphracts), Varangiani (Varangian Guard), Cheirosiphon (Lanciafiamme d'assedio).
    - Meccaniche: Cisterne d'Acqua & Acquedotti (Oliva/Olio), Mercenari da diverse civiltà.

13. SACRO ROMANO IMPERO (HRE - Holy Roman Empire):
    - Unità uniche: Landsknecht, Prelato (Ispira villi ed esercito).
    - Meccaniche: Influenza dei Castelli/Cattedrali, Reliquie negli edifici per difesa e oro.

14. ORDINE DEL DRAGO (Order of the Dragon - Civiltà Variante SRI):
    - Unità uniche: Unità Gildate (Arcieri Gildati, Picchieri Gildati, Ussari Gildati, Landsknecht Gildato).

15. MONGOLI (Mongols):
    - Unità uniche: Mangudai, Khan (con frecce di segnalazione).
    - Meccaniche: Edifici mobili, Ovoo (estrazione pietra doppia), Pascolo, Piattaforme di Segnalazione Yam.

16. CINESI (Chinese):
    - Unità uniche: Zhuge Nu (Arbalestiere a ripetizione), Guardia di Palazzo, Speziere (Neshuten), Bombarde dei Fuochi d'Artificio.
    - Meccaniche: Sistema delle Dinastie (Tang, Song, Yuan, Ming), Funzionari Imperiali (riscossione tasse/supervisione).

17. EREDITÀ DI ZHU XI (Zhu Xi's Legacy - Civiltà Variante dei Cinesi):
    - Unità uniche: Zhuge Nu Gildati, Guardie Imperiali, Medici Shaolin.

18. GIAPPONESI (Japanese):
    - Unità uniche: Samurai, Shinobi, Yumi Mounted Archers, Onna-Bugeisha, Mounted Samurai.
    - Meccaniche: Forgia/Fattoria potenziata (Kura Storehouse), Banner di Clan (Katamoto).

19. MALIANI (Malians):
    - Unità uniche: Donso (Giavellotto anti-cavalleria), Musofadi (Guerriere invisibili con pugnale), Giavellottisti, Sofa (Cavalieri leggeri).
    - Meccaniche: Miniere d'Oro aperte (Open Pit Mine), Allevamento dei Bovini, Rete di Caccia.

20. SULTANATO DI DELHI (Delhi Sultanate):
    - Unità uniche: Elefanti da Guerra, Elefanti con Torre, Gazi Raider, Saggio (Scholar).
    - Meccaniche: Tecnologie GRATUITE (velocizzate dai Saggi nelle Moschee).

21. RUS (Rus):
    - Unità uniche: Strel'cy (Streltsy - Archibugieri), Monaci Guerrieri (Warrior Monks), Cavallo Boyaro.
    - Meccaniche: Cabine da Caccia (Bounty System da animali selvatici), Fortini in legno.

22. AYUBIDI (Ayyubids - Civiltà Variante degli Abbasidi):
    - Unità uniche: Cavalieri su Cammello, Arcieri su Cammello, Derviscio, Atabeg.
    - Meccaniche: Casa della Sapienza con Ala Militare/Economica/Culturale focalizzata.
`;

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
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite'
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
            temperature: 0.2,
            topP: 0.8,
            topK: 30
          }
        })
      });

      const data = await geminiRes.json();

      if (geminiRes.status === 429 || data.error?.code === 429 || data.error?.message?.includes('quota') || data.error?.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`Modello ${model} in quota limit (429), tento il modello successivo...`);
        lastErrorMsg = 'Limite di richieste dell\'API gratuita raggiunto. Attendi qualche secondo e riprova!';
        // Brief delay before trying fallback model
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      if (data.error) {
        throw new Error(`Gemini API Error (${model}): ${data.error.message}`);
      }

      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resultText) return resultText;
    } catch (err: any) {
      lastErrorMsg = err.message || 'Errore durante la generazione';
    }
  }

  throw new Error(lastErrorMsg || 'Tutti i modelli IA sono momentaneamente occupati. Riprova tra poco!');
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

    // Keep history pruned to ONLY the last 2 turns (4 messages max) to keep payload small & avoid API rate limit freezes
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

REGOLA AUREA ED INFLESSIBILE: ZERO ALLUCINAZIONI / ZERO INVENZIONI (MANDATORIO!)
- NON inventare MAI notizie, strategie, unità, statistiche o civiltà! Tutte le civiltà elencate sopra (inclusa la **Dinastia Jin**, **Dinastia Macedone**, **Orda d'Oro**, **Sengoku Daimyo**, **Cavalieri Templari**, **Dinastia Tughlaq**) ESISTONO sul portale Manuale Civ!
- SE NON SAI UNA COSA O NON HAI IL DATO CERTO NEL DIZIONARIO DI VERITÀ:
  - NON inventare MAI risposte o nomi di fantasia per sembrare sapiente!
  - Ammetti con totale trasparenza ed umiltà di non avere quel dato specifico a portata di mano.
  - Chiedi scusa all'utente (es: "Purtroppo non ho questo dato specifico a portata di mano, mi spiace! Se tu hai la risposta o la guida giusta fammela sapere così la integriamo per la community!").

STILE DI COMUNICAZIONE & REGOLAZIONE DEL TONO (FONDAMENTALE):
1. TONO PULITO, NATURALE E PROFESSIONALE:
   - Parla come un coach esperto, amichevole e competente.
   - **LIMITA I TERMINI GAMER/NERD**: NON usare troppi termini da streamer o da gamer in ogni frase! Evita di risultare ridicolo o forzato. Usa un italiano naturale, pulito e chiaro.
2. NOME UTENTE E GESTIONE TERMINE "NABBO":
   - ${hasRealNickname ? `Rivolgiti all'utente con il suo nickname (**${nameToUse}**) con naturalezza.` : `Rivolgiti all'utente in modo amichevole e cordiale senza usare etichette.`}
   - **VIETATO USARE A RIPETIZIONE LA PAROLA "NABBO"!** NON usare mai la parola "nabbo" di continuo o in modo insistente. Tratta tutti gli utenti con amichevolezza e rispetto.
3. DIVIETO FRASI DA ROBOT / IA:
   - NON usare MAI frasi robotiche tipo "La mia memoria si sta affinando", "Grazie per la correzione", "Come intelligenza artificiale...".
   - NON usare MAI simboli di intestazione markdown (#, ##, ###).

4. TERMINOLOGIA FISSA AOE4:
   - VIETATA la parola "villici"! Usa ESCLUSIVAMENTE "villi" o "abitanti".
   - Esploratore: si chiama "esploratore".
   - "cibo", "legna", "oro", "pietra", "centro città", "monumento".
   - Edifici: "caserma", "stalla" (mai 'stabile'), "poligono di tiro" o "arceria", "officina d'assedio".

5. FORMATO RISPOSTA JSON:
   Rispondi ESCLUSIVAMENTE in formato JSON valido con questa struttura:
   {
     "reply": "spiegazione tattica spigliata, simpatica e chiara in markdown",
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

    // Generate response with model fallback handling 429 quotas gracefully
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
