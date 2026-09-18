import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface BuildOrderWebhookParams {
  civId: string;
  civName: string;
  boId: string;
  boTitle: string;
  difficulty: number | string;
  description?: string;
  map?: string;
  bannerUrl?: string;
}

// Variabile d'ambiente privata lato server (MAI VITE_*, non esposta al client né su GitHub)
const DISCORD_BO_WEBHOOK_URL = process.env.DISCORD_BO_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito. Usa POST.' });
  }

  if (!DISCORD_BO_WEBHOOK_URL) {
    console.warn('DISCORD_BO_WEBHOOK_URL non configurato nelle variabili d\'ambiente di Vercel.');
    return res.status(500).json({
      error: 'Webhook non configurato sul server',
      details: 'Configura la variabile d\'ambiente DISCORD_BO_WEBHOOK_URL su Vercel.'
    });
  }

  const {
    civId,
    civName,
    boId,
    boTitle,
    difficulty,
    description,
    map,
    bannerUrl
  } = req.body as Partial<BuildOrderWebhookParams>;

  if (!boTitle || !civName) {
    return res.status(400).json({ error: 'Parametri incompleti: boTitle e civName sono obbligatori.' });
  }

  // Formatta la difficoltà
  let diffText = '🟢 Facile';
  if (difficulty === 2 || difficulty === 'Medium' || difficulty === 'medio') {
    diffText = '🟡 Medio';
  } else if (difficulty === 3 || difficulty === 'Hard' || difficulty === 'difficile') {
    diffText = '🔴 Difficile';
  }

  const boUrl = civId && boId ? `https://aoe4guide.it/civ/${civId}/buildorders?bo=${boId}` : 'https://aoe4guide.it';

  // Descrizione pulita e troncata a 140 caratteri
  let desc = description || '';
  if (desc.length > 140) {
    desc = desc.substring(0, 137) + '...';
  }

  const fields = [
    {
      name: '⚔️ Civiltà',
      value: civName,
      inline: true
    },
    {
      name: '🏆 Difficoltà',
      value: diffText,
      inline: true
    }
  ];

  if (map) {
    fields.push({
      name: '🗺️ Mappe Consigliate',
      value: map,
      inline: true
    });
  }

  const embed: Record<string, unknown> = {
    title: `📖 ${boTitle}`,
    description: desc ? `*${desc}*\n\n[Visualizza il Build Order completo su Manuale Civ](${boUrl})` : `[Visualizza il Build Order completo su Manuale Civ](${boUrl})`,
    url: boUrl,
    color: 439924, // Cyan hex #06B6D4
    fields,
    footer: {
      text: 'Manuale Civ • Age of Empires IV',
      icon_url: 'https://aoe4guide.it/favicon.png'
    },
    timestamp: new Date().toISOString()
  };

  if (bannerUrl) {
    embed.image = {
      url: bannerUrl
    };
  }

  const payload = {
    content: `📢 **Nuovo Build Order Pubblicato!**`,
    embeds: [embed]
  };

  try {
    const discordRes = await fetch(DISCORD_BO_WEBHOOK_URL.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error('Errore chiamata Discord Webhook:', discordRes.status, errText);
      return res.status(discordRes.status).json({
        error: `Discord API errore (${discordRes.status})`,
        details: errText
      });
    }

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Errore invio webhook Discord:', err);
    return res.status(500).json({
      error: 'Errore interno durante l\'invio del webhook',
      details: errorMsg
    });
  }
}
