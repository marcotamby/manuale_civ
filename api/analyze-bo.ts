import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function getYoutubeData(videoId: string) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': 'CONSENT=YES+cb.20220301-11-p0.it+FX+917',
      }
    });

    const html = await response.text();
    
    let description = "";
    const descMatch = html.match(/"shortDescription":"([\s\S]*?)",/) || 
                     html.match(/meta name="description" content="([\s\S]*?)"/);
    if (descMatch) description = descMatch[1].substring(0, 5000);

    let transcript = "";
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
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
      } catch (e) {}
    }

    return {
      combinedText: `DESCRIZIONE:\n${description}\n\nTRASCRIZIONE:\n${transcript}`
    };
  } catch (error) {
    throw new Error("Errore YouTube");
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
    if (!apiKey) throw new Error('API Key mancante su Vercel');

    const { combinedText } = await getYoutubeData(videoId);
    if (combinedText.length < 20) throw new Error("Dati video non recuperabili.");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // TENTATIVO 1: Gemini 1.5 Flash
    // TENTATIVO 2: Gemini Pro (fallback)
    let boData = null;
    const modelNames = ["gemini-1.5-flash", "gemini-pro"];
    
    for (const modelName of modelNames) {
      try {
        console.log(`Tentativo con modello: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `Analizza questo testo di un video AoE4 ed estrai il Build Order in JSON (description, steps: {time, action, note}).\n\n${combinedText.substring(0, 20000)}`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          boData = JSON.parse(jsonMatch[0]);
          break; // Se funziona, usciamo dal loop
        }
      } catch (err) {
        console.error(`Fallito modello ${modelName}:`, err);
        continue; // Prova il prossimo
      }
    }

    if (!boData) throw new Error("Tutti i modelli IA hanno fallito. Controlla la tua API Key.");

    return res.status(200).json(boData);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
