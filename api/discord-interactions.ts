import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const DISCORD_PUBLIC_KEY = (process.env.DISCORD_PUBLIC_KEY || '').trim();
const DISCORD_BOT_TOKEN = (process.env.DISCORD_BOT_TOKEN || process.env.VITE_DISCORD_BOT_TOKEN || '').trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Verifica la firma Ed25519 proveniente da Discord
 */
function verifyDiscordSignature(req: VercelRequest): boolean {
  if (!DISCORD_PUBLIC_KEY) return true;

  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;

  if (!signature || !timestamp) return false;

  const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  try {
    return crypto.verify(
      null,
      Buffer.from(timestamp + bodyText),
      {
        key: Buffer.from(`302a300506032b6570032100${DISCORD_PUBLIC_KEY}`, 'hex'),
        format: 'der',
        type: 'spki'
      },
      Buffer.from(signature, 'hex')
    );
  } catch (err) {
    return false;
  }
}

/**
 * Aggiorna in tempo reale l'Embed del messaggio Discord con il conteggio iscritti aggiornato
 */
async function updateDiscordMessageCount(tournamentId: string) {
  if (!DISCORD_BOT_TOKEN) return;

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament || !tournament.discord_channel_id || !tournament.discord_message_id) return;

  const { count } = await supabase
    .from('tournament_participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  const currentCount = count || 0;
  const max = tournament.max_participants || 8;
  const isFull = currentCount >= max;

  const fields: any[] = [
    {
      name: '👥 Posti Iscritti',
      value: `**${currentCount} / ${max}** ${isFull ? '🔴 (ISCRIZIONI CHIUSE)' : ''}`,
      inline: true
    },
    {
      name: '⚔️ Tipologia',
      value: tournament.type || '1v1',
      inline: true
    }
  ];

  if (tournament.map) {
    fields.push({
      name: '🗺️ Mappe Torneo',
      value: tournament.map,
      inline: true
    });
  }

  if (tournament.event_date || tournament.event_time) {
    const formattedDate = [tournament.event_date, tournament.event_time ? `ore ${tournament.event_time}` : ''].filter(Boolean).join(' - ');
    fields.push({
      name: '📅 Data & Orario',
      value: formattedDate,
      inline: false
    });
  }

  fields.push({
    name: '⚙️ Formato',
    value: 'Eliminazione Diretta',
    inline: true
  });

  const embed: any = {
    title: `🏆 TORNEO UFFICIALE: ${(tournament.name || tournament.title || 'TORNEO').toUpperCase()}`,
    description: isFull 
      ? `🔒 **ISCRIZIONI CHIUSE!**\nIl tetto massimo di ${max} partecipanti è stato raggiunto. Il tabellone è popolato ed attivo sul sito web!`
      : (tournament.description || `Sono aperte le iscrizioni per il torneo! Clicca sul bottone qui sotto per iscriverti direttamente da Discord.`),
    color: isFull ? 0x10b981 : 0x06b6d4, // Verde se completo, Cyan se aperto
    fields,
    footer: {
      text: 'Manuale Civ • Age of Empires IV',
      icon_url: 'https://aoe4guide.it/favicon.ico'
    },
    timestamp: new Date().toISOString()
  };

  if (tournament.banner_url) {
    embed.image = { url: tournament.banner_url };
  }

  const components = isFull ? [] : [
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

  try {
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
  } catch (err) {
    console.error('Errore aggiornamento embed Discord:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. REQUISITO DI SICUREZZA DISCORD:
  const isValid = verifyDiscordSignature(req);

  if (!isValid) {
    return res.status(401).send('Invalid request signature');
  }

  const interaction = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  // 2. Risposta al PING (type: 1)
  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // 3. Gestione Pressione di Bottoni (type: 3)
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id || '';
    const user = interaction.member?.user || interaction.user;

    if (!user) {
      return res.status(200).json({
        type: 4,
        data: { content: '❌ Impossibile identificare l\'utente Discord.', flags: 64 }
      });
    }

    const discordUserId = user.id;
    const discordUsername = user.username;
    const displayName = user.global_name || user.username;
    const avatarUrl = user.avatar 
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`;

    // --- AZIONE: ISCRIZIONE AL TORNEO ---
    if (customId.startsWith('tr_reg_')) {
      const tournamentId = customId.replace('tr_reg_', '');

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament) {
        return res.status(200).json({
          type: 4,
          data: { content: '❌ Torneo non trovato nel sistema.', flags: 64 }
        });
      }

      // Conteggio iscritti attuali
      const { count } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      const currentCount = count || 0;
      const max = tournament.max_participants || 8;

      if (currentCount >= max) {
        return res.status(200).json({
          type: 4,
          data: { content: `🔴 Spiacenti, il torneo ha già raggiunto il tetto massimo di ${max} partecipanti!`, flags: 64 }
        });
      }

      // Inserisce l'utente
      const { error: insertErr } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          discord_user_id: discordUserId,
          discord_username: discordUsername,
          display_name: displayName,
          avatar_url: avatarUrl
        });

      if (insertErr) {
        if (insertErr.code === '23505') { // Unique constraint violation
          return res.status(200).json({
            type: 4,
            data: { content: 'ℹ️ Sei già iscritto a questo torneo!', flags: 64 }
          });
        }
        return res.status(200).json({
          type: 4,
          data: { content: `❌ Errore durante l'iscrizione: ${insertErr.message}`, flags: 64 }
        });
      }

      // Aggiorna l'embed Discord in tempo reale
      await updateDiscordMessageCount(tournamentId);

      return res.status(200).json({
        type: 4,
        data: {
          content: `🎉 **Iscrizione confermata!** Benvenuto nel torneo *${tournament.name || tournament.title}*!`,
          flags: 64 // Ephemeral
        }
      });
    }

    // --- AZIONE: CANCELLAZIONE ISCRIZIONE ---
    if (customId.startsWith('tr_unreg_')) {
      const tournamentId = customId.replace('tr_unreg_', '');

      const { error: deleteErr } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('discord_user_id', discordUserId);

      if (deleteErr) {
        return res.status(200).json({
          type: 4,
          data: { content: `❌ Errore durante la cancellazione: ${deleteErr.message}`, flags: 64 }
        });
      }

      // Aggiorna l'embed Discord in tempo reale
      await updateDiscordMessageCount(tournamentId);

      return res.status(200).json({
        type: 4,
        data: { content: '🗑️ La tua iscrizione al torneo è stata cancellata.', flags: 64 }
      });
    }

    // --- AZIONE: REGISTRAZIONE RISULTATO MATCH ---
    if (customId.startsWith('tm_win_')) {
      const parts = customId.replace('tm_win_', '').split('_');
      const matchId = parts[0];
      const winnerParticipantId = parts[1];

      const { data: match } = await supabase
        .from('tournament_matches')
        .select('*, p1:player1_id(*), p2:player2_id(*)')
        .eq('id', matchId)
        .single();

      if (!match) {
        return res.status(200).json({
          type: 4,
          data: { content: '❌ Match non trovato.', flags: 64 }
        });
      }

      const p1Discord = match.p1?.discord_user_id;
      const p2Discord = match.p2?.discord_user_id;

      const isParticipant = discordUserId === p1Discord || discordUserId === p2Discord;
      if (!isParticipant) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto i due giocatori di questo match o gli Admin possono registrare il risultato.', flags: 64 }
        });
      }

      const score1 = winnerParticipantId === match.player1_id ? 1 : 0;
      const score2 = winnerParticipantId === match.player2_id ? 1 : 0;

      const { error: updateErr } = await supabase
        .from('tournament_matches')
        .update({
          player1_score: score1,
          player2_score: score2,
          winner_id: winnerParticipantId,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (updateErr) {
        return res.status(200).json({
          type: 4,
          data: { content: `❌ Errore aggiornamento match: ${updateErr.message}`, flags: 64 }
        });
      }

      if (match.next_match_id) {
        const updatePayload = match.next_match_slot === 1 
          ? { player1_id: winnerParticipantId, status: 'in_progress' } 
          : { player2_id: winnerParticipantId, status: 'in_progress' };

        await supabase
          .from('tournament_matches')
          .update(updatePayload)
          .eq('id', match.next_match_id);
      }

      const winnerName = winnerParticipantId === match.player1_id ? match.p1?.display_name : match.p2?.display_name;

      return res.status(200).json({
        type: 4,
        data: {
          content: `🏆 **Risultato registrato con successo!** Vincitore: **${winnerName}**! Il tabellone sul sito si è aggiornato in tempo reale!`,
          flags: 0
        }
      });
    }
  }

  return res.status(400).json({ error: 'Unknown interaction type' });
}
