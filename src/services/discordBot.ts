import { supabase } from '../lib/supabaseClient';
import { generateSingleEliminationBracket } from './bracketEngine';

const DISCORD_BOT_TOKEN = (import.meta.env.VITE_DISCORD_BOT_TOKEN as string) || '';

export interface LaunchTournamentParams {
  tournamentId: string;
  name: string;
  maxParticipants: number;
  channelId: string;
  description?: string;
  bannerUrl?: string;
  regolamentoContent?: string;
}

/**
 * Invia il messaggio di annuncio del torneo con i bottoni nel canale Discord specificato
 */
export async function launchTournamentOnDiscord(params: LaunchTournamentParams) {
  const { tournamentId, name, maxParticipants, channelId, description, bannerUrl } = params;

  if (!DISCORD_BOT_TOKEN) {
    throw new Error('VITE_DISCORD_BOT_TOKEN non configurato nelle variabili d\'ambiente.');
  }

  const embed: any = {
    title: `🏆 TORNEO UFFICIALE: ${name.toUpperCase()}`,
    description: description || `Sono aperte le iscrizioni per il torneo! Clicca sul bottone qui sotto per iscriverti direttamente da Discord.`,
    color: 0x06b6d4, // Cyan
    fields: [
      {
        name: '👥 Posti Iscritti',
        value: `**0 / ${maxParticipants}**`,
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

  const payload = {
    embeds: [embed],
    components
  };

  // Chiamata all'API REST di Discord
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Errore invio messaggio Discord:', errText);
    throw new Error(`Errore API Discord (${res.status}): ${errText}`);
  }

  const messageData = await res.json();

  // Salva l'ID del messaggio e del canale nel DB Supabase
  await supabase
    .from('tournaments')
    .update({
      discord_channel_id: channelId,
      discord_message_id: messageData.id,
      max_participants: maxParticipants,
      status: 'open'
    })
    .eq('id', tournamentId);

  return messageData;
}

/**
 * Aggiorna il messaggio del torneo su Discord con il numero aggiornato di iscritti
 */
export async function refreshDiscordTournamentEmbed(tournamentId: string) {
  if (!DISCORD_BOT_TOKEN) return;

  // Recupera dati torneo
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament || !tournament.discord_channel_id || !tournament.discord_message_id) {
    return;
  }

  // Conteggio iscritti
  const { count } = await supabase
    .from('tournament_participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  const currentCount = count || 0;
  const max = tournament.max_participants || 16;
  const isFull = currentCount >= max;

  const embed: any = {
    title: `🏆 TORNEO UFFICIALE: ${(tournament.name || tournament.title || '').toUpperCase()}`,
    description: isFull 
      ? `🔒 **ISCRIZIONI CHIUSE!**\nIl tetto massimo di ${max} partecipanti è stato raggiunto. Il tabellone è stato generato sul sito!`
      : (tournament.description || `Sono aperte le iscrizioni per il torneo! Clicca sul bottone qui sotto per iscriverti direttamente da Discord.`),
    color: isFull ? 0x10b981 : 0x06b6d4, // Verde se pieno, Cyan se aperto
    fields: [
      {
        name: '👥 Posti Iscritti',
        value: `**${currentCount} / ${max}** ${isFull ? '🔴 (COMPLETO)' : ''}`,
        inline: true
      },
      {
        name: '⚙️ Formato',
        value: 'Eliminazione Diretta',
        inline: true
      }
    ],
    footer: {
      text: 'Manuale Civ • Age of Empires IV',
      icon_url: 'https://aoe4guide.it/favicon.ico'
    },
    timestamp: new Date().toISOString()
  };

  const components = isFull
    ? [] // Rimuove i bottoni se è pieno
    : [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: '📝 Iscriviti al Torneo',
              custom_id: `tr_reg_${tournamentId}`
            },
            {
              type: 2,
              style: 4,
              label: '❌ Cancella Iscrizione',
              custom_id: `tr_unreg_${tournamentId}`
            }
          ]
        }
      ];

  await fetch(`https://discord.com/api/v10/channels/${tournament.discord_channel_id}/messages/${tournament.discord_message_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify({
      embeds: [embed],
      components
    })
  });

  // Se è pieno ed il torneo è ancora in stato 'open', scatena la generazione del tabellone!
  if (isFull && tournament.status === 'open') {
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (participants && participants.length >= 2) {
      await generateSingleEliminationBracket(tournamentId, participants);

      // Notifica la generazione del tabellone su Discord
      await fetch(`https://discord.com/api/v10/channels/${tournament.discord_channel_id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
        },
        body: JSON.stringify({
          content: `🎉 **Le iscrizioni per ${tournament.name || tournament.title} sono CHIUSE!**\nIl tabellone dei match ad eliminazione diretta è stato generato ed è ora visibile sul sito web!\nBuona fortuna a tutti i partecipanti! ⚔️`
        })
      });
    }
  }
}
