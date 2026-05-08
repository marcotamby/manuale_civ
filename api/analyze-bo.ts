import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Funzione per estrarre l'ID video
function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Funzione robusta per recuperare la trascrizione o la descrizione
async function getYoutubeData(videoId: string) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const html = await response.text();
    
    // 1. Tenta di estrarre la descrizione (molto utile se il BO è scritto lì)
    const descriptionMatch = html.match(/"shortDescription":"([\s\S]*?)","isCrawlable"/);
    const description = descriptionMatch ? JSON.parse(`"${descriptionMatch[1]}"`) : "";

    // 2. Tenta di estrarre i sottotitoli dal file JSON interno di YouTube (ytInitialPlayerResponse)
    let transcript = "";
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    
    if (playerResponseMatch) {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (captionTracks && captionTracks.length > 0) {
        // Preferenza: Italiano, poi Inglese, poi il primo disponibile
        const track = captionTracks.find((t: any) => t.languageCode === 'it') || 
                      captionTracks.find((t: any) => t.languageCode === 'en') || 
                      captionTracks[0];
        
        if (track && track.baseUrl) {
          const captionResponse = await fetch(track.baseUrl);
          const captionXml = await captionResponse.text();
          // Pulizia XML semplice per estrarre solo il testo
          transcript = captionXml
            .replace(/<[^>]*>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
    }

    return {
      description,
      transcript,
      combinedText: `DESCRIZIONE VIDEO:\n${description}\n\nTRASCRIZIONE VIDEO:\n${transcript}`
    };

  } catch (error) {
    console.error("Errore recupero dati YouTube:", error);
    throw new Error("Impossibile recuperare i dati del video. YouTube potrebbe aver bloccato la richiesta.");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { youtubeUrl } = req.body;
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante' });

  const videoId = getYoutubeId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'ID video non valido' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY non configurata');

    // Recupero dati (Sottotitoli + Descrizione)
    const { combinedText } = await getYoutubeData(videoId);

    if (combinedText.length < 50) {
      throw new Error("Dati insufficienti nel video (niente sottotitoli e descrizione troppo breve)");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analizza questi dati estratti da un video di Age of Empires IV (trascrizione e/o descrizione).
      Estrai un Build Order strutturato.
      
      ISTRUZIONI:
      - Identifica la strategia principale.
      - Estrai una lista di azioni strutturate per: Minutaggio (formato MM:SS), Descrizione Azione (es. 6 villi al cibo), e Note Aggiuntive.
      - Se trovi il Build Order scritto nella descrizione, usalo come fonte primaria.
      - Se non sei sicuro di un dato, lascia il campo vuoto invece di inventare.
      - Restituisci il risultato ESCLUSIVAMENTE in formato JSON:
      {
        "description": "Breve descrizione della strategia e dei suoi obiettivi",
        "steps": [
          { "time": "00:00", "action": "Azione...", "note": "Nota..." }
        ]
      }

      DATI VIDEO:
      ${combinedText.substring(0, 30000)} 
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const boData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

    return res.status(200).json(boData);

  } catch (error: any) {
    console.error('Errore analisi:', error);
    return res.status(500).json({ error: error.message });
  }
}
