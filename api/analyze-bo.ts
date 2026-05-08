import type { VercelRequest, VercelResponse } from '@vercel/node';

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function getYoutubeData(videoId: string) {
  // Usiamo l'URL embed che è il più "gentile" con i server
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
  try {
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const html = await response.text();
    
    // 1. Cerchiamo la descrizione (nascosta nell'embed o fallback su watch)
    let description = "";
    const descMatch = html.match(/"shortDescription":"([\s\S]*?)"/);
    if (descMatch) description = descMatch[1].substring(0, 3000);

    // 2. Cerchiamo i sottotitoli (il cuore del Build Order)
    let transcript = "";
    // Cerchiamo la configurazione delle didascalie nel codice dell'embed
    const captionMatch = html.match(/"captionTracks":\s*(\[.+?\])/);
    
    if (captionMatch) {
      try {
        const captionTracks = JSON.parse(captionMatch[1]);
        if (captionTracks && captionTracks.length > 0) {
          // Preferenza: it, poi en, poi qualsiasi cosa
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

    // Se l'embed non ha dato frutti, facciamo un tentativo rapido sulla pagina normale per la descrizione
    if (!transcript && !description) {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const watchHtml = await watchRes.text();
      const watchDescMatch = watchHtml.match(/"shortDescription":"([\s\S]*?)"/);
      if (watchDescMatch) description = watchDescMatch[1].substring(0, 5000);
    }

    return { combinedText: `DESCRIZIONE:\n${description}\n\nTRASCRIZIONE:\n${transcript}` };
  } catch (error) {
    throw new Error("Errore collegamento YouTube");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { youtubeUrl } = req.body;
  const videoId = getYoutubeId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'ID non valido' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key mancante');

    const { combinedText } = await getYoutubeData(videoId);
    
    // Se abbiamo almeno 20 caratteri, proviamo. Gemini è bravo anche con poco.
    if (combinedText.length < 20) throw new Error("YouTube sta bloccando le richieste. Riprova tra qualche minuto.");

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let boData = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Estrai il Build Order da questo testo AoE4 in JSON (description, steps: {time, action, note}). Sii preciso con i tempi MM:SS.\n\n${combinedText}` }] }]
          })
        });

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text;
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            boData = JSON.parse(jsonMatch[0]);
            break;
          }
        }
      } catch (e) {}
    }

    if (!boData) throw new Error("L'IA non è riuscita a estrarre dati validi. Forse il video non contiene un Build Order chiaro.");

    return res.status(200).json(boData);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
