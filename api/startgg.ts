import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Proviamo a leggere sia con che senza prefisso VITE_ per sicurezza
  const token = process.env.VITE_STARTGG_TOKEN || process.env.STARTGG_TOKEN;

  if (!token) {
    console.error('SERVER ERROR: Start.gg token is missing in process.env');
    return res.status(500).json({ 
      error: 'API Token non configurato sul server',
      details: 'La variabile VITE_STARTGG_TOKEN non è stata trovata nelle impostazioni di Vercel.' 
    });
  }

  try {
    const response = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('START.GG API ERROR:', errorText);
      return res.status(response.status).json({ 
        error: 'Errore risposta da start.gg', 
        details: errorText 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('PROXY SYSTEM ERROR:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server proxy', 
      details: error.message 
    });
  }
}

