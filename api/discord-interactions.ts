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
 * Verifica se l'utente Discord ha permessi Staff / Admin (Administrator, Manage Channels, Manage Messages)
 */
function isDiscordStaff(member: any): boolean {
  if (!member) return false;
  if (member.permissions) {
    try {
      const permInt = BigInt(member.permissions);
      const ADMINISTRATOR = BigInt(0x8);
      const MANAGE_CHANNELS = BigInt(0x10);
      const MANAGE_MESSAGES = BigInt(0x2000);
      if ((permInt & ADMINISTRATOR) !== BigInt(0) || 
          (permInt & MANAGE_CHANNELS) !== BigInt(0) || 
          (permInt & MANAGE_MESSAGES) !== BigInt(0)) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

/**
 * Rimuove i tag HTML, i simboli Markdown e formatta le prime 4-5 righe con il link al regolamento completo del torneo sul sito web
 */
function formatDiscordRegulation(input: string, slug?: string): string {
  if (!input) return '';

  let clean = input
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  clean = clean.replace(/<[^>]+>/g, '');

  clean = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  clean = clean.replace(/^#+\s+/gm, '').replace(/[\*_~`]/g, '');

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  const shortLines = lines.slice(0, 5);
  let resultText = shortLines.join('\n');

  if (resultText.length > 350) {
    resultText = resultText.substring(0, 350) + '...';
  }

  const tournamentSlug = slug ? slug.trim() : '';
  const siteUrl = tournamentSlug ? `https://aoe4guide.it/tornei/${tournamentSlug}/regolamento` : 'https://aoe4guide.it/tornei';

  return `${resultText}\n\n👉 **[Continua a leggere il regolamento completo sul sito](${siteUrl})**`;
}

/**
 * Aggiorna in tempo reale l'Embed del messaggio Discord principale con il conteggio iscritti aggiornato
 */
async function updateDiscordMessageCount(tournamentId: string, fallbackChannelId?: string, fallbackMessageId?: string) {
  if (!DISCORD_BOT_TOKEN) return;

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const channelId = tournament?.discord_channel_id || fallbackChannelId;
  const messageId = tournament?.discord_message_id || fallbackMessageId;

  if (!channelId || !messageId) return;

  const { count } = await supabase
    .from('tournament_participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  const currentCount = count || 0;
  const max = tournament?.max_participants || 8;
  const isFull = currentCount >= max;

  const fields: any[] = [
    {
      name: '👥 Posti Iscritti',
      value: `**${currentCount} / ${max}** ${isFull ? '🔴 (ISCRIZIONI CHIUSE)' : ''}`,
      inline: true
    },
    {
      name: '⚔️ Tipologia',
      value: tournament?.type || '1v1',
      inline: true
    }
  ];

  if (tournament?.map) {
    fields.push({
      name: '🗺️ Mappe Torneo',
      value: tournament.map,
      inline: true
    });
  }

  if (tournament?.event_date || tournament?.event_time) {
    const rawDate = tournament.event_date || '';
    const formattedDatePart = rawDate ? (rawDate.includes('/') ? rawDate : rawDate.split('-').reverse().join('/')) : '';
    const formattedDate = [formattedDatePart, tournament.event_time ? `ore ${tournament.event_time}` : ''].filter(Boolean).join(' - ');
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

  if (tournament?.has_regolamento || tournament?.regolamento_content || tournament?.config?.regolamentoContent) {
    const rawText = tournament?.regolamento_content || tournament?.config?.regolamentoContent || '';
    const displayReg = formatDiscordRegulation(rawText, tournament?.slug);
    if (displayReg) {
      fields.push({
        name: '📜 Regolamento',
        value: displayReg,
        inline: false
      });
    }
  }

  const embed: any = {
    title: `🏆 ${(tournament?.name || tournament?.title || 'TORNEO').toUpperCase()}`,
    description: isFull 
      ? `🔒 **ISCRIZIONI CHIUSE!**\nIl tetto massimo di ${max} partecipanti è stato raggiunto.`
      : (tournament?.description || `Sono aperte le iscrizioni per il torneo! Clicca sul bottone qui sotto per iscriverti direttamente da Discord.`),
    color: isFull ? 0x10b981 : 0x06b6d4,
    fields,
    footer: {
      text: 'Manuale Civ • Age of Empires IV',
      icon_url: 'https://aoe4guide.it/favicon.ico'
    },
    timestamp: new Date().toISOString()
  };

  if (tournament?.banner_url) {
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
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
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

/**
 * Helper per chiamate API Discord REST
 */
async function discordApi(endpoint: string, method = 'GET', body?: any) {
  if (!DISCORD_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.ok && res.status !== 204) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.error(`Errore API Discord (${endpoint}):`, err);
    return null;
  }
}

/**
 * Genera l'albero di match ad Eliminazione Diretta nel DB Supabase basato sull'ordine dei Seed
 */
/**
 * Genera l'albero di match ad Eliminazione Diretta nel DB Supabase basato sull'ordine dei Seed
 */
async function generateBracketMatchesInDb(tournamentId: string, participants: any[]) {
  try {
    // Cancella eventuali match precedenti per questo torneo prima di generarne di nuovi
    await supabase
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    // Ordina per seed (1, 2, 3...)
    const sorted = [...participants].sort((a, b) => (a.seed || 99) - (b.seed || 99));
    const n = sorted.length;
    
    // Calcola dimensione potenza di 2 (es. 2, 4, 8, 16)
    let bracketSize = 2;
    while (bracketSize < n) bracketSize *= 2;
    
    const totalRounds = Math.log2(bracketSize);
    const round1MatchesCount = bracketSize / 2;

    // Accoppiamenti Seeding: Seed 1 vs Seed N, Seed 2 vs Seed N-1...
    const pairings: { p1: any | null; p2: any | null }[] = [];
    for (let i = 0; i < round1MatchesCount; i++) {
      const p1 = sorted[i] || null;
      const p2 = sorted[bracketSize - 1 - i] || null;
      pairings.push({ p1, p2 });
    }

    // Inserisci i match dal Turno Finale scendendo fino al Turno 1 per collegare next_match_id
    let prevRoundMatches: any[] = [];

    for (let r = totalRounds; r >= 1; r--) {
      const matchesInRoundCount = Math.pow(2, totalRounds - r);
      const currentRoundInserted: any[] = [];

      for (let m = 1; m <= matchesInRoundCount; m++) {
        let nextMatchId: string | null = null;
        let nextMatchSlot: number | null = null;

        if (r < totalRounds) {
          const parentMatchIndex = Math.floor((m - 1) / 2);
          nextMatchId = prevRoundMatches[parentMatchIndex]?.id || null;
          nextMatchSlot = ((m - 1) % 2) + 1;
        }

        let p1 = null;
        let p2 = null;
        let status = 'pending';

        if (r === 1) {
          const pair = pairings[m - 1];
          p1 = pair?.p1?.id || null;
          p2 = pair?.p2?.id || null;
          status = (p1 && p2) ? 'in_progress' : (p1 || p2) ? 'completed' : 'pending';
        }

        const matchPayload: any = {
          tournament_id: tournamentId,
          round: r,
          match_number: m,
          player1_id: p1,
          player2_id: p2,
          winner_id: (r === 1 && p1 && !p2) ? p1 : (r === 1 && !p1 && p2) ? p2 : null,
          next_match_id: nextMatchId,
          next_match_slot: nextMatchSlot,
          status
        };

        const { data: insertedMatch, error: mInsertErr } = await supabase
          .from('tournament_matches')
          .insert(matchPayload)
          .select()
          .single();

        if (mInsertErr) {
          console.error(`Errore inserimento match R${r}M${m}:`, mInsertErr);
        }

        if (insertedMatch) {
          currentRoundInserted.push(insertedMatch);
        }
      }
      prevRoundMatches = currentRoundInserted;
    }
  } catch (err) {
    console.error('Eccezione durante la generazione dei match:', err);
  }
}

/**
 * Crea i canali testuali dedicati e PRIVATI per ciascun match di un turno specifico (visibili solo ai 2 sfidanti)
 */
async function createMatchChannelsForRound(tournamentId: string, roundNum: number, fallbackGuildId?: string, fallbackCategoryId?: string) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const guildId = tournament?.discord_guild_id || fallbackGuildId;
  const categoryId = tournament?.discord_category_id || fallbackCategoryId;

  if (!guildId) return;

  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', roundNum);

  if (!matches || matches.length === 0) return;

  for (const match of matches) {
    if (!match.player1_id || !match.player2_id) continue;

    const { data: p1 } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('id', match.player1_id)
      .maybeSingle();

    const { data: p2 } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('id', match.player2_id)
      .maybeSingle();

    const p1Tag = p1?.discord_user_id ? `<@${p1.discord_user_id}>` : (p1?.display_name || 'Giocatore 1');
    const p2Tag = p2?.discord_user_id ? `<@${p2.discord_user_id}>` : (p2?.display_name || 'Giocatore 2');

    const cleanP1 = (p1?.display_name || 'p1').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanP2 = (p2?.display_name || 'p2').toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = `⚔️-match-${match.match_number}-${cleanP1}-vs-${cleanP2}`;

    // Configura i permessi in modo che il canale sia PRIVATO e visibile unicamente ai 2 sfidanti (oltre allo Staff)
    const permission_overwrites: any[] = [
      {
        id: guildId, // @everyone role ID
        type: 0, // Role
        deny: '1024' // VIEW_CHANNEL (Nega la visione a tutti gli altri membri)
      }
    ];

    if (p1?.discord_user_id) {
      permission_overwrites.push({
        id: p1.discord_user_id,
        type: 1, // Member
        allow: '1024' // VIEW_CHANNEL (Consenti visione al Giocatore 1)
      });
    }

    if (p2?.discord_user_id) {
      permission_overwrites.push({
        id: p2.discord_user_id,
        type: 1, // Member
        allow: '1024' // VIEW_CHANNEL (Consenti visione al Giocatore 2)
      });
    }

    const newChannel = await discordApi(`/guilds/${guildId}/channels`, 'POST', {
      name: channelName,
      type: 0, // GUILD_TEXT
      parent_id: categoryId || undefined,
      permission_overwrites
    });

    if (newChannel && newChannel.id) {
      await supabase
        .from('tournament_matches')
        .update({ discord_channel_id: newChannel.id, status: 'in_progress' })
        .eq('id', match.id);

      // Attendi 800ms che i permessi del canale si sincronizzino sul backend di Discord
      await new Promise(resolve => setTimeout(resolve, 800));

      const content = `⚔️ **MATCH ${match.match_number} - TURNO ${roundNum}**\n${p1Tag} vs ${p2Tag}: **potete iniziare il vostro match!** ⚔️\n\n🗺️ Mappa: **${tournament?.map || 'Dry Arabia'}** | ⚙️ Formato: **BO1 / Eliminazione Diretta**\n\nAl termine del match, cliccate sul bottone sottostante per registrare il risultato finale.`;

      await discordApi(`/channels/${newChannel.id}/messages`, 'POST', {
        content,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 1,
                label: '🏆 Registra Risultato Match',
                custom_id: `tm_win_prompt_${match.id}`
              }
            ]
          }
        ]
      });
    }
  }
}

/**
 * Elimina l'intera Categoria Discord e tutti i canali testuali/vocali contenuti in essa
 */
async function deleteDiscordCategoryAndChannels(guildId: string, categoryId?: string | null, tournamentName?: string) {
  if (!DISCORD_BOT_TOKEN || !guildId) return;
  try {
    const channels = await discordApi(`/guilds/${guildId}/channels`);
    if (Array.isArray(channels)) {
      let targetCatId = categoryId;
      if (!targetCatId && tournamentName) {
        const cat = channels.find((c: any) => c.type === 4 && (c.name.toUpperCase().includes(tournamentName.toUpperCase()) || c.name.includes('TORNEO')));
        if (cat) targetCatId = cat.id;
      }
      if (targetCatId) {
        const categoryChannels = channels.filter((c: any) => c.parent_id === targetCatId);
        for (const ch of categoryChannels) {
          await discordApi(`/channels/${ch.id}`, 'DELETE');
        }
        await discordApi(`/channels/${targetCatId}`, 'DELETE');
      }
    }
  } catch (err) {
    console.error('Errore eliminazione categoria e canali Discord:', err);
  }
}

/**
 * Aggiorna il messaggio del pannello di controllo Staff nel canale #partecipanti
 */
async function updateStaffControlPanel(tournamentId: string) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament || !tournament.discord_participants_channel_id) return;

  const { data: participants } = await supabase
    .from('tournament_participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true, nullsFirst: false });

  const listText = participants && participants.length > 0
    ? participants.map((p, idx) => `\`#${p.seed || idx + 1}\` <@${p.discord_user_id}> (**${p.display_name}**)`).join('\n')
    : '*Nessun partecipante ancora iscritto.*';

  const count = participants ? participants.length : 0;
  const max = tournament.max_participants || 8;
  const isFull = count >= max;

  const isCompleted = tournament.status === 'completato' || tournament.status === 'Concluso';

  const content = `⚙️ **PANNELLO DI CONTROLLO STAFF - TORNEO: ${(tournament.name || 'TORNEO').toUpperCase()}**\n` +
    `Stato Attuale: **${isCompleted ? '🏆 COMPLETATO (VINCITORE PROCLAMATO)' : '⏳ IN CORSO / REGISTRAZIONE'}**\n` +
    `Iscritti Attuali: **${count} / ${max}** ${isFull ? '🔴 (TETTO MASSIMO RAGGIUNTO!)' : ''}\n\n` +
    `**LISTA PARTECIPANTE & SEEDING:**\n${listText}\n\n` +
    `*Gli Staff possono gestire il torneo tramite i pulsanti sottostanti.*`;

  const row1Components: any[] = [];

  if (isCompleted) {
    row1Components.push({
      type: 2,
      style: 1, // Primary (Blu)
      label: '🏆 Chiudi Torneo & Archivia',
      custom_id: `tr_close_prompt_${tournamentId}`
    });
  } else {
    row1Components.push({
      type: 2,
      style: 1,
      label: '🚀 Avvia Torneo Ora',
      custom_id: `tr_start_${tournamentId}`
    });
    row1Components.push({
      type: 2,
      style: 3, // Success (Verde)
      label: '📈 Aumenta Tetto (+4)',
      custom_id: `tr_max_inc_${tournamentId}`
    });
    row1Components.push({
      type: 2,
      style: 2,
      label: '🔀 Gestisci Seeding',
      custom_id: `tr_seed_menu_${tournamentId}`
    });
    row1Components.push({
      type: 2,
      style: 4,
      label: '⛔ Rimuovi Partecipante',
      custom_id: `tr_kick_menu_${tournamentId}`
    });
  }

  const row2Components = [
    {
      type: 2,
      style: 4, // Danger (Rosso)
      label: '⚠️ Annulla Torneo',
      custom_id: `tr_cancel_prompt_${tournamentId}`
    }
  ];

  const components = [
    { type: 1, components: row1Components },
    { type: 1, components: row2Components }
  ];

  if (tournament.discord_control_message_id) {
    await discordApi(`/channels/${tournament.discord_participants_channel_id}/messages/${tournament.discord_control_message_id}`, 'PATCH', {
      content,
      components
    });
  } else {
    const msg = await discordApi(`/channels/${tournament.discord_participants_channel_id}/messages`, 'POST', {
      content,
      components
    });

    if (msg && msg.id) {
      await supabase
        .from('tournaments')
        .update({ discord_control_message_id: msg.id })
        .eq('id', tournamentId);
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isValid = verifyDiscordSignature(req);
  if (!isValid) {
    return res.status(401).send('Invalid request signature');
  }

  const interaction = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  // 1. PING (type 1)
  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  const user = interaction.member?.user || interaction.user;
  const discordUserId = user?.id;
  const discordUsername = user?.username;
  const displayName = user?.global_name || user?.username;
  const avatarUrl = user?.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user?.discriminator || '0') % 5}.png`;

  // 2. COMPONENT INTERACTION (type 3 - Bottone o Select Menu)
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id || '';

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
          data: { content: '❌ Torneo non trovato.', flags: 64 }
        });
      }

      // Blocca iscrizioni se torneo annullato o già avviato
      if (tournament.status === 'annullato') {
        return res.status(200).json({
          type: 4,
          data: { content: '🔴 **Torneo annullato.** Non è più possibile iscriversi a questo torneo.', flags: 64 }
        });
      }
      if (tournament.status === 'in_corso' || tournament.status === 'In corso' || tournament.status === 'completato' || tournament.status === 'Concluso') {
        return res.status(200).json({
          type: 4,
          data: { content: '🔒 **Le iscrizioni sono chiuse.** Il torneo è già in corso o concluso.', flags: 64 }
        });
      }

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

      const newSeed = currentCount + 1;

      // Inserimento con fallback se la colonna 'seed' non è ancora stata creata in Supabase PostgREST
      let insertErr: any = null;

      const { error: errWithSeed } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          discord_user_id: discordUserId,
          discord_username: discordUsername,
          display_name: displayName,
          avatar_url: avatarUrl,
          seed: newSeed
        });

      if (errWithSeed) {
        if (errWithSeed.message?.includes("'seed'") || errWithSeed.message?.includes('schema cache') || errWithSeed.code === 'PGRST204') {
          // Retry inserimento senza il campo 'seed'
          const { error: errWithoutSeed } = await supabase
            .from('tournament_participants')
            .insert({
              tournament_id: tournamentId,
              discord_user_id: discordUserId,
              discord_username: discordUsername,
              display_name: displayName,
              avatar_url: avatarUrl
            });
          insertErr = errWithoutSeed;
        } else {
          insertErr = errWithSeed;
        }
      }

      if (insertErr) {
        if (insertErr.code === '23505') {
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

      // 1. Assicurati che il canale #partecipanti esista ed appartenga al server (cerca prima quelli esistenti)
      const guildId = tournament.discord_guild_id || interaction.guild_id;
      let partChannelId = tournament.discord_participants_channel_id;

      if (guildId) {
        const guildChannels = await discordApi(`/guilds/${guildId}/channels`);
        if (Array.isArray(guildChannels)) {
          const existingPartCh = guildChannels.find((c: any) => c.name.includes('partecipanti'));
          if (existingPartCh) {
            partChannelId = existingPartCh.id;
          }
        }

        if (!partChannelId) {
          const newCh = await discordApi(`/guilds/${guildId}/channels`, 'POST', {
            name: '👥-partecipanti',
            type: 0,
            parent_id: tournament.discord_category_id || undefined
          });

          if (newCh && newCh.id) {
            partChannelId = newCh.id;
          }
        }

        if (partChannelId && partChannelId !== tournament.discord_participants_channel_id) {
          await supabase
            .from('tournaments')
            .update({ 
              discord_guild_id: guildId,
              discord_participants_channel_id: partChannelId 
            })
            .eq('id', tournamentId);
        }
      }

      // 2. Notifica l'iscrizione UNICAMENTE nel canale #partecipanti con i pulsanti di controllo per lo Staff
      if (partChannelId) {
        const { data: pRow } = await supabase
          .from('tournament_participants')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('discord_user_id', discordUserId)
          .single();

        const participantRecordId = pRow?.id || discordUserId;

        await discordApi(`/channels/${partChannelId}/messages`, 'POST', {
          content: `🎉 <@${discordUserId}> (**${displayName}**) si è iscritto al torneo! Seed #${newSeed}`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2, // Secondary (Grigio)
                  label: '🔀 Imposta Seed',
                  custom_id: `tr_seed_single_${participantRecordId}`
                },
                {
                  type: 2,
                  style: 4, // Danger (Rosso)
                  label: '⛔ Kikka Partecipante',
                  custom_id: `tr_kick_single_${participantRecordId}`
                }
              ]
            }
          ]
        });

        // 3. Aggiorna il pannello controlli Staff
        await updateStaffControlPanel(tournamentId);
      }

      // 4. Aggiorna l'embed principale in #iscrizioni
      await updateDiscordMessageCount(tournamentId, interaction.channel_id, interaction.message?.id);

      return res.status(200).json({
        type: 4,
        data: {
          content: `🎉 **Iscrizione confermata!** Benvenuto nel torneo *${tournament.name || tournament.title}*! Controlla il canale <#${partChannelId}> per gli aggiornamenti!`,
          flags: 64 // Ephemeral (Visibile solo all'utente)
        }
      });
    }

    // --- AZIONE: CANCELLAZIONE ISCRIZIONE ---
    if (customId.startsWith('tr_unreg_')) {
      const tournamentId = customId.replace('tr_unreg_', '');

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('discord_user_id', discordUserId);

      // Trova il canale #partecipanti in modo robusto nel server
      const guildId = tournament?.discord_guild_id || interaction.guild_id;
      let partChannelId = tournament?.discord_participants_channel_id;

      if (guildId) {
        const guildChannels = await discordApi(`/guilds/${guildId}/channels`);
        if (Array.isArray(guildChannels)) {
          const existingPartCh = guildChannels.find((c: any) => c.name.includes('partecipanti'));
          if (existingPartCh) {
            partChannelId = existingPartCh.id;
          }
        }
      }

      // Notifica pubblica a tutti nel canale #partecipanti
      if (partChannelId) {
        await discordApi(`/channels/${partChannelId}/messages`, 'POST', {
          content: `🚶 <@${discordUserId}> (**${displayName}**) ha cancellato la propria iscrizione dal torneo.`
        });
      }

      await updateDiscordMessageCount(tournamentId, interaction.channel_id, interaction.message?.id);
      await updateStaffControlPanel(tournamentId);

      return res.status(200).json({
        type: 4,
        data: { content: '🗑️ La tua iscrizione al torneo è stata cancellata.', flags: 64 } // Ephemeral
      });
    }

    // --- AZIONE STAFF: PROMPT SEED SINGOLO PARTECIPANTE ---
    if (customId.startsWith('tr_seed_single_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto i membri dello Staff / Admin possono modificare il Seed dei partecipanti.', flags: 64 }
        });
      }

      const participantId = customId.replace('tr_seed_single_', '');

      const { data: p } = await supabase
        .from('tournament_participants')
        .select('*, tournament:tournament_id(*)')
        .eq('id', participantId)
        .single();

      if (!p) {
        return res.status(200).json({
          type: 4,
          data: { content: '❌ Partecipante non trovato.', flags: 64 }
        });
      }

      const max = p.tournament?.max_participants || 8;
      const options: any[] = [];
      for (let i = 1; i <= Math.min(max, 16); i++) {
        options.push({
          label: `Seed #${i} ${i === 1 ? '(Testa di Serie #1)' : ''}`,
          value: `${p.id}___${i}___${p.tournament_id}`,
          description: `Assegna la posizione di Seed #${i} a ${p.display_name || p.discord_username}`
        });
      }

      return res.status(200).json({
        type: 4,
        data: {
          content: `🔀 **Seleziona la nuova Posizione Seed per <@${p.discord_user_id}> (${p.display_name}):**`,
          flags: 64, // Ephemeral
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3, // String Select Menu
                  custom_id: 'tr_seed_exec',
                  placeholder: 'Seleziona Posizione Seed...',
                  options
                }
              ]
            }
          ]
        }
      });
    }

    // --- AZIONE STAFF: ESECUZIONE SEED SINGOLO ---
    if (customId === 'tr_seed_exec') {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto lo Staff / Admin può modificare i Seed.', flags: 64 }
        });
      }

      const selectedValue = interaction.data?.values?.[0] || '';
      const [participantId, targetSeedStr, tournamentId] = selectedValue.split('___');
      const targetSeed = parseInt(targetSeedStr || '1');

      const { data: p } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('id', participantId)
        .single();

      if (!p) {
        return res.status(200).json({
          type: 4,
          data: { content: '❌ Partecipante non trovato.', flags: 64 }
        });
      }

      // Aggiorna il Seed nel DB Supabase
      await supabase
        .from('tournament_participants')
        .update({ seed: targetSeed })
        .eq('id', participantId);

      // Aggiorna il pannello controlli Staff in #partecipanti
      await updateStaffControlPanel(tournamentId);

      return res.status(200).json({
        type: 7, // UPDATE_MESSAGE: Aggiorna ed azzera i bottoni del prompt in-place!
        data: { content: `✅ Seed di <@${p.discord_user_id}> (**${p.display_name}**) aggiornato a **Seed #${targetSeed}**!`, components: [] }
      });
    }

    // --- AZIONE STAFF: PROMPT KICK SINGOLO PARTECIPANTE ---
    if (customId.startsWith('tr_kick_single_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto i membri dello Staff / Admin possono espellere i partecipanti.', flags: 64 }
        });
      }

      const participantId = customId.replace('tr_kick_single_', '');

      const { data: p } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('id', participantId)
        .single();

      if (!p) {
        return res.status(200).json({
          type: 4,
          data: { content: '❌ Partecipante non trovato.', flags: 64 }
        });
      }

      return res.status(200).json({
        type: 4,
        data: {
          content: `⛔ **CONFERMI L'ESPULSIONE DI <@${p.discord_user_id}> (${p.display_name}) DAL TORNEO?**`,
          flags: 64, // Ephemeral Popup
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4, // Danger Rosso
                  label: '✅ Sì, Kikka Giocatore',
                  custom_id: `tr_kick_confirm_${p.id}`
                },
                {
                  type: 2,
                  style: 2, // Secondary Grigio
                  label: '❌ No, Annulla',
                  custom_id: `tr_kick_abort_${p.id}`
                }
              ]
            }
          ]
        }
      });
    }

    // --- AZIONE STAFF: CONFERMA KICK SINGOLO ---
    if (customId.startsWith('tr_kick_confirm_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto lo Staff / Admin può espellere i partecipanti.', flags: 64 }
        });
      }

      const participantId = customId.replace('tr_kick_confirm_', '');

      const { data: p } = await supabase
        .from('tournament_participants')
        .select('*, tournament:tournament_id(*)')
        .eq('id', participantId)
        .single();

      if (p) {
        await supabase
          .from('tournament_participants')
          .delete()
          .eq('id', participantId);

        const tournamentId = p.tournament_id;
        const partChannelId = p.tournament?.discord_participants_channel_id;

        // Notifica nel canale #partecipanti
        if (partChannelId) {
          await discordApi(`/channels/${partChannelId}/messages`, 'POST', {
            content: `⛔ <@${p.discord_user_id}> (**${p.display_name}**) è stato rimosso dal torneo dallo Staff.`
          });
        }

        await updateDiscordMessageCount(tournamentId);
        await updateStaffControlPanel(tournamentId);
      }

      return res.status(200).json({
        type: 7, // UPDATE_MESSAGE: Rimuove i pulsanti di conferma in-place!
        data: { content: `✅ Partecipante espulso con successo dal torneo.`, components: [] }
      });
    }

    // --- AZIONE STAFF: ABORT KICK SINGOLO ---
    if (customId.startsWith('tr_kick_abort_')) {
      return res.status(200).json({
        type: 7,
        data: { content: 'ℹ️ Operazione annullata.', components: [] }
      });
    }

    // --- AZIONE STAFF: MENU KICK ---
    if (customId.startsWith('tr_kick_menu_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto gli Staff / Admin possono espellere partecipanti.', flags: 64 }
        });
      }

      const tournamentId = customId.replace('tr_kick_menu_', '');
      const { data: participants } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (!participants || participants.length === 0) {
        return res.status(200).json({
          type: 4,
          data: { content: 'ℹ️ Nessun partecipante da rimuovere.', flags: 64 }
        });
      }

      const options = participants.map(p => ({
        label: p.display_name || p.discord_username,
        value: `${tournamentId}___${p.discord_user_id}`,
        description: `Seed #${p.seed || 1} - ${p.discord_username}`
      }));

      return res.status(200).json({
        type: 4,
        data: {
          content: '⛔ **Seleziona il partecipante da rimuovere dal torneo:**',
          flags: 64,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3, // String Select Menu
                  custom_id: 'tr_kick_exec',
                  placeholder: 'Seleziona Giocatore...',
                  options
                }
              ]
            }
          ]
        }
      });
    }

    // --- AZIONE STAFF: ESECUZIONE KICK ---
    if (customId === 'tr_kick_exec') {
      const selectedValue = interaction.data?.values?.[0] || '';
      const [tournamentId, kickUserId] = selectedValue.split('___');

      await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('discord_user_id', kickUserId);

      await updateDiscordMessageCount(tournamentId);
      await updateStaffControlPanel(tournamentId);

      return res.status(200).json({
        type: 7,
        data: { content: `✅ Partecipante <@${kickUserId}> rimosso dal torneo dallo Staff.`, components: [] }
      });
    }

    // --- AZIONE STAFF: PROMPT ANNULLA TORNEO ---
    if (customId.startsWith('tr_cancel_prompt_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto gli Staff / Admin possono annullare il torneo.', flags: 64 }
        });
      }

      const tournamentId = customId.replace('tr_cancel_prompt_', '');

      return res.status(200).json({
        type: 4,
        data: {
          content: `⚠️ **SEI SICURO DI VOLER ANNULLARE IL TORNEO?**\n\nQuesta azione eliminerà **immediatamente l'intera Categoria Discord**, tutti i canali testuali e vocali creati, ed annullerà il torneo sul sito web. L'operazione non può essere annullata.`,
          flags: 64, // Ephemeral (Popup visibile solo allo Staff)
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4, // Danger (Rosso)
                  label: '✅ Sì, Annulla Torneo ed Elimina Canali',
                  custom_id: `tr_cancel_confirm_${tournamentId}`
                },
                {
                  type: 2,
                  style: 2, // Secondary (Grigio)
                  label: '❌ No, Annulla Operazione',
                  custom_id: `tr_cancel_abort_${tournamentId}`
                }
              ]
            }
          ]
        }
      });
    }

    // --- AZIONE STAFF: CONFERMA ANNULLA TORNEO ---
    if (customId.startsWith('tr_cancel_confirm_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto gli Staff / Admin possono annullare il torneo.', flags: 64 }
        });
      }

      const tournamentId = customId.replace('tr_cancel_confirm_', '');

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      // 1. Aggiorna lo stato del torneo a 'annullato' nel DB Supabase
      await supabase
        .from('tournaments')
        .update({ status: 'annullato' })
        .eq('id', tournamentId);

      // 2. Elimina i canali dei match specifici salvati in Supabase (per sicurezza, anche se non sono figli della categoria)
      const guildId = tournament?.discord_guild_id || interaction.guild_id;
      const categoryId = tournament?.discord_category_id;

      if (guildId) {
        // 2a. Recupera tutti i canali match da Supabase e cancellali esplicitamente
        const { data: matchRows } = await supabase
          .from('tournament_matches')
          .select('id, discord_channel_id')
          .eq('tournament_id', tournamentId)
          .not('discord_channel_id', 'is', null);

        if (matchRows && matchRows.length > 0) {
          for (const m of matchRows) {
            if (m.discord_channel_id) {
              try {
                await discordApi(`/channels/${m.discord_channel_id}`, 'DELETE');
              } catch (_) {}
            }
          }
          // Pulisce i riferimenti ai canali nel DB
          await supabase
            .from('tournament_matches')
            .update({ discord_channel_id: null, status: 'cancelled' })
            .eq('tournament_id', tournamentId);
        }

        // 2b. Elimina la categoria e gli altri canali (brackets, partecipanti, vocale, ecc.)
        await deleteDiscordCategoryAndChannels(guildId, categoryId, tournament?.name);
      }

      return res.status(200).json({
        type: 7,
        data: {
          content: `🗑️ **Torneo annullato con successo!** La Categoria Discord ed i canali dedicati sono stati eliminati ed il torneo è stato annullato.`,
          components: []
        }
      });
    }

    // --- AZIONE STAFF: ABORT ANNULLA TORNEO ---
    if (customId.startsWith('tr_cancel_abort_')) {
      return res.status(200).json({
        type: 7,
        data: { content: 'ℹ️ Operazione annullata. Il torneo rimane attivo.', components: [] }
      });
    }

    // --- AZIONE STAFF: PROMPT CHIUDI TORNEO (SOLO A TORNEO COMPLETATO) ---
    if (customId.startsWith('tr_close_prompt_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto gli Staff / Admin possono chiudere ed archiviare il torneo.', flags: 64 }
        });
      }

      const tournamentId = customId.replace('tr_close_prompt_', '');

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      const isCompleted = tournament?.status === 'completato' || tournament?.status === 'Concluso';
      if (!isCompleted) {
        return res.status(200).json({
          type: 4,
          data: { content: '⚠️ Il torneo può essere chiuso solo una volta che il vincitore finale è stato proclamato!', flags: 64 }
        });
      }

      return res.status(200).json({
        type: 4,
        data: {
          content: `🏆 **CONFERMI LA CHIUSURA ED ARCHIVIAZIONE DEL TORNEO COMPLETATO?**\n\nQuesta azione archivierà il torneo sul sito web ed **eliminerà la Categoria Discord ed i canali** del torneo concluso.`,
          flags: 64, // Ephemeral
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1, // Primary (Blu)
                  label: '✅ Sì, Chiudi ed Archivia Canali',
                  custom_id: `tr_close_confirm_${tournamentId}`
                },
                {
                  type: 2,
                  style: 2, // Secondary (Grigio)
                  label: '❌ No, Annulla Operazione',
                  custom_id: `tr_close_abort_${tournamentId}`
                }
              ]
            }
          ]
        }
      });
    }

    // --- AZIONE STAFF: CONFERMA CHIUDI TORNEO ---
    if (customId.startsWith('tr_close_confirm_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto gli Staff / Admin possono chiudere ed archiviare il torneo.', flags: 64 }
        });
      }

      const tournamentId = customId.replace('tr_close_confirm_', '');

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      // 1. Aggiorna lo stato a 'concluso' nel DB
      await supabase
        .from('tournaments')
        .update({ status: 'concluso' })
        .eq('id', tournamentId);

      // 2. Elimina la Categoria Discord e tutti i canali contenuti
      const guildId = tournament?.discord_guild_id || interaction.guild_id;
      const categoryId = tournament?.discord_category_id;

      if (guildId) {
        await deleteDiscordCategoryAndChannels(guildId, categoryId, tournament?.name);
      }

      return res.status(200).json({
        type: 7,
        data: {
          content: `🏆 **Torneo chiuso ed archiviato con successo!** La Categoria ed i canali Discord sono stati rimossi.`,
          components: []
        }
      });
    }

    // --- AZIONE STAFF: ABORT CHIUDI TORNEO ---
    if (customId.startsWith('tr_close_abort_')) {
      return res.status(200).json({
        type: 7,
        data: { content: 'ℹ️ Operazione annullata. Il torneo rimane visibile.', components: [] }
      });
    }

    // --- AZIONE STAFF: AUMENTA TETTO MASSIMO PARTECIPANTI (+4) ---
    if (customId.startsWith('tr_max_inc_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto gli Staff / Admin possono aumentare il tetto massimo del torneo.', flags: 64 }
        });
      }

      const tournamentId = customId.replace('tr_max_inc_', '');

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament) {
        return res.status(200).json({
          type: 4,
          data: { content: '❌ Torneo non trovato.', flags: 64 }
        });
      }

      const currentMax = tournament.max_participants || 8;
      const newMax = currentMax + 4;

      // 1. Aggiorna DB Supabase
      await supabase
        .from('tournaments')
        .update({ max_participants: newMax })
        .eq('id', tournamentId);

      // 2. Aggiorna l'embed principale in #iscrizioni (riapre i bottoni se era pieno!)
      await updateDiscordMessageCount(tournamentId);

      // 3. Aggiorna il pannello controlli Staff in #partecipanti
      await updateStaffControlPanel(tournamentId);

      // 4. Notifica nel canale #partecipanti
      if (tournament.discord_participants_channel_id) {
        await discordApi(`/channels/${tournament.discord_participants_channel_id}/messages`, 'POST', {
          content: `📈 **TETTO MASSIMO AUMENTATO DA <@${discordUserId}>!** Il tetto partecipanti è stato ampliato da **${currentMax}** a **${newMax}**! Le iscrizioni sono riaperte!`
        });
      }

      return res.status(200).json({
        type: 4,
        data: {
          content: `✅ **Tetto massimo aumentato con successo!** Nuovo limite: **${newMax} posti**. Le iscrizioni sono state riaperte sia su Discord che sul sito web!`,
          flags: 64
        }
      });
    }

    // --- AZIONE STAFF: AVVIO TORNEO ORA ---
    if (customId.startsWith('tr_start_')) {
      if (!isDiscordStaff(interaction.member)) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto gli Staff / Admin possono lanciare ed avviare il torneo.', flags: 64 }
        });
      }

      const tournamentId = customId.replace('tr_start_', '');

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      const { data: participants } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (!participants || participants.length < 2) {
        return res.status(200).json({
          type: 4,
          data: { content: '⚠️ Occorrono almeno 2 partecipanti iscritti per lanciare il torneo!', flags: 64 }
        });
      }

      // 1. Aggiorna stato torneo nel DB
      await supabase
        .from('tournaments')
        .update({ status: 'in_corso', current_round: 1 })
        .eq('id', tournamentId);

      // 2. Genera il tabellone ad eliminazione diretta nel DB
      await generateBracketMatchesInDb(tournamentId, participants);

      // 3. Crea o Riusa i canali #brackets e #risultati nella categoria
      const guildId = tournament?.discord_guild_id || interaction.guild_id;
      let categoryId = tournament?.discord_category_id;

      if (guildId) {
        const guildChannels = await discordApi(`/guilds/${guildId}/channels`);
        let bracketChId: string | null = null;
        let resultsChId: string | null = null;

        if (Array.isArray(guildChannels)) {
          if (!categoryId) {
            const existingCat = guildChannels.find((c: any) => c.type === 4 && (c.name.toUpperCase().includes((tournament?.name || '').toUpperCase()) || c.name.includes('TORNEO')));
            if (existingCat) categoryId = existingCat.id;
          }

          const existingBracket = guildChannels.find((c: any) => c.name.includes('brackets'));
          if (existingBracket) bracketChId = existingBracket.id;

          const existingResults = guildChannels.find((c: any) => c.name.includes('risultati'));
          if (existingResults) resultsChId = existingResults.id;
        }

        // Salva i riferimenti guildId e categoryId su Supabase
        await supabase
          .from('tournaments')
          .update({
            discord_guild_id: guildId,
            discord_category_id: categoryId || null
          })
          .eq('id', tournamentId);

        if (!bracketChId) {
          const bracketCh = await discordApi(`/guilds/${guildId}/channels`, 'POST', {
            name: '⚔️-brackets',
            type: 0,
            parent_id: categoryId || undefined
          });
          if (bracketCh && bracketCh.id) bracketChId = bracketCh.id;
        }

        if (bracketChId) {
          const siteUrl = `https://aoe4guide.it/tornei/${tournament.slug}`;
          await discordApi(`/channels/${bracketChId}/messages`, 'POST', {
            content: `⚔️ **TABELLONE TORNEO LIVE**\nConsulta ed incrocia il tabellone ad eliminazione diretta aggiornato in tempo reale sul sito web:\n👉 ${siteUrl}`
          });
        }

        if (!resultsChId) {
          const resultsCh = await discordApi(`/guilds/${guildId}/channels`, 'POST', {
            name: '🏆-risultati',
            type: 0,
            parent_id: categoryId || undefined
          });
          if (resultsCh && resultsCh.id) resultsChId = resultsCh.id;
        }

        if (resultsChId) {
          await discordApi(`/channels/${resultsChId}/messages`, 'POST', {
            content: `🏆 **CANALE RISULTATI**\nI punteggi ufficiali ed i vincitori di ciascun scontro saranno annunciati qui in tempo reale!`
          });
        }

        // Canale Vocale Generico (type 2 = GUILD_VOICE)
        let voiceChId: string | null = null;
        if (Array.isArray(guildChannels)) {
          const voiceChName = (tournament.name || 'TORNEO').toUpperCase();
          const existingVoice = guildChannels.find((c: any) => c.type === 2 && (c.name.toUpperCase().includes(voiceChName) || c.name.includes('TORNEO')));
          if (existingVoice) voiceChId = existingVoice.id;
        }

        if (!voiceChId) {
          await discordApi(`/guilds/${guildId}/channels`, 'POST', {
            name: `🔊 ${(tournament.name || 'TORNEO').toUpperCase()}`,
            type: 2,
            parent_id: categoryId || undefined
          });
        }

        // 4. Crea i canali singoli PRIVATI dei match del Turno 1
        await createMatchChannelsForRound(tournamentId, 1, guildId, categoryId);
      }

      return res.status(200).json({
        type: 4,
        data: {
          content: `🚀 **TORNEO AVVIATO CON SUCCESSO!**\nIl tabellone è stato generato ed i canali testuali dei match del Turno 1 sono stati aperti!`,
          flags: 64
        }
      });
    }

    // --- AZIONE: PROMPT VINCITORE MATCH ---
    if (customId.startsWith('tm_win_prompt_')) {
      const matchId = customId.replace('tm_win_prompt_', '');

      const { data: match } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!match) {
        return res.status(200).json({
          type: 4,
          data: { content: '❌ Match non trovato.', flags: 64 }
        });
      }

      const { data: p1 } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('id', match.player1_id)
        .maybeSingle();

      const { data: p2 } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('id', match.player2_id)
        .maybeSingle();

      const isStaff = isDiscordStaff(interaction.member);
      const isP1 = discordUserId === p1?.discord_user_id;
      const isP2 = discordUserId === p2?.discord_user_id;

      if (!isP1 && !isP2 && !isStaff) {
        return res.status(200).json({
          type: 4,
          data: { content: '⛔ Soltanto i due sfidanti di questo scontro o lo Staff possono registrare il risultato.', flags: 64 }
        });
      }

      return res.status(200).json({
        type: 4,
        data: {
          content: '🏆 **Seleziona il Vincitore Ufficiale di questo Match:**',
          flags: 64,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: 'tm_win_exec',
                  placeholder: 'Seleziona Vincitore...',
                  options: [
                    {
                      label: `Vincitore: ${p1?.display_name || p1?.discord_username}`,
                      value: `${match.id}___${p1?.id}`
                    },
                    {
                      label: `Vincitore: ${p2?.display_name || p2?.discord_username}`,
                      value: `${match.id}___${p2?.id}`
                    }
                  ]
                }
              ]
            }
          ]
        }
      });
    }

    // --- AZIONE: ESECUZIONE VINCITORE MATCH & AVANZAMENTO TURNO ---
    if (customId === 'tm_win_exec') {
      const selectedValue = interaction.data?.values?.[0] || '';
      const [matchId, winnerParticipantId] = selectedValue.split('___');

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

      const score1 = winnerParticipantId === match.player1_id ? 1 : 0;
      const score2 = winnerParticipantId === match.player2_id ? 1 : 0;
      const winner = winnerParticipantId === match.player1_id ? match.p1 : match.p2;

      // 1. Salva vincitore match nel DB
      await supabase
        .from('tournament_matches')
        .update({
          player1_score: score1,
          player2_score: score2,
          winner_id: winnerParticipantId,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      // 2. Avanza vincitore al match successivo
      if (match.next_match_id) {
        const updatePayload = match.next_match_slot === 1 
          ? { player1_id: winnerParticipantId, status: 'in_progress' } 
          : { player2_id: winnerParticipantId, status: 'in_progress' };

        await supabase
          .from('tournament_matches')
          .update(updatePayload)
          .eq('id', match.next_match_id);
      }

      // 3. Invia conferma nel canale del match
      await discordApi(`/channels/${interaction.channel_id}/messages`, 'POST', {
        content: `🎉 **MATCH COMPLETATO!** Vincitore proclamato: <@${winner?.discord_user_id}> (**${winner?.display_name}**)!`
      });

      // 4. Invia notifica nel canale #risultati
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', match.tournament_id)
        .single();

      if (tournament && tournament.discord_guild_id) {
        const { data: channels } = await fetch(`https://discord.com/api/v10/guilds/${tournament.discord_guild_id}/channels`, {
          headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        }).then(r => r.json());

        const resultsCh = channels?.find((c: any) => c.name.includes('risultati'));
        if (resultsCh) {
          await discordApi(`/channels/${resultsCh.id}/messages`, 'POST', {
            content: `🏆 **RISULTATO MATCH ${match.match_number} (Turno ${match.round})**: <@${winner?.discord_user_id}> ha vinto contro ${winnerParticipantId === match.player1_id ? (match.p2?.display_name || 'SFIDANTE') : (match.p1?.display_name || 'SFIDANTE')}!`
          });
        }
      }

      // 5. Verifica se tutti i match del Turno attuale sono completati per avanzare di turno
      const currentRoundNum = match.round;
      const { data: currentRoundMatches } = await supabase
        .from('tournament_matches')
        .select('id, status')
        .eq('tournament_id', match.tournament_id)
        .eq('round', currentRoundNum);

      const allRoundCompleted = currentRoundMatches && currentRoundMatches.every(m => m.status === 'completed');

      if (allRoundCompleted && tournament) {
        // Controlla se c'è un turno successivo
        const nextRoundNum = currentRoundNum + 1;
        const { data: nextRoundMatches } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', match.tournament_id)
          .eq('round', nextRoundNum);

        if (nextRoundMatches && nextRoundMatches.length > 0) {
          // Avanza di turno e crea i canali match per il turno successivo
          await supabase
            .from('tournaments')
            .update({ current_round: nextRoundNum })
            .eq('id', match.tournament_id);

          await createMatchChannelsForRound(match.tournament_id, nextRoundNum);
        } else {
          // Torneo completato! Incoronazione Vincitore Finale
          await supabase
            .from('tournaments')
            .update({ status: 'completato' })
            .eq('id', match.tournament_id);

          if (tournament.discord_guild_id) {
            const { data: channels } = await fetch(`https://discord.com/api/v10/guilds/${tournament.discord_guild_id}/channels`, {
              headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
            }).then(r => r.json());

            const resultsCh = channels?.find((c: any) => c.name.includes('risultati'));
            if (resultsCh) {
              await discordApi(`/channels/${resultsCh.id}/messages`, 'POST', {
                content: `👑 **IL TORNEO ${tournament.name.toUpperCase()} È CONCLUSO!**\n\n🎉 **VINCITORE FINALE E CAMPIONE**: <@${winner?.discord_user_id}> (**${winner?.display_name}**)! Congratulazioni!`
              });
            }
          }
        }
      }

      return res.status(200).json({
        type: 4,
        data: {
          content: `✅ Risultato registrato con successo! Il tabellone sul sito web è stato aggiornato in tempo reale!`,
          flags: 64
        }
      });
    }
  }

  return res.status(400).json({ error: 'Unknown interaction type' });
}
