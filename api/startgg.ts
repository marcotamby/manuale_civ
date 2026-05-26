import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Proviamo a leggere con vari nomi possibili
  const token = 
    process.env.VITE_STARTGG_TOKEN || 
    process.env.STARTGG_TOKEN || 
    process.env.VITE_START_GG_TOKEN || 
    process.env.START_GG_TOKEN;

  if (!token) {
    return res.status(401).json({ 
      error: 'API Token assente', 
      details: 'Il server non trova la chiave VITE_STARTGG_TOKEN o VITE_START_GG_TOKEN. Verifica le Environment Variables su Vercel.' 
    });
  }

  try {
    const startggUrl = 'https://api.start.gg/gql/alpha';
    console.log(`Proxying to start.gg... Body present: ${!!req.body}`);
    
    const response = await fetch(startggUrl, {
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

