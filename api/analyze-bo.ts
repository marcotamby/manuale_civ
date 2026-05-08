import type { VercelRequest, VercelResponse } from '@vercel/node';

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|yewtu.be\/watch\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
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
        // Invidious captions are often VTT. Let's keep the timestamps if possible.
        // For simplicity, we'll let Gemini handle the VTT format which has [00:00.000 --> 00:00.000]
      }
    } catch (e) {}
    
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
          
          // ESTRAZIONE INTELLIGENTE: Manteniamo i tempi!
          // Il formato XML di YouTube è <text start="12.34" dur="2.1">testo</text>
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
      } catch (e) {}
    }
    return { combinedText: `DESCRIZIONE:\n${description}\n\nTRASCRIZIONE CON TIMESTAMP:\n${transcript}` };
  } catch (error) { throw new Error("Errore YouTube"); }
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
  const { youtubeUrl, rawText } = body || {};
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key mancante');

    let textToAnalyze = "";

    if (rawText) {
      textToAnalyze = rawText;
    } else if (youtubeUrl) {
      const videoId = getYoutubeId(youtubeUrl);
      if (videoId) {
        try {
          const data = await getYoutubeData(videoId);
          if (data.combinedText.length > 200) textToAnalyze = data.combinedText;
        } catch (e) {}

        if (textToAnalyze.length < 200) {
          const invData = await getInvidiousData(videoId);
          if (invData) textToAnalyze += "\n" + invData.combinedText;
        }
      }
    }

    if (!textToAnalyze || textToAnalyze.length < 20) {
      const errorMsg = rawText 
        ? "La trascrizione fornita è troppo breve o non valida per l'analisi." 
        : "Impossibile recuperare dati dal video automaticamente. Usa l'inserimento manuale incollando la trascrizione.";
      throw new Error(errorMsg);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Sei un esperto di Age of Empires 4. Analizza il seguente testo (descrizione e trascrizione) ed estrai il Build Order strutturato completo seguendo lo stile del sito "Manuale Civ".
            
            REGOLE DI STILE MANDATORIE:
            1. LINGUA: Italiano tecnico. Traduci tutto dall'inglese.
            2. TERMINI: Usa "vili/abitanti", "oro", "legna", "cibo", "Monumento", "Centro Città".
            3. MAIUSCOLE: Usa le maiuscole SOLO all'inizio della frase e per i nomi propri degli edifici (es: Caserma, Centro Città). NON usare maiuscole a caso nel mezzo della frase per enfatizzare parole.
            4. AZIONI: Sii diretto e schematico.
            
            REGOLE DI ESTRAZIONE (CRITICHE):
            - COPRI TUTTA LA TIMELINE: Se la trascrizione arriva a 15-20 minuti, il tuo JSON deve arrivare a quel minutaggio. NON FERMARTI AI PRIMI 5 MINUTI.
            - NON RIASSUMERE: Estrai ogni passaggio rilevante. Mi aspetto 30-50 step per video lunghi.
            - Rispondi ESCLUSIVAMENTE con un oggetto JSON valido.
            - Campi richiesti: "title" (string), "description" (string), "steps" (array di oggetti {time: string, action: string, note: string}).
            - Usa i timestamp [MM:SS] presenti nel testo.
            
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

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Gemini API Error: ${data.error.message}`);
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error("L'IA non ha restituito alcun contenuto.");
    }

    try {
      // Robust JSON extraction
      let jsonString = resultText.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.includes('```')) {
        const matches = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) {
          jsonString = matches[1].trim();
        }
      }

      // Final attempt to find the JSON object if there's still surrounding text
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }

      const parsedData = JSON.parse(jsonString);
      
      // Validation of structure
      if (!parsedData.steps || !Array.isArray(parsedData.steps)) {
        throw new Error("Il JSON generato non contiene l'array dei passaggi (steps).");
      }

      return res.status(200).json(parsedData);
    } catch (e: any) {
      console.error("JSON Parsing Error. Raw Text:", resultText);
      throw new Error(`Errore nel parsing dei dati dell'IA: ${e.message}`);
    }

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
