import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.CHALLONGE_CLIENT_ID;
  const clientSecret = process.env.CHALLONGE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Challonge credentials not configured');
  }

  const response = await fetch('https://api.challonge.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'unprotected_read' 
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Challonge Token Error:', errorData);
    throw new Error(`Failed to get Challonge token: ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in * 1000) - 60000; // Sottraiamo un minuto per sicurezza
  return cachedToken;
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

  try {
    const token = await getAccessToken();
    const { path, ...params } = req.query;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Costruiamo l'URL per Challonge API v2.1
    // La documentazione suggerisce https://api.challonge.com/v2.1/
    const baseUrl = 'https://api.challonge.com/v2.1/';
    const url = new URL(`${baseUrl}${path}`);
    
    // Aggiungiamo eventuali parametri di query extra
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Challonge Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
