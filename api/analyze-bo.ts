import type { VercelRequest, VercelResponse } from '@vercel/node';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Funzione per estrarre l'ID video da vari formati di URL YouTube
function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurazione CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { youtubeUrl } = req.body;

  if (!youtubeUrl) {
    return res.status(400).json({ error: 'URL YouTube mancante' });
  }

  const videoId = getYoutubeId(youtubeUrl);
  if (!videoId) {
    return res.status(400).json({ error: 'ID video YouTube non valido' });
  }

  try {
    // 1. Recupera la trascrizione del video
    console.log(`Recupero trascrizione per video: ${videoId}`);
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcriptItems.map(item => item.text).join(' ');

    if (!fullText || fullText.length < 100) {
      throw new Error('Trascrizione troppo breve o non disponibile');
    }

    // 2. Inizializza Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY non configurata sul server');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analizza la seguente trascrizione di un video di Age of Empires IV ed estrai un Build Order strutturato.
      
      ISTRUZIONI:
      - Identifica la strategia principale.
      - Estrai una lista di azioni strutturate per: Minutaggio (formato MM:SS), Descrizione Azione (es. 6 villi al cibo), e Note Aggiuntive.
      - Se non sei sicuro di un dato, lascia il campo vuoto invece di inventare.
      - Restituisci il risultato ESCLUSIVAMENTE in formato JSON con la seguente struttura:
      {
        "description": "Breve descrizione della strategia e dei suoi obiettivi",
        "steps": [
          { "time": "00:00", "action": "Azione...", "note": "Nota..." }
        ]
      }

      TRASCRIZIONE:
      ${fullText.substring(0, 30000)} 
    `;

    // 3. Genera il contenuto
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Pulizia della risposta per estrarre solo il JSON (a volte il modello aggiunge ```json ... ```)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    const boData = JSON.parse(jsonStr);

    return res.status(200).json(boData);

  } catch (error: any) {
    console.error('Errore durante l\'analisi del Build Order:', error);
    return res.status(500).json({ 
      error: 'Errore durante l\'analisi del video', 
      details: error.message 
    });
  }
}
