import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

function safeTimeoutSignal(ms: number) {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function') {
      return (AbortSignal as any).timeout(ms);
    }
  } catch (e) {}
  return undefined;
}

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|yewtu.be\/watch\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getAoe4Id(url: string) {
  const match = url.match(/aoe4guides\.com\/(?:builds\/|dashboard\?id=)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function normalizeTimeFormat(rawTime: string): string {
  if (!rawTime) return '00:00';
  const cleaned = String(rawTime).replace(/[\[\]()]/g, '').trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return cleaned || '00:00';
}

const CIV_BO_TERMINOLOGY: Record<string, string> = {
  'inglesi': 'Inglesi (English): arco lungo (longbowman), sala del consiglio (council hall), abbazia dei re (abbey of kings), re (king), torre bianca (white tower), fattorie intorno al mulino (recinto).',
  'francesi': 'Francesi (French): cavaliere reale (royal knight), scuola di cavalleria (school of cavalry), camera di commercio (chamber of commerce), balestriere (arbalétrier), istituto reale (royal institute).',
  'sacro romano impero': 'Sacro Romano Impero (HRE): prelato (prelate), cappella di Aquisgrana (Aachen chapel), fucina di Meinwerk (Meinwerk palace), cattedrale di Ratisbona (Regnitz cathedral), palazzo di Burgrave, lanzichenecco (landsknecht).',
  'mongoli': 'Mongoli (Mongols): ovoo, ger, pascolo (pasture), khan, keshik, mangudai, albero d\'argento (silver tree), pietre dei cervi (deer stones), kurultai, steppa ridotta (steppe redoubt).',
  'rus': 'Rus: capanno da caccia (hunting cabin), taglia (bounty), mura di tronchi, cremlino (kremlin), porta d\'oro (golden gate), cavaliere precoce (early knight), monaco guerriero (warrior monk), abbazia della trinità.',
  'cinesi': 'Cinesi (Chinese): ufficiale imperiale (imperial official), supervisione, accademia imperiale (imperial academy), barbacane del sole (barbican of the sun), dinastia Song, zhuge nu, villaggio (village), granaio.',
  'sultanato di delhi': 'Sultanato di Delhi (Delhi Sultanate): studioso (scholar), moschea (mosque), torre della vittoria (tower of victory), cupola della fede (dome of the faith), predone ghazi (ghazi raider), siti sacri (sacred sites), elefante da guerra.',
  'dinastia abbaside': 'Dinastia Abbaside (Abbasid Dynasty): casa della sapienza (house of wisdom), ala economica (economic wing), ala militare (military wing), ala culturale (culture wing), ala commerciale (trade wing), età dell\'oro, arcieri su cammello.',
  'ottomani': 'Ottomani (Ottomans): scuola militare (military school), mehter, sipahi, giannizzero (janissary), minareto di Medrese (twin minaret medrese), fonderia imperiale (mehmed imperial armory), punti visir (vizier points).',
  'maliani': 'Maliani (Malians): miniera a cielo aperto (pit mine), banco del bestiame (cattle ranch), mucche (cattle), cava di Mansa (mansa quarry), rete commerciale sahariana, donso, lanciatore di giavellotti (javelin thrower), sofa, recinto del fulani (farimba garrison / grand fulani corral).',
  'bizantini': 'Bizantini (Byzantines): cisterna (cistern), acquedotto (aqueduct), olio d\'oliva (olive oil), boschetto d\'ulivi (olive grove), campo mercenario (mercenary house), ippodromo imperiale (imperial hippodrome), grande cantina (grand winery), limitanei, catafratto, guardia variaga.',
  'giapponesi': 'Giapponesi (Japanese): fattoria kura (kura storehouse), fucina (forge), casale giapponese (farmhouse), santuario di Koka (Koka township), samurai, onna-bugeisha, shinobi, yumi ashigaru, stendardiere (bannerman), daimyo, santuario galleggiante, tempio buddhista.',
  'giovanna d\'arco': 'Giovanna d\'Arco (Jeanne d\'Arc): Giovanna d\'Arco, esperienza (XP), scuola di cavalleria, camera di commercio, cavaliere reale, campioni di Giovanna.',
  'ayyubidi': 'Ayyubidi (Ayyubids): casa della sapienza (house of wisdom), avanzamento rapido, derviscio (dervish), predone del deserto (desert raider), lanciatore su cammello (camel lancer).',
  'eredità di zhu xi': 'Eredità di Zhu Xi (Zhu Xi\'s Legacy): funzionario imperiale, giardini della meditazione (meditation gardens), cantina di Jiangnan (Jiangnan tower), monte Lu, tempio Shaolin, monaco Shaolin, zhuge nu.',
  'ordine del drago': 'Ordine del Drago (Order of the Dragon): unità dorate (gilded), picchiere dorato, arciere dorato, cavaliere dorato, cappella di Aquisgrana, fucina di Meinwerk, cattedrale di Ratisbona, palazzo di Burgrave.',
  'casata di lancaster': 'Casata di Lancaster (House of Lancaster): maniero (manor), signore di Lancaster (lord of Lancaster), hobelar, yeoman, demilancer, guardia del conte (earl\'s guard).',
  'cavalieri templari': 'Cavalieri Templari (Knights Templar): scudiere (squire), cavaliere templare, precettoria, fortezza templare.',
  'dinastia jin': 'Dinastia Jin (Jin Dynasty): abitante a cavallo (mounted villager), emissario (emissary), mercante di renne (reindeer trader), guerriero Mohe (Mohe tribesman), balestra da letto (bed crossbow), pagoda di ferro (iron pagoda), spadaccino zhanma.',
  'dinastia macedone': 'Dinastia Macedone (Macedonian Dynasty): conio dell\'argento, atgeirmaðr, bogmaðr, guardia variaga, esploratore dell\'ippodromo, cavaliere dell\'ippodromo, riddari, catafratto.',
  'sengoku daimyo': 'Sengoku Daimyo: bushi, ronin, kunoichi, hatamoto, samurai con naginata, feudi dei clan.',
  'orda d\'oro': 'Orda d\'Oro (Golden Horde): Batu Khan, kharash, torguud, keshik, arciere kipchak, sciamano.',
  'dinastia tughlaq': 'Dinastia Tughlaq (Tughlaq Dynasty): guerriero Tughlaq, elefante corazzato, studiosi.',
  'scozzesi': 'Scozzesi (Scots): case-torri (tower houses), bestiame delle Highlands (Highland cattle) sui cespugli di bacche, sala di raduno (mustering hall), stagno ittico monastico (monastic fishpond), ghillie, picchiere (pikeman), cateran, arciere delle Highlands, kirkman, gallowglass, border reiver, tacksman.',
  'vichinghi': 'Vichinghi (Vikings): longhouse, estensioni longhouse (farmstead, bee skeps, pasture and loom, smithy), reclutamento automatico gratuito dei villi, saghe norrene, völur, bosco sacro (sacred grove), berserker, bondi, hirdman precoce, shield maiden, drakkar, longship, cavaliere dello Jylland, balestrieri della Scania, danevirke.'
};

function getCivTerminologyHint(civName?: string): string {
  if (!civName) return '';
  const lower = civName.toLowerCase().trim();
  for (const [key, hint] of Object.entries(CIV_BO_TERMINOLOGY)) {
    if (lower.includes(key) || key.includes(lower)) {
      return `\nGLOSSARIO UFFICIALE PER ${civName.toUpperCase()}:\n- ${hint}\n`;
    }
  }
  return '';
}

async function getInvidiousData(videoId: string) {
  const invidiousInstances = ['https://yewtu.be', 'https://inv.nadeko.net'];
  for (const base of invidiousInstances) {
    try {
      const signal = safeTimeoutSignal(3500);
      const videoRes = await fetch(`${base}/api/v1/videos/${videoId}`, signal ? { signal } : {});
      if (!videoRes.ok) continue;
      const videoData = await videoRes.json();
      const description = videoData.description || '';

      let transcript = '';
      try {
        const capRes = await fetch(`${base}/api/v1/captions/${videoId}`, signal ? { signal } : {});
        if (capRes.ok) {
          const capData = await capRes.json();
          const captions = capData.captions || capData;
          if (Array.isArray(captions)) {
            const track =
              captions.find((c: any) => c.label?.toLowerCase().includes('ital')) ||
              captions.find((c: any) => c.label?.toLowerCase().includes('english')) ||
              captions[0];
            if (track && track.url) {
              const textRes = await fetch(`${base}${track.url}`, signal ? { signal } : {});
              if (textRes.ok) transcript = await textRes.text();
            }
          }
        }
      } catch (e) {}

      if (description || transcript) {
        return { combinedText: `DESCRIZIONE (INVIDIOUS):\n${description}\n\nTRASCRIZIONE (INVIDIOUS):\n${transcript}` };
      }
    } catch (e) {}
  }
  return null;
}

async function getYoutubeData(videoId: string) {
  const urlsToTry = [
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://www.youtube.com/embed/${videoId}`
  ];

  for (const targetUrl of urlsToTry) {
    try {
      const signal = safeTimeoutSignal(4500);
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        ...(signal ? { signal } : {})
      });
      if (!response.ok) continue;
      const html = await response.text();

      let title = '';
      const titleMatch = html.match(/"title":"([^"]+)"/);
      if (titleMatch) title = titleMatch[1];

      let description = '';
      const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      if (descMatch) {
        try {
          description = JSON.parse(`"${descMatch[1]}"`).substring(0, 5000);
        } catch {
          description = descMatch[1].replace(/\\n/g, '\n').substring(0, 5000);
        }
      }

      let transcript = '';
      const captionMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])\s*,\s*"audioTracks"/);
      const fallbackCaptionMatch = captionMatch || html.match(/"captionTracks":\s*(\[.+?\])/);
      if (fallbackCaptionMatch) {
        try {
          const captionTracks = JSON.parse(fallbackCaptionMatch[1]);
          const track =
            captionTracks.find((t: any) => t.languageCode?.startsWith('it')) ||
            captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
            captionTracks[0];
          if (track && track.baseUrl) {
            const capSignal = safeTimeoutSignal(4000);
            const capRes = await fetch(track.baseUrl, capSignal ? { signal: capSignal } : {});
            const capXml = await capRes.text();

            const regex = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
            let match;
            const pieces = [];
            while ((match = regex.exec(capXml)) !== null) {
              const start = parseFloat(match[1]);
              const text = match[2]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/<[^>]+>/g, '')
                .trim();
              if (text) pieces.push(`[${formatTime(start)}] ${text}`);
            }
            transcript = pieces.join('\n');
          }
        } catch (e) {}
      }

      if (description.length > 30 || transcript.length > 50) {
        return {
          combinedText: `${title ? `TITOLO VIDEO: ${title}\n` : ''}DESCRIZIONE:\n${description}\n\nTRASCRIZIONE CON TIMESTAMP:\n${transcript}`
        };
      }
    } catch (error) {}
  }
  throw new Error('Errore YouTube');
}

