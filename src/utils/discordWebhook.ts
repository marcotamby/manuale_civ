export interface BuildOrderWebhookParams {
  civId: string;
  civName: string;
  boId: string;
  boTitle: string;
  difficulty: number | string; // 1, 2, 3 or "Easy", "Medium", "Hard"
  description?: string;
  map?: string;
  bannerUrl?: string;
}

/**
 * Invia una richiesta al backend serverless per notificare il nuovo Build Order su Discord.
 * L'URL del webhook viene gestito unicamente lato server (su Vercel) per evitare
 * qualsiasi esposizione pubblica o furto del webhook da parte di bot/scrapers.
 */
export async function sendNewBuildOrderWebhook(params: BuildOrderWebhookParams) {
  try {
    const response = await fetch('/api/discord-buildorder-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Risposta webhook Discord serverless:', errData);
      return;
    }

    console.log('Notifica Discord per Build Order inviata con successo');
  } catch (error) {
    console.error('Impossibile inviare la notifica Discord:', error);
  }
}
