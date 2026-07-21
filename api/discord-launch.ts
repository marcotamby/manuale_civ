import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.VITE_DISCORD_BOT_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function cleanChannelId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const matches = trimmed.match(/\d+/g);
  if (matches && matches.length > 0) {
    return matches[matches.length - 1];
  }
  return trimmed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    tournamentId, 
    name, 
    type,
    map,
    eventDate, 
    eventTime, 
    maxParticipants, 
    channelId: rawChannelId, 
    description, 
    bannerUrl,
    hasRegolamento
  } = req.body;

  const channelId = cleanChannelId(rawChannelId);

  if (!channelId) {
    return res.status(400).json({ error: 'ID Canale Discord mancante.' });
  }

  if (!DISCORD_BOT_TOKEN) {
    return res.status(500).json({ 
      error: 'VITE_DISCORD_BOT_TOKEN non configurato su Vercel.',
      details: 'Verifica di aver inserito VITE_DISCORD_BOT_TOKEN nelle Environment Variables di Vercel.' 
    });
  }

  const fields: any[] = [
    {
      name: '👥 Posti Iscritti',
      value: `**0 / ${maxParticipants || 8}**`,
      inline: true
    },
    {
      name: '⚔️ Tipologia',
      value: type || '1v1',
      inline: true
    }
  ];

  if (map) {
    fields.push({
      name: '🗺️ Mappe Torneo',
      value: map,
      inline: true
    });
  }

  if (eventDate || eventTime) {
    const formattedDate = [eventDate, eventTime ? `ore ${eventTime}` : ''].filter(Boolean).join(' - ');
    fields.push({
      name: '📅 Data & Orario',
      value: formattedDate || 'Da definire',
      inline: false
    });
  }

  fields.push({
    name: '⚙️ Formato',
    value: 'Eliminazione Diretta',
    inline: true
  });

  if (hasRegolamento) {
    fields.push({
      name: '📜 Regolamento',
      value: 'Consulta il regolamento ufficiale sulla pagina del torneo sul sito web.',
      inline: false
    });
  }

  const embed: any = {
    title: `🏆 TORNEO UFFICIALE: ${(name || 'TORNEO').toUpperCase()}`,
    description: description || `Sono aperte le iscrizioni per il torneo! Clicca sul bottone qui sotto per iscriverti direttamente da Discord.`,
    color: 0x06b6d4, // Cyan
    fields,
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
      let detailsMessage = errText;
      if (errText.includes('50001') || errText.includes('Missing Access')) {
        detailsMessage = 'Il Bot Discord non ha i permessi per accedere a questo canale o non è stato ancora aggiunto a questo Server Discord. Verifica che il Bot sia nel server ed abbia i permessi "Vedi Canale" e "Invia Messaggi".';
      } else if (errText.includes('50013') || errText.includes('Missing Permissions')) {
        detailsMessage = 'Il Bot non ha i permessi di invio messaggi / embed in questo canale.';
      } else if (errText.includes('Unknown Channel') || errText.includes('10003')) {
        detailsMessage = 'ID Canale non valido o canale inesistente.';
      }
      return res.status(discordRes.status).json({
        error: `Discord API errore (${discordRes.status})`,
        details: detailsMessage
      });
    }

    const messageData = await discordRes.json();

    // Salva l'ID del messaggio e del canale nel DB Supabase mantenendo lo stato 'Programmato'
    if (tournamentId) {
      await supabase
        .from('tournaments')
        .update({
          discord_channel_id: channelId,
          discord_message_id: messageData.id,
          max_participants: maxParticipants || 8,
          map: map || null,
          event_date: eventDate || null,
          event_time: eventTime || null,
          status: 'Programmato'
        })
        .eq('id', tournamentId);
    }

    return res.status(200).json({ success: true, messageId: messageData.id });
  } catch (err: any) {
    console.error('Errore backend lancio torneo:', err);
    return res.status(500).json({ error: 'Errore interno invio Discord', details: err.message });
  }
}
