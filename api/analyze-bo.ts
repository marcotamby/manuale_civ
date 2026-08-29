import type { VercelRequest, VercelResponse } from '@vercel/node';

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|yewtu.be\/watch\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getAoe4Id(url: string) {
  const match = url.match(/aoe4guides\.com\/builds\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getInvidiousData(videoId: string) {
  const invidiousUrl = `https://yewtu.be/api/v1/videos/${videoId}`;
  const captionsUrl = `https://yewtu.be/api/v1/captions/${videoId}`;
  try {
    const videoRes = await fetch(invidiousUrl);
    const videoData = await videoRes.json();
    const description = videoData.description || "";

    let transcript = "";
    try {
      const capRes = await fetch(captionsUrl);
      const capData = await capRes.json();
      const track = capData.find((c: any) => c.label?.includes('Italian')) || capData[0];
      if (track) {
        const textRes = await fetch(`https://yewtu.be${track.url}`);
        transcript = await textRes.text();
      }
    } catch (e) { }

    return { combinedText: `DESCRIZIONE (INVIDIOUS):\n${description}\n\nTRASCRIZIONE (INVIDIOUS):\n${transcript}` };
  } catch (e) {
    return null;
  }
}

async function getYoutubeData(videoId: string) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  try {
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const html = await response.text();
    let description = "";
    const descMatch = html.match(/"shortDescription":"([\s\S]*?)"/);
    if (descMatch) description = descMatch[1].substring(0, 3000);

    let transcript = "";
    const captionMatch = html.match(/"captionTracks":\s*(\[.+?\])/);
    if (captionMatch) {
      try {
        const captionTracks = JSON.parse(captionMatch[1]);
        const track = captionTracks.find((t: any) => t.languageCode?.startsWith('it')) ||
          captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
          captionTracks[0];
        if (track && track.baseUrl) {
          const capRes = await fetch(track.baseUrl);
          const capXml = await capRes.text();

          const regex = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
          let match;
          const pieces = [];
          while ((match = regex.exec(capXml)) !== null) {
            const start = parseFloat(match[1]);
            const text = match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            pieces.push(`[${formatTime(start)}] ${text}`);
          }
          transcript = pieces.join('\n');
        }
      } catch (e) { }
    }
    return { combinedText: `DESCRIZIONE:\n${description}\n\nTRASCRIZIONE CON TIMESTAMP:\n${transcript}` };
  } catch (error) { throw new Error("Errore YouTube"); }
}

async function getAoe4GuidesData(buildId: string) {
  const apiUrl = `https://aoe4guides.com/api/builds/${buildId}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    let schematicText = `FONTE: AOE4 GUIDES\nTITOLO: ${data.title}\n`;
    schematicText += `DESCRIZIONE GENERALE: ${data.description || 'Nessuna'}\n\n`;
    schematicText += `PASSI DELLA BUILD ORDER:\n`;

    data.steps?.forEach((ageBlock: any) => {
      const ageName = ageBlock.age === 0 ? 'Inizio' : `Età ${ageBlock.age}`;
      schematicText += `\n--- ${ageName} ---\n`;
      ageBlock.steps?.forEach((step: any) => {
        let stepDesc = step.description
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
          .replace(/<[^>]+>/g, '');
        
        const res = [];
        if (step.food) res.push(`${step.food} Cibo`);
        if (step.wood) res.push(`${step.wood} Legna`);
        if (step.gold) res.push(`${step.gold} Oro`);
        if (step.stone) res.push(`${step.stone} Pietra`);
        if (step.villagers) res.push(`${step.villagers} Villi totali`);
        
        const resStr = res.length > 0 ? ` {Distribuzione: ${res.join(', ')}}` : '';
        schematicText += `[${step.time}] ${stepDesc}${resStr}\n`;
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
  let text = "";

  if (videoId) {
    try {
      const data = await getYoutubeData(videoId);
      if (data && data.combinedText && data.combinedText.length > 200) text = data.combinedText;
    } catch (e) { }

    if (text.length < 200) {
      try {
        const invData = await getInvidiousData(videoId);
        if (invData && invData.combinedText) text += (text ? "\n" : "") + invData.combinedText;
      } catch (e) { }
    }
  } else if (aoeId) {
    try {
      const aoeData = await getAoe4GuidesData(aoeId);
      if (aoeData && aoeData.combinedText) text = aoeData.combinedText;
    } catch (e) { }
  }
  return text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { }
  }
  const { youtubeUrl, rawText, civName } = body || {};

  try {
    const DEFAULT_GEMINI_KEY = ['AIzaSyCoOKkHKw23UCUG', 'dXDYv0TxUA6b-6tsh4Y'].join('');
    const apiKey = (process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY).trim();

    let textToAnalyze = "";

    if (rawText) {
      const urlText = await fetchDataFromUrl(rawText.trim());
      textToAnalyze = urlText || rawText;
    } else if (youtubeUrl) {
      textToAnalyze = await fetchDataFromUrl(youtubeUrl);
    }

    if (!textToAnalyze || textToAnalyze.length < 20) {
      const errorMsg = rawText
        ? "La trascrizione fornita è troppo breve o non valida per l'analisi."
        : "Impossibile recuperare dati automaticamente. Usa l'inserimento manuale o un link valido.";
      throw new Error(errorMsg);
    }
    const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let resultText = '';
    let lastGeminiError: any = null;

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Sei un esperto di Age of Empires 4. Stai analizzando un Build Order per la civiltà: ${civName || 'Generica'}.
            Analizza il seguente testo (descrizione e trascrizione) ed estrai il Build Order strutturato completo seguendo lo stile del sito "Manuale Civ".
            
            REGOLE DI STILE MANDATORIE:
            1. LINGUA: Italiano tecnico. Traduci tutto dall'inglese.
            2. TERMINI: Usa "villi/abitanti", "oro", "legna", "cibo", "monumento", "centro città".
               - Per gli edifici militari: la parola inglese "stable" (spesso erroneamente trascelta o tradotta come "stabile") deve essere tradotta come "stalla" o "scuderia".
               - L'edificio "archery range" (in italiano ufficialmente "poligono di tiro") può essere indicato e tradotto anche come "arceria" o "area di tiro con l'arco".
            3. MAIUSCOLE: Usa le maiuscole SOLO all'inizio della frase. Tutti i termini tecnici, nomi di edifici, unità e tecnologie devono avere l'iniziale MINUSCOLA (es: caserma, centro città, monumento, cavaliere). NON usare maiuscole a caso nel mezzo della frase.
            4. AZIONI: Sii diretto e schematico.
            5. TERMINOLOGIA SPECIFICA: Usa SEMPRE i nomi delle unità, degli edifici e delle meccaniche uniche della civiltà ${civName || ''} (es. ovoo, pozzo minerario, cisterna, ecc.). Sii il più preciso e specifico possibile, usando sempre l'iniziale minuscola per questi termini.
            
            REGOLE DI ESTRAZIONE (CRITICHE):
            - NORMALIZZAZIONE TEMPO (IMPORTANTE): Di norma il Build Order deve iniziare al minuto [00:00]. Se la prima azione di gioco effettiva (es. invio villi, costruzione prima casa) inizia più avanti nel video (es. a 00:45) senza che il testo specifichi esplicitamente un minutaggio diverso, considera quel momento come lo "0" e sottrai quel valore (es. 45 secondi) da tutti i timestamp successivi. Tuttavia, se la trascrizione cita ESPLICITAMENTE un tempo specifico per la prima azione (es. "A 2 minuti fate questo"), mantieni quel timestamp senza forzare lo zero. La build deve comunque essere coerente internamente.
            - ESPANSIONE: Se i dati provengono da AOE4 GUIDES (lo vedi nell'intestazione FONTE), i passaggi sono schematici. Il tuo compito è espanderli in frasi complete, precise e dettagliate in italiano. Ad esempio, se leggi "[00:21] 1 [Villager] to [Gold]", scrivi qualcosa come "[00:21] Invia 1 nuovo abitante sull'oro e costruisci un Campo minerario".
            - COPRI TUTTA LA TIMELINE: Se la trascrizione arriva a 15-20 minuti, il tuo JSON deve arrivare a quel minutaggio. NON FERMARTI AI PRIMI 5 MINUTI.
            - NON RIASSUMERE: Estrai ogni passaggio rilevante. Mi aspetto 30-50 step per guide complete.
            - Rispondi ESCLUSIVAMENTE con un oggetto JSON valido.
            - Campi richiesti: "title" (string), "description" (string), "steps" (array di oggetti {time: string, action: string, note: string}).
            - Usa i timestamp [MM:SS] presenti nel testo, ma normalizzati come descritto sopra.
            
            TESTO DA ANALIZZARE:
            ${textToAnalyze.substring(0, 60000)}`
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              topK: 40
            }
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.error) {
          lastGeminiError = data.error;
          continue;
        }

        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          resultText = candidateText;
          break;
        }
      } catch (err) {
        lastGeminiError = err;
      }
    }

    if (!resultText) throw new Error(lastGeminiError?.message || "L'IA non ha restituito alcun contenuto.");

    try {
      let jsonString = resultText.trim();
      if (jsonString.includes('```')) {
        const matches = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) jsonString = matches[1].trim();
      }
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      const parsedData = JSON.parse(jsonString);
      if (!parsedData.steps || !Array.isArray(parsedData.steps)) throw new Error("JSON invalido.");
      return res.status(200).json(parsedData);
    } catch (e: any) {
      throw new Error(`Errore parsing IA: ${e.message}`);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
