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

const DEFAULT_WEBHOOK_URL = 'https://discord.com/api/webhooks/1507674866646646824/TRa7Xby4IN0VJix9Jzuh1I1-x6kTqYapYwBptLzEI7essf7A2EwJJzogey1MrfH5GOyB';

export async function sendNewBuildOrderWebhook(params: BuildOrderWebhookParams) {
  const webhookUrl = (import.meta.env.VITE_DISCORD_WEBHOOK_URL as string) || DEFAULT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('Discord Webhook URL not configured');
    return;
  }

  // Format difficulty
  let diffText = '🟢 Facile';
  if (params.difficulty === 2 || params.difficulty === 'Medium' || params.difficulty === 'medio') {
    diffText = '🟡 Medio';
  } else if (params.difficulty === 3 || params.difficulty === 'Hard' || params.difficulty === 'difficile') {
    diffText = '🔴 Difficile';
  }

  const boUrl = `https://aoe4guide.it/civ/${params.civId}/buildorders?bo=${params.boId}`;

  // Make description clean and truncated if too long
  let desc = params.description || '';
  if (desc.length > 200) {
    desc = desc.substring(0, 197) + '...';
  }

  const fields = [
    {
      name: '⚔️ Civiltà',
      value: params.civName,
      inline: true
    },
    {
      name: '🏆 Difficoltà',
      value: diffText,
      inline: true
    }
  ];

  if (params.map) {
    fields.push({
      name: '🗺️ Mappe Consigliate',
      value: params.map,
      inline: true
    });
  }

  const embed: any = {
    title: `📖 ${params.boTitle}`,
    description: desc ? `*${desc}*\n\n[Visualizza il Build Order completo su Manuale Civ](${boUrl})` : `[Visualizza il Build Order completo su Manuale Civ](${boUrl})`,
    url: boUrl,
    color: 439924, // Cyan hex #06B6D4 in decimal
    fields,
    footer: {
      text: 'Manuale Civ • Age of Empires IV',
      icon_url: 'https://aoe4guide.it/favicon.ico'
    },
    timestamp: new Date().toISOString()
  };

  if (params.bannerUrl) {
    embed.image = {
      url: params.bannerUrl
    };
  }

  const payload = {
    content: `📢 **Nuovo Build Order Pubblicato!**`,
    embeds: [embed]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord API responded with status ${response.status}`);
    }
    console.log('Discord webhook sent successfully');
  } catch (error) {
    console.error('Failed to send Discord webhook:', error);
  }
}
