import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function getYoutubeData(videoId: string) {
  // Proviamo l'URL embed che è più leggero e meno protetto
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': 'CONSENT=YES+cb.20220301-11-p0.it+FX+917', // Bypass consenso cookie
      }
    });

    const html = await response.text();
    
    // Fallback descrizione più robusto
    let description = "";
    const descMatch = html.match(/"shortDescription":"([\s\S]*?)",/) || 
                     html.match(/meta name="description" content="([\s\S]*?)"/) ||
                     html.match(/meta property="og:description" content="([\s\S]*?)"/);
    
    if (descMatch) {
      try {
        description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      } catch (e) {
        description = descMatch[1];
      }
    }

    // Ricerca sottotitoli migliorata
    let transcript = "";
    const jsonRegex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
    const playerResponseMatch = html.match(jsonRegex);
    
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captionTracks && captionTracks.length > 0) {
          const track = captionTracks.find((t: any) => t.languageCode === 'it') || 
                        captionTracks.find((t: any) => t.languageCode === 'en') || 
                        captionTracks[0];
          
          if (track && track.baseUrl) {
            const capRes = await fetch(track.baseUrl);
            const capXml = await capRes.text();
            transcript = capXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
      } catch (e) {
        console.error("Errore parsing JSON YouTube:", e);
      }
    }

    return {
      combinedText: `TITOLO/DESCRIZIONE:\n${description}\n\nTRASCRIZIONE:\n${transcript}`
    };

  } catch (error) {
    throw new Error("Errore di connessione a YouTube.");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { youtubeUrl } = req.body;
  if (!youtubeUrl) return res.status(400).json({ error: 'URL mancante' });

  const videoId = getYoutubeId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'ID non valido' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY mancante');

    const { combinedText } = await getYoutubeData(videoId);

    // Se abbiamo almeno qualcosa (anche solo la descrizione), proviamo a mandare a Gemini
    if (combinedText.length < 30) {
      throw new Error("YouTube ha bloccato la richiesta (Bot Protection). Prova tra qualche minuto o con un altro video.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `Analizza i dati di questo video AoE4 ed estrai il Build Order in JSON.\n\n${combinedText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("L'IA non è riuscita a generare un formato valido.");
    
    return res.status(200).json(JSON.parse(jsonMatch[0]));

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