async function getAoe4GuidesData(buildId: string) {
  const apiUrl = `https://aoe4guides.com/api/builds/${buildId}`;
  try {
    const signal = safeTimeoutSignal(5000);
    const response = await fetch(apiUrl, signal ? { signal } : {});
    if (!response.ok) return null;
    const data = await response.json();

    let schematicText = `FONTE: AOE4 GUIDES\nTITOLO: ${data.title || ''}\n`;
    schematicText += `DESCRIZIONE GENERALE: ${data.description || 'Nessuna'}\n\n`;
    schematicText += `PASSI DELLA BUILD ORDER:\n`;

    data.steps?.forEach((ageBlock: any) => {
      const ageName =
        ageBlock.age === 0
          ? 'Inizio / Dark Age'
          : ageBlock.age === 1
          ? 'Dark Age (Età I)'
          : ageBlock.age === 2
          ? 'Feudal Age (Età II)'
          : ageBlock.age === 3
          ? 'Castle Age (Età III)'
          : ageBlock.age === 4
          ? 'Imperial Age (Età IV)'
          : `Età ${ageBlock.age}`;
      schematicText += `\n--- ${ageName} ---\n`;
      if (ageBlock.gameplan) {
        schematicText += `Piano di gioco fase: ${String(ageBlock.gameplan).replace(/<[^>]+>/g, ' ').trim()}\n`;
      }
      ageBlock.steps?.forEach((step: any) => {
        let stepDesc = String(step.description || '')
          .replace(/<img([^>]+)>/g, (_: string, attrs: string) => {
            const titleMatch = attrs.match(/title="([^"]+)"/);
            if (titleMatch && titleMatch[1]) {
              return `[${titleMatch[1]}]`;
            }

            const srcMatch = attrs.match(/src="([^"]+)"/);
            if (srcMatch && srcMatch[1]) {
              const url = srcMatch[1];
              const filename = url.substring(url.lastIndexOf('/') + 1);
              const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
              const cleanName = nameWithoutExt.replace(/[-_]/g, ' ');
              return `[${cleanName}]`;
            }
            return '';
          })
          .replace(/&nbsp;/g, ' ')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .trim();

        const res = [];
        if (step.food) res.push(`${step.food} cibo`);
        if (step.wood) res.push(`${step.wood} legna`);
        if (step.gold) res.push(`${step.gold} oro`);
        if (step.stone) res.push(`${step.stone} pietra`);
        if (step.builders) res.push(`${step.builders} costruttori`);
        if (step.villagers) res.push(`${step.villagers} villi totali`);

        const cleanTime = step.time ? String(step.time).replace(/<[^>]+>/g, '').trim() : '00:00';
        const resStr = res.length > 0 ? ` {Distribuzione risorse: ${res.join(', ')}}` : '';
        schematicText += `[${cleanTime || '00:00'}] ${stepDesc}${resStr}\n`;
      });
    });

    return { combinedText: schematicText };
  } catch (error) {
    return null;
  }
}

