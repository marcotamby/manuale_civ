import type { VercelRequest, VercelResponse } from '@vercel/node';

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|yewtu.be\/watch\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function getInvidiousData(videoId: string) {
  // Proviamo yewtu.be che è una delle istanze Invidious più stabili
  const invidiousUrl = `https://yewtu.be/api/v1/videos/${videoId}`;
  try {
    const response = await fetch(invidiousUrl);
    const data = await response.json();
    
    // Invidious fornisce spesso i sottotitoli in modo più pulito
    const description = data.description || "";
    // Nota: Invidious API non sempre dà la trascrizione intera in un colpo solo, 
    // ma la descrizione spesso contiene il BO nei canali pro.
    return { combinedText: `DESCRIZIONE (INVIDIOUS):\n${description}` };
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
          transcript = capXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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
        // PROVA 1: YouTube Ufficiale
        try {
          const data = await getYoutubeData(videoId);
          if (data.combinedText.length > 100) textToAnalyze = data.combinedText;
        } catch (e) {}

        // PROVA 2: Invidious (Bypass) se la prima è fallita o povera
        if (textToAnalyze.length < 100) {
          const invData = await getInvidiousData(videoId);
          if (invData) textToAnalyze += "\n" + invData.combinedText;
        }
      }
    }

    if (!textToAnalyze || textToAnalyze.length < 10) {
      throw new Error("Impossibile recuperare dati dal video (YouTube blocca il server). Usa l'inserimento manuale in basso.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Estrai il Build Order AoE4 in JSON (description, steps: {time, action, note}).\n\nTESTO:\n${textToAnalyze.substring(0, 30000)}` }] }]
      })
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (resultText) {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return res.status(200).json(JSON.parse(jsonMatch[0]));
    }

    throw new Error("L'IA non ha trovato un Build Order chiaro in questo video.");

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
