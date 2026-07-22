import { supabase } from '../lib/supabaseClient';
import { generateSingleEliminationBracket } from './bracketEngine';

export interface LaunchTournamentParams {
  tournamentId: string;
  name: string;
  type?: string;
  map?: string;
  eventDate?: string;
  eventTime?: string;
  maxParticipants: number;
  channelId: string;
  description?: string;
  bannerUrl?: string;
  hasRegolamento?: boolean;
  regolamentoContent?: string;
  slug?: string;
}

/**
 * Invia la richiesta al backend serverless per lanciare il torneo ed inviare il messaggio Embed su Discord
 */
export async function launchTournamentOnDiscord(params: LaunchTournamentParams) {
  const res = await fetch('/api/discord-launch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.details || data.error || `Errore backend (${res.status})`);
  }

  return data;
}

/**
 * Aggiorna il messaggio del torneo su Discord con il numero aggiornato di iscritti
 */
export async function refreshDiscordTournamentEmbed(tournamentId: string) {
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

  // Se è pieno ed il torneo è ancora in stato 'open', scatena la generazione del tabellone!
  if (isFull && tournament.status === 'open') {
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (participants && participants.length >= 2) {
      await generateSingleEliminationBracket(tournamentId, participants);
    }
  }
}
