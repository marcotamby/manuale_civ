import type { VercelRequest, VercelResponse } from '@vercel/node';

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function getYoutubeData(videoId: string) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  try {
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
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
        if (captionTracks && captionTracks.length > 0) {
          const track = captionTracks.find((t: any) => t.languageCode?.startsWith('it')) || 
                        captionTracks.find((t: any) => t.languageCode?.startsWith('en')) || 
                        captionTracks[0];
          if (track && track.baseUrl) {
            const capRes = await fetch(track.baseUrl);
            const capXml = await capRes.text();
            transcript = capXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
      } catch (e) {}
    }
    return { combinedText: `DESCRIZIONE:\n${description}\n\nTRASCRIZIONE:\n${transcript}` };
  } catch (error) { throw new Error("Errore YouTube"); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { youtubeUrl, rawText } = req.body;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key mancante');

    let textToAnalyze = "";

    // Se l'utente ha fornito testo diretto, usiamo quello
    if (rawText && rawText.length > 10) {
      textToAnalyze = rawText;
    } 
    // Altrimenti proviamo a estrarlo da YouTube
    else if (youtubeUrl) {
      const videoId = getYoutubeId(youtubeUrl);
      if (videoId) {
        const data = await getYoutubeData(videoId);
        textToAnalyze = data.combinedText;
      }
    }

    if (!textToAnalyze || textToAnalyze.length < 10) {
      throw new Error("Nessun testo da analizzare. Incolla una trascrizione o un link valido.");
    }

    // Usiamo gemini-2.5-flash che sappiamo funzionare nel tuo account
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Analizza questo testo di Age of Empires IV ed estrai un Build Order strutturato in JSON.\n\nISTRUZIONI:\n- Restituisci JSON: { "description": "...", "steps": [{ "time": "MM:SS", "action": "...", "note": "..." }] }\n- Sii molto preciso con i tempi MM:SS.\n\nTESTO:\n${textToAnalyze.substring(0, 30000)}` }] }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (resultText) {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return res.status(200).json(JSON.parse(jsonMatch[0]));
    }

    throw new Error("L'IA non è riuscita a estrarre un Build Order valido da questo testo.");

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
