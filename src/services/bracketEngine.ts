import { supabase } from '../lib/supabaseClient';

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  discord_user_id: string;
  discord_username: string;
  display_name: string;
  avatar_url?: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  next_match_id: string | null;
  next_match_slot: number;
  status: 'pending' | 'in_progress' | 'completed';
  player1?: TournamentParticipant | null;
  player2?: TournamentParticipant | null;
  winner?: TournamentParticipant | null;
}

/**
 * Genera la struttura ad eliminazione diretta (Single Elimination) per N partecipanti
 */
export async function generateSingleEliminationBracket(
  tournamentId: string,
  participants: TournamentParticipant[]
) {
  if (participants.length < 2) {
    throw new Error('Servono almeno 2 partecipanti per generare il tabellone');
  }

  // Shuffle casale dei partecipanti
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // Trova la potenza di 2 più vicina (es: per 6 iscritti -> bracket da 8 con Bye, per 16 -> 16)
  let bracketSize = 2;
  while (bracketSize < shuffled.length) {
    bracketSize *= 2;
  }

  const totalRounds = Math.log2(bracketSize);
  const matchMap: Map<string, any> = new Map(); // key: "round_matchNum"

  // 1. Crea la struttura di tutti i match dal Round finale a salire per collegare i next_match_id

  // Costruiamo i match a ritroso dal Round Finale (totalRounds) al Round 1
  for (let r = totalRounds; r >= 1; r--) {
    const matchesInRound = Math.pow(2, totalRounds - r);
    for (let m = 1; m <= matchesInRound; m++) {
      const matchKey = `${r}_${m}`;
      let nextMatchKey: string | null = null;
      let nextMatchSlot = 1;

      if (r < totalRounds) {
        const nextMatchNum = Math.ceil(m / 2);
        nextMatchKey = `${r + 1}_${nextMatchNum}`;
        nextMatchSlot = m % 2 === 1 ? 1 : 2;
      }

      const matchObj = {
        key: matchKey,
        tournament_id: tournamentId,
        round: r,
        match_number: m,
        player1_id: null as string | null,
        player2_id: null as string | null,
        player1_score: 0,
        player2_score: 0,
        winner_id: null as string | null,
        next_match_key: nextMatchKey,
        next_match_slot: nextMatchSlot,
        status: 'pending'
      };

      matchMap.set(matchKey, matchObj);
    }
  }

  // 2. Assegna i giocatori al Round 1
  const round1MatchesCount = bracketSize / 2;
  for (let i = 0; i < round1MatchesCount; i++) {
    const matchObj = matchMap.get(`1_${i + 1}`);
    if (matchObj) {
      const p1 = shuffled[i * 2] || null;
      const p2 = shuffled[i * 2 + 1] || null;

      matchObj.player1_id = p1 ? p1.id : null;
      matchObj.player2_id = p2 ? p2.id : null;

      // Se c'è un Bye (un solo giocatore nel match), avanza in automatico
      if (p1 && !p2) {
        matchObj.winner_id = p1.id;
        matchObj.status = 'completed';
      } else if (!p1 && p2) {
        matchObj.winner_id = p2.id;
        matchObj.status = 'completed';
      } else if (p1 && p2) {
        matchObj.status = 'in_progress';
      }
    }
  }

  // 3. Salva i match nel Database Supabase
  // Inseriamo prima i match per ottenere i loro UUID e collegare i next_match_id
  const allMatchesArray = Array.from(matchMap.values());
  
  // Inseriamo a ritroso dai round più alti a quelli più bassi per avere i next_match_id pronti
  const insertedMap: Map<string, string> = new Map(); // key: matchKey -> db UUID

  for (let r = totalRounds; r >= 1; r--) {
    const roundMatches = allMatchesArray.filter(m => m.round === r);
    for (const m of roundMatches) {
      const parentDbId = m.next_match_key ? insertedMap.get(m.next_match_key) : null;

      const { data, error } = await supabase
        .from('tournament_matches')
        .insert({
          tournament_id: m.tournament_id,
          round: m.round,
          match_number: m.match_number,
          player1_id: m.player1_id,
          player2_id: m.player2_id,
          player1_score: m.player1_score,
          player2_score: m.player2_score,
          winner_id: m.winner_id,
          next_match_id: parentDbId || null,
          next_match_slot: m.next_match_slot,
          status: m.status
        })
        .select()
        .single();

      if (error) {
        console.error('Errore inserimento match:', error);
        throw error;
      }

      insertedMap.set(m.key, data.id);

      // Se il match ha già un vincitore (per via del Bye), propaga al turno successivo
      if (m.winner_id && parentDbId) {
        const updateField = m.next_match_slot === 1 ? { player1_id: m.winner_id } : { player2_id: m.winner_id };
        await supabase.from('tournament_matches').update(updateField).eq('id', parentDbId);
      }
    }
  }

  // Aggiorna lo stato del torneo in 'in_progress'
  await supabase
    .from('tournaments')
    .update({ status: 'in_progress' })
    .eq('id', tournamentId);

  return true;
}

/**
 * Fa avanzare il vincitore di un match e aggiorna il match successivo
 */
export async function submitMatchResult(
  matchId: string,
  winnerId: string,
  score1: number = 0,
  score2: number = 0
) {
  // 1. Recupera il match corrente
  const { data: match, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (error || !match) {
    throw new Error('Match non trovato');
  }

  // 2. Aggiorna lo stato ed il vincitore del match corrente
  const { error: updateErr } = await supabase
    .from('tournament_matches')
    .update({
      player1_score: score1,
      player2_score: score2,
      winner_id: winnerId,
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', matchId);

  if (updateErr) throw updateErr;

  // 3. Se esiste un match successivo nel tabellone, imposta il vincitore nel rispettivo slot
  if (match.next_match_id) {
    const updatePayload = match.next_match_slot === 1 
      ? { player1_id: winnerId, status: 'in_progress' } 
      : { player2_id: winnerId, status: 'in_progress' };

    await supabase
      .from('tournament_matches')
      .update(updatePayload)
      .eq('id', match.next_match_id);
  }

  return true;
}