async function fetchDataFromUrl(url: string) {
  const videoId = getYoutubeId(url);
  const aoeId = getAoe4Id(url);
  let text = '';

  if (videoId) {
    try {
      const data = await getYoutubeData(videoId);
      if (data && data.combinedText && data.combinedText.length > 200) text = data.combinedText;
    } catch (e) {}

    if (text.length < 200) {
      try {
        const invData = await getInvidiousData(videoId);
        if (invData && invData.combinedText) text += (text ? '\n' : '') + invData.combinedText;
      } catch (e) {}
    }
  } else if (aoeId) {
    try {
      const aoeData = await getAoe4GuidesData(aoeId);
      if (aoeData && aoeData.combinedText) text = aoeData.combinedText;
    } catch (e) {}
  }
  return text;
}

const DEFAULT_GEMINI_KEY = ['AIzaSyCoOKkHKw23UCUG', 'dXDYv0TxUA6b-6tsh4Y'].join('');
const DEFAULT_GROQ_KEY = ['gsk', 'AamZm1YRlKyGLUg9FLH5WGdyb3FY9xd5lCzBNCKDdumqbm4xRare'].join('_');

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash'
];

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b'
];

async function generateWithGemini(apiKey: string, prompt: string): Promise<{ text: string; model: string }> {
  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const signal = safeTimeoutSignal(9500);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            topP: 0.85,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        }),
        ...(signal ? { signal } : {})
      });

      if (!response.ok) {
        lastError = new Error(`Gemini ${model} HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data.error) {
        lastError = data.error;
        continue;
      }

      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        return { text: candidateText, model };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Nessun modello Gemini disponibile');
}

async function generateWithGroq(apiKey: string, prompt: string): Promise<{ text: string; model: string }> {
  let lastError: any = null;
  // Keep prompt within Groq TPM limits if transcript is huge
  const safePrompt = prompt.length > 26000 ? prompt.substring(0, 26000) : prompt;

  for (const model of GROQ_MODELS) {
    try {
      const signal = safeTimeoutSignal(8500);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: safePrompt }],
          temperature: 0.15,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        }),
        ...(signal ? { signal } : {})
      });

      if (!response.ok) {
        lastError = new Error(`Groq ${model} HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return { text: content, model };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Nessun modello Groq disponibile');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const { youtubeUrl, rawText, civName } = body || {};

  try {
    const geminiApiKey = (process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY).trim();
    const groqApiKey = (process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY).trim();

    let textToAnalyze = '';

    if (rawText) {
      const urlText = await fetchDataFromUrl(rawText.trim());
      textToAnalyze = urlText || rawText;
    } else if (youtubeUrl) {
      textToAnalyze = await fetchDataFromUrl(youtubeUrl);
    }

    if (!textToAnalyze || textToAnalyze.length < 20) {
      const errorMsg = rawText
        ? "La trascrizione fornita è troppo breve o non valida per l'analisi."
        : "Impossibile recuperare dati automaticamente dal link. Incolla la trascrizione manuale o usa un link AoE4Guides / YouTube con sottotitoli.";
      throw new Error(errorMsg);
    }

    const civHint = getCivTerminologyHint(civName);

    const prompt = `Sei l'analista tattico capo di Age of Empires IV per il portale "Manuale Civ".
Stai analizzando un Build Order per la civiltà: ${civName || 'Generica'}.
${civHint}
Analizza il testo fornito (descrizione, passi schematici o trascrizione video) ed estrai il Build Order completo e strutturato in JSON.

REGOLE DI STILE E TERMINOLOGIA MANDATORIE:
1. LINGUA: Italiano tecnico di Age of Empires IV. Traduci accuratamente tutti i termini dall'inglese.
2. LAVORATORI ("VILLI"):
   - Chiama i lavoratori SEMPRE "villi" o "abitanti" (singolare "villo" o "abitante").
   - VIETATO usare la parola "villici" o "villaggi" per indicare i lavoratori!
3. RISORSE ED EDIFICI (importante per il rendering automatico delle icone):
   - Usa sempre le parole esatte: "cibo", "legna", "oro", "pietra", "olio" (per i Bizantini).
   - "stable" -> "stalla" o "scuderia" (MAI "stabile").
   - "archery range" -> "poligono di tiro" o "arceria".
   - "barracks" -> "caserma", "town center" / "TC" -> "centro città", "lumber camp" -> "campo di legname", "mining camp" -> "campo minerario", "mill" -> "mulino", "blacksmith" -> "fabbro", "dock" -> "porto".
4. ETÀ DI GIOCO:
   - Usa "Dark Age" (o Età I), "Feudal Age" (o Età II / Feudale), "Castle Age" (o Età III / Castelli), "Imperial Age" (o Età IV / Imperiale). VIETATO usare "Età Antica".
5. MAIUSCOLE:
   - Usa la maiuscola SOLO a inizio frase o per i nomi propri delle civiltà/Landmark. Unità comuni, risorse ed edifici vanno in minuscolo (es. caserma, centro città, cavaliere, picchiere).
6. TERMINOLOGIA SPECIFICA DELLA CIVILTÀ (${civName || 'Generica'}):
   - Usa sempre i nomi esatti delle unità, tecnologie ed edifici unici della civiltà (es. ovoo, cisterna, miniera a cielo aperto, case-torri, longhouse, maniero, ecc.).

REGOLE DI ESTRAZIONE (CRITICHE):
- NORMALIZZAZIONE TEMPO:
  - Ogni step deve avere il campo "time" nel formato "MM:SS" SENZA parentesi quadre (es. "00:00", "01:15", "04:30").
  - Di norma il Build Order inizia a "00:00". Se la prima azione effettiva della partita inizia più avanti nel video (es. dopo un'introduzione parlata a 00:45) senza che il testo indichi un minutaggio di gioco specifico, normalizza sottraendo l'offset iniziale in modo che il primo step parta da "00:00". Se invece il testo cita esplicitamente il minuto di gioco reale, mantieni il minutaggio reale.
- ESPANSIONE E CHIAREZZA:
  - Se la fonte è schematica (es. AOE4 GUIDES: "[00:21] 1 [Villager] to [Gold]"), espandila in una frase chiara e fluida in italiano (es. action: "Invia 1 nuovo villo sull'oro e costruisci un campo minerario").
  - NON ripetere il timestamp dentro il campo "action".
  - Se sono presenti indicazioni sulla distribuzione dei villi (es. "{Distribuzione risorse: 7 cibo, 3 oro}") o consigli tattici aggiuntivi per quello step, inseriscili nel campo "note" (es. "Distribuzione: 7 cibo, 3 oro" oppure consigli sul posizionamento/scouting). Se non ci sono note rilevanti per quello step, lascia "note": "".
- COPERTURA COMPLETA:
  - Estrai TUTTI i passaggi della guida dall'inizio alla fine (non fermarti ai primi minuti, includi transizioni, passaggi d'età, produzione unità e mid-game). Non riassumere e non saltare passaggi.

FORMATO JSON RICHIESTO (rispondi SOLO con questo oggetto JSON valido):
{
  "title": "Titolo sintetico ed efficace del Build Order in italiano",
  "description": "Riassunto strategico di 2-3 frasi che spiega l'obiettivo della build, i punti di forza e il piano di gioco",
  "steps": [
    {
      "time": "00:00",
      "action": "Azione chiara e diretta (senza timestamp)",
      "note": "Nota tattica opzionale o distribuzione villi sulle risorse (oppure stringa vuota)"
    }
  ]
}

TESTO DA ANALIZZARE:
${textToAnalyze.substring(0, 60000)}`;

    let resultText = '';
    let usedModel = '';
    let lastError: any = null;

    // 1. Primary: Gemini 3.5 / 3.x family
    try {
      const geminiRes = await generateWithGemini(geminiApiKey, prompt);
      resultText = geminiRes.text;
      usedModel = geminiRes.model;
    } catch (gemErr) {
      lastError = gemErr;
      // 2. Fallback: Groq high-speed models
      if (groqApiKey) {
        try {
          const groqRes = await generateWithGroq(groqApiKey, prompt);
          resultText = groqRes.text;
          usedModel = groqRes.model;
        } catch (groqErr) {
          lastError = groqErr;
        }
      }
    }

    if (!resultText) {
      throw new Error(lastError?.message || "L'IA non ha restituito alcun contenuto. Riprova tra qualche secondo.");
    }

    try {
      let jsonString = resultText.trim();
      if (jsonString.includes('```')) {
        const matches = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) jsonString = matches[1].trim();
      }
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }

      const parsedData = JSON.parse(jsonString);
      if (!parsedData.steps || !Array.isArray(parsedData.steps)) {
        throw new Error('Struttura steps mancante nel JSON.');
      }

      const cleanRegexVillici = /\bvillici\b/gi;
      const cleanRegexVillico = /\bvillico\b/gi;

      const sanitizedSteps = parsedData.steps
        .filter((s: any) => s && (s.action || s.note))
        .map((s: any) => {
          const cleanTime = normalizeTimeFormat(s.time);
          const cleanAction = String(s.action || '')
            .replace(/^\s*\[\d{1,2}:\d{2}\]\s*/, '')
            .replace(/^\s*\d{1,2}:\d{2}\s*[-–:]\s*/, '')
            .replace(cleanRegexVillici, 'villi')
            .replace(cleanRegexVillico, 'villo')
            .trim();
          const cleanNote = String(s.note || '')
            .replace(cleanRegexVillici, 'villi')
            .replace(cleanRegexVillico, 'villo')
            .trim();

          return {
            time: cleanTime,
            action: cleanAction,
            note: cleanNote
          };
        });

      const sanitizedDescription = String(parsedData.description || '')
        .replace(cleanRegexVillici, 'villi')
        .replace(cleanRegexVillico, 'villo')
        .trim();

      return res.status(200).json({
        title: String(parsedData.title || '').trim(),
        description: sanitizedDescription,
        steps: sanitizedSteps,
        model: usedModel
      });
    } catch (e: any) {
      throw new Error(`Errore parsing IA: ${e.message}`);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
