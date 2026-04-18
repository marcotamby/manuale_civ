export interface ChallongeMatch {
  id: string;
  type: string;
  attributes: {
    state: string;
    round: number;
    suggested_play_order: number;
    points_by_participant: {
      participant_id: string;
      scores: number[];
    }[];
    winner_id: string | null;
  };
  relationships: {
    participants: {
      data: { id: string; type: string }[];
    };
  };
}

export interface ChallongeParticipant {
  id: string;
  attributes: {
    name: string;
    seed: number;
  };
}

export interface ChallongeTournament {
  id: string;
  attributes: {
    name: string;
    url: string;
    state: string;
    tournament_type: string;
  };
}

export async function fetchChallongeTournament(slug: string) {
  try {
    // Challonge v2.1 vuole l'ID numerico. Cerchiamo il torneo nella lista per trovarlo.
    const listResponse = await fetch(`/api/challonge?path=tournaments`);
    if (!listResponse.ok) throw new Error('Failed to fetch tournaments list');
    
    const listData = await listResponse.json();
    const tournament = listData.data.find((t: any) => t.attributes.url === slug || t.id === slug);
    
    if (!tournament) {
      // Se non lo troviamo nella lista principale, proviamo a interrogarlo direttamente
      // nel caso lo slug sia in realtà un ID
      const directRes = await fetch(`/api/challonge?path=tournaments/${slug}`);
      if (directRes.ok) return (await directRes.json()).data as ChallongeTournament;
      throw new Error('Tournament not found in Challonge');
    }
    
    return tournament as ChallongeTournament;
  } catch (error) {
    console.error('Error fetching Challonge tournament:', error);
    return null;
  }
}

export async function fetchChallongeData(slugOrId: string) {
  try {
    // Prima assicuriamoci di avere l'ID numerico
    let id = slugOrId;
    if (isNaN(Number(slugOrId))) {
      const tournament = await fetchChallongeTournament(slugOrId);
      if (!tournament) throw new Error('Could not resolve slug to ID');
      id = tournament.id;
    }

    const [matchesRes, participantsRes] = await Promise.all([
      fetch(`/api/challonge?path=tournaments/${id}/matches&page=1&per_page=100`),
      fetch(`/api/challonge?path=tournaments/${id}/participants&page=1&per_page=100`)
    ]);

    if (!matchesRes.ok || !participantsRes.ok) throw new Error('Failed to fetch Challonge details');

    const matchesData = await matchesRes.json();
    const participantsData = await participantsRes.json();

    return {
      matches: matchesData.data as ChallongeMatch[],
      participants: participantsData.data as ChallongeParticipant[]
    };
  } catch (error) {
    console.error('Error fetching Challonge data:', error);
    return null;
  }
}

// Funzione di utilità per mappare Challonge -> Formato StartGG-like (per riuso UI)
export function mapChallongeToUnified(matches: ChallongeMatch[], participants: ChallongeParticipant[]) {
  const participantMap = new Map(participants.map(p => [p.id, p.attributes.name]));

  // Raggruppiamo i match per round
  const roundsMap = new Map<number, ChallongeMatch[]>();
  matches.forEach(m => {
    const r = m.attributes.round;
    if (!roundsMap.has(r)) roundsMap.set(r, []);
    roundsMap.get(r)!.push(m);
  });

  return Array.from(roundsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roundNum, roundMatches]) => ({
      number: roundNum,
      title: roundNum > 0 ? `Round ${roundNum}` : `Losers Round ${Math.abs(roundNum)}`,
      sets: roundMatches.map(m => ({
        id: m.id,
        round: m.attributes.round,
        slots: m.attributes.points_by_participant.map(p => ({
          entrant: {
            name: participantMap.get(p.participant_id) || 'TBD'
          },
          standing: {
            stats: {
              score: {
                value: p.scores.reduce((a, b) => a + b, 0)
              }
            }
          }
        })),
        winnerId: m.attributes.winner_id
      }))
    }));
}
