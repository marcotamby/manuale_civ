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
  const { youtubeUrl, rawText } = req.body;
  
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
      throw new Error("Impossibile recuperare dati dal video. Usa l'inserimento manuale.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Sei un esperto di Age of Empires 4. Analizza il seguente testo (descrizione e trascrizione) ed estrai il Build Order strutturato.
            
            REGOLE MANDATORIE:
            1. Rispondi SEMPRE in ITALIANO. Se la fonte è in inglese, traduci accuratamente i termini: "Villagers" diventa "vili" o "abitanti", "Gold" diventa "oro", "Food" diventa "cibo", "Wood" diventa "legna".
            2. Restituisci SOLO un JSON valido.
            3. Il JSON deve avere: "description" (breve riassunto della strategia in italiano), e "steps" (array di oggetti {time, action, note}).
            4. Sii ESTREMAMENTE DETTAGLIATO e COPRI TUTTA LA DURATA DELLA TRASCRIZIONE. Non fermarti ai primi 4 minuti: estrai passaggi fino alla fine del testo fornito (anche se il video dura 15-20 minuti).
            5. Ogni volta che nella trascrizione viene menzionata una nuova azione o un nuovo obiettivo temporale, crea uno step. Se il video prosegue fino a 10, 15 o 20 minuti, i tuoi step devono arrivare a quel minutaggio.
            6. Genera ALMENO 20-30 passaggi per video lunghi.
            7. Il campo "time" deve essere "MM:SS" (es. "0:45"). USA I TIMESTAMP [MM:SS] PRESENTI NEL TESTO.
            8. Ogni "action" e "note" deve essere in ITALIANO.
            
            TESTO DA ANALIZZARE:
            ${textToAnalyze.substring(0, 35000)}` 
          }] 
        }]
      })
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (resultText) {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return res.status(200).json(JSON.parse(jsonMatch[0]));
    }

    throw new Error("L'IA non è riuscita a generare un JSON valido.");

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
