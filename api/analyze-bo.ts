import type { VercelRequest, VercelResponse } from '@vercel/node';
import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { youtubeUrl } = req.body;
  if (!youtubeUrl) return res.status(400).json({ error: 'URL mancante' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key mancante');

    // 1. RECUPERO TRASCRIZIONE (Usando la libreria specializzata)
    let fullText = "";
    try {
      const videoId = youtubeUrl.includes('v=') ? youtubeUrl.split('v=')[1].split('&')[0] : youtubeUrl.split('/').pop();
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId || "");
      fullText = transcriptItems.map(item => item.text).join(' ');
    } catch (e: any) {
      // Se fallisce, proviamo a recuperare almeno la descrizione via fetch semplice
      console.log("Trascrizione fallita, provo descrizione...");
      const res = await fetch(youtubeUrl);
      const html = await res.text();
      const descMatch = html.match(/"shortDescription":"([\s\S]*?)"/);
      fullText = descMatch ? descMatch[1] : "";
    }

    if (!fullText || fullText.length < 20) {
      throw new Error("YouTube sta bloccando il recupero dei dati. Prova con un altro video tra qualche minuto.");
    }

    // 2. CHIAMATA IA (Usando i modelli che sappiamo funzionare)
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let boData = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Analizza questo testo di un video AoE4 ed estrai il Build Order in JSON (description, steps: {time, action, note}).\n\n${fullText.substring(0, 30000)}` }] }]
          })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            boData = JSON.parse(jsonMatch[0]);
            break;
          }
        }
      } catch (e) {}
    }

    if (!boData) throw new Error("L'IA non è riuscita a generare il Build Order. Il testo estratto dal video potrebbe essere troppo scarso.");

    return res.status(200).json(boData);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
