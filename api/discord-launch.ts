import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.VITE_DISCORD_BOT_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tournamentId, name, maxParticipants, channelId, description, bannerUrl } = req.body;

  if (!channelId) {
    return res.status(400).json({ error: 'ID Canale Discord mancante.' });
  }

  if (!DISCORD_BOT_TOKEN) {
    return res.status(500).json({ 
      error: 'VITE_DISCORD_BOT_TOKEN non configurato su Vercel.',
      details: 'Verifica di aver inserito VITE_DISCORD_BOT_TOKEN nelle Environment Variables di Vercel.' 
    });
  }

  const embed: any = {
    title: `🏆 TORNEO UFFICIALE: ${(name || 'TORNEO').toUpperCase()}`,
    description: description || `Sono aperte le iscrizioni per il torneo! Clicca sul bottone qui sotto per iscriverti direttamente da Discord.`,
    color: 0x06b6d4, // Cyan
    fields: [
      {
        name: '👥 Posti Iscritti',
        value: `**0 / ${maxParticipants || 16}**`,
        inline: true
      },
      {
        name: '⚙️ Formato',
        value: 'Eliminazione Diretta',
        inline: true
      },
      {
        name: '📜 Regolamento',
        value: 'Consulta le regole sul sito prima di giocare.',
        inline: false
      }
    ],
    footer: {
      text: 'Manuale Civ • Age of Empires IV',
      icon_url: 'https://aoe4guide.it/favicon.ico'
    },
    timestamp: new Date().toISOString()
  };

  if (bannerUrl) {
    embed.image = { url: bannerUrl };
  }

  const components = [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 1, // Primary (Blu)
          label: '📝 Iscriviti al Torneo',
          custom_id: `tr_reg_${tournamentId}`
        },
        {
          type: 2, // Button
          style: 4, // Danger (Rosso)
          label: '❌ Cancella Iscrizione',
          custom_id: `tr_unreg_${tournamentId}`
        }
      ]
    }
  ];

  try {
    const discordRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`
      },
      body: JSON.stringify({
        embeds: [embed],
        components
      })
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error('Errore API Discord:', errText);
      return res.status(discordRes.status).json({
        error: `Discord API errore (${discordRes.status})`,
        details: errText.includes('Unknown Channel') 
          ? 'Canale non trovato o il Bot non ha permessi di accesso a quel canale Discord.' 
          : errText
      });
    }

    const messageData = await discordRes.json();

    // Salva l'ID del messaggio e del canale nel DB Supabase
    if (tournamentId) {
      await supabase
        .from('tournaments')
        .update({
          discord_channel_id: channelId,
          discord_message_id: messageData.id,
          max_participants: maxParticipants || 16,
          status: 'open'
        })
        .eq('id', tournamentId);
    }

    return res.status(200).json({ success: true, messageId: messageData.id });
  } catch (err: any) {
    console.error('Errore backend lancio torneo:', err);
    return res.status(500).json({ error: 'Errore interno invio Discord', details: err.message });
  }
}
