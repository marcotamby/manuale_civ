import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ 
        description: `ERRORE GOOGLE: ${data.error.message}`,
        steps: []
      });
    }

    const availableModels = data.models?.map((m: any) => m.name).join('\n') || "Nessun modello trovato.";

    // Restituiamo la lista nel campo 'description' così l'utente la vede nella modal
    return res.status(200).json({ 
      description: `MODELLI DISPONIBILI:\n${availableModels}`,
      steps: [
        { time: "DEBUG", action: "Controlla la lista sopra", note: "Copia i nomi e inviali in chat" }
      ]
    });

  } catch (error: any) {
    return res.status(200).json({ description: `Errore: ${error.message}`, steps: [] });
  }
}
