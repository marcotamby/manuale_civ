import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key mancante su Vercel' });

  try {
    // Chiediamo a Google quali modelli sono disponibili per questa chiave
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ 
        error: `Errore Google: ${data.error.message}`,
        details: "Controlla che la API Key sia corretta e attiva su Google AI Studio."
      });
    }

    // Estraiamo solo i nomi dei modelli per leggerli facilmente
    const availableModels = data.models?.map((m: any) => m.name) || [];

    return res.status(200).json({ 
      message: "LISTA MODELLI DISPONIBILI",
      models: availableModels,
      firstFive: availableModels.slice(0, 5),
      hint: "Cerca un nome che contenga 'flash' o 'gemini' nella lista qui sopra."
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
