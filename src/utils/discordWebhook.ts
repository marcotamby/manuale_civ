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

  // Build a beautiful formatted message. Discord will auto-unfurl the link at the end, 
  // rendering our optimized OG tags and making the image natively clickable to the site!
  let messageText = `📢 **Nuovo Build Order Pubblicato!**\n\n`;
  messageText += `📖 **${params.boTitle}**\n`;
  messageText += `⚔️ **Civiltà**: *${params.civName}*\n`;
  messageText += `🏆 **Difficoltà**: *${diffText}*\n`;
  if (params.map) {
    messageText += `🗺️ **Mappe Consigliate**: *${params.map}*\n`;
  }
  messageText += `\n🔗 **Visualizza la guida completa**: ${boUrl}`;

  const payload = {
    content: messageText
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
