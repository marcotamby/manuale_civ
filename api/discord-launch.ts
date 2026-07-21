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

  let channelId = cleanChannelId(rawChannelId);

  if (!DISCORD_BOT_TOKEN) {
    return res.status(500).json({ 
      error: 'VITE_DISCORD_BOT_TOKEN non configurato su Vercel.',
      details: 'Verifica di aver inserito VITE_DISCORD_BOT_TOKEN nelle Environment Variables di Vercel.' 
    });
  }

  // Se l'ID Canale non è stato specificato, trova automaticamente il primo canale del primo Server del Bot
  if (!channelId) {
    try {
      const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}` }
      });
      if (guildsRes.ok) {
        const guilds = await guildsRes.json();
        if (guilds && guilds.length > 0) {
          const guildId = guilds[0].id;
          const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}` }
          });
          if (channelsRes.ok) {
            const channels = await channelsRes.json();
            const textChannel = channels.find((c: any) => c.type === 0 && (c.name.includes('torne') || c.name.includes('general') || c.name.includes('chat') || true));
            if (textChannel) {
              channelId = textChannel.id;
            }
          }
        }
      }
    } catch (autoErr) {
      console.warn('Autodiscovery canale Discord fallito:', autoErr);
    }
  }

  if (!channelId) {
    return res.status(400).json({ error: 'Nessun canale Discord trovato. Inserisci un ID Canale valido.' });
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
    const formattedDatePart = eventDate ? (eventDate.includes('/') ? eventDate : eventDate.split('-').reverse().join('/')) : '';
    const formattedDate = [formattedDatePart, eventTime ? `ore ${eventTime}` : ''].filter(Boolean).join(' - ');
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

    // Creazione automatica della Categoria e dei 3 Canali Testuali Reali su Discord
    const channelsToCreate = [
      { name: '👥-partecipanti', msg: '👥 **Canale Partecipanti**: Gli iscritti al torneo ed i loro avatar verranno notificati ed aggiornati qui!' },
      { name: '🏆-risultati', msg: '🏆 **Canale Risultati**: I risultati dei match ed i vincitori del torneo saranno pubblicati qui in tempo reale!' },
      { name: '⚔️-brackets', msg: `⚔️ **Canale Brackets**: Consulta ed incrocia il tabellone live ad eliminazione diretta sul sito web!` }
    ];

    const createdChannels: string[] = [];

    try {
      // 1. Recupera il Server ID (guild_id) e la Categoria attuale dal canale d'invio
      const channelInfoRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}` }
      });

      if (channelInfoRes.ok) {
        const channelInfo = await channelInfoRes.json();
        const guildId = channelInfo.guild_id;
        let targetCategoryId = channelInfo.parent_id || null;

        if (guildId) {
          // 2. Crea una Categoria dedicata per il Torneo nel Server Discord
          const categoryRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`
            },
            body: JSON.stringify({
              name: `🏆 ${name ? name.toUpperCase() : 'TORNEO'}`,
              type: 4 // 4 = GUILD_CATEGORY
            })
          });

          if (categoryRes.ok) {
            const categoryData = await categoryRes.json();
            targetCategoryId = categoryData.id;
          }

          // 3. Crea i 3 Canali Testuali Reali (GUILD_TEXT type 0) all'interno della Categoria
          for (const ch of channelsToCreate) {
            try {
              const textChannelRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`
                },
                body: JSON.stringify({
                  name: ch.name,
                  type: 0, // 0 = GUILD_TEXT (Canale Testuale Reale)
                  parent_id: targetCategoryId || undefined
                })
              });

              if (textChannelRes.ok) {
                const textChannelData = await textChannelRes.json();
                createdChannels.push(ch.name);

                // Invia il messaggio iniziale di benvenuto nel canale testuale appena creato
                await fetch(`https://discord.com/api/v10/channels/${textChannelData.id}/messages`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`
                  },
                  body: JSON.stringify({ content: ch.msg })
                });
              } else {
                console.warn(`Creazione canale testuale ${ch.name} fallito, fallback su Thread...`);
              }
            } catch (chErr) {
              console.warn(`Errore creazione canale ${ch.name}:`, chErr);
            }
          }
        }
      }
    } catch (gErr) {
      console.warn('Avviso creazione canali testuali Discord:', gErr);
    }

    // Fallback: Se la creazione dei canali testuali fallisce o non ha permessi sufficienti, crea i Thread sul messaggio
    if (createdChannels.length === 0) {
      for (const threadInfo of channelsToCreate) {
        try {
          let threadRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageData.id}/threads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`
            },
            body: JSON.stringify({ name: threadInfo.name })
          });

          if (!threadRes.ok) {
            threadRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`
              },
              body: JSON.stringify({ name: threadInfo.name, type: 11 })
            });
          }

          if (threadRes.ok) {
            const threadData = await threadRes.json();
            await fetch(`https://discord.com/api/v10/channels/${threadData.id}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`
              },
              body: JSON.stringify({ content: threadInfo.msg })
            });
          }
        } catch (tErr) {
          console.warn('Avviso eccezione thread fallback:', tErr);
        }
      }
    }

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
