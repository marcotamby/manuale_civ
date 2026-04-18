const STARTGG_API_URL = '/api/startgg';

export interface StartGGImage {
  url: string;
  type: string;
}

export interface StartGGParticipant {
  id: string;
  gamerTag: string;
  player: {
    id: string;
    gamerTag: string;
  };
}

export interface StartGGEntrant {
  id: string;
  name: string;
  participants: StartGGParticipant[];
}

export interface StartGGSlot {
  entrant: StartGGEntrant | null;
  standing: {
    stats: {
      score: {
        value: number | null;
      };
    };
  } | null;
}

export interface StartGGSet {
  id: string;
  fullRoundText: string;
  round: number;
  displayScore: string | null;
  slots: StartGGSlot[];
}

export interface StartGGPhaseGroup {
  id: string;
  displayIdentifier: string;
}

export interface StartGGPhase {
  id: string;
  name: string;
  phaseGroups?: {
    nodes?: StartGGPhaseGroup[];
  } | StartGGPhaseGroup[];
  bracketType: string;
}

export interface StartGGStanding {
  placement: number;
  entrant: {
    id: string;
    name: string;
  };
}

export interface StartGGEvent {
  id: string;
  name: string;
  videogame: {
    id: number;
    name: string;
  };
  phases: StartGGPhase[];
  standings?: {
    nodes: StartGGStanding[];
  };
}

export interface StartGGTournament {
  id: string;
  name: string;
  slug: string;
  images: StartGGImage[];
  events: StartGGEvent[];
}

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export async function fetchTournament(slug: string): Promise<StartGGTournament | null> {
  const query = `
    query TournamentQuery($slug: String) {
      tournament(slug: $slug) {
        id
        name
        slug
        images {
          url
          type
        }
        events {
          id
          name
          videogame {
            id
            name
          }
          standings(query: { perPage: 3, page: 1 }) {
            nodes {
              placement
              entrant {
                id
                name
              }
            }
          }
          phases {
            id
            name
            bracketType
            phaseGroups {
              nodes {
                id
                displayIdentifier
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(STARTGG_API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query,
        variables: { slug },
      }),
    });
    const result = await response.json();
    
    if (result.errors) {
      console.error('Start.gg GraphQL Errors:', result.errors);
      // Lanciamo l'errore per farlo catturare dalla UI
      throw new Error(result.errors[0]?.message || 'Errore GraphQL ignoto');
    }
    
    return result.data?.tournament || null;
  } catch (error: any) {
    console.error('Error fetching tournament:', error);
    throw error; // Rilanciamo l'errore alla UI
  }
}

export async function fetchPhaseGroupSets(phaseGroupId: string): Promise<StartGGSet[]> {
  const query = `
    query PhaseGroupSets($id: ID!) {
      phaseGroup(id: $id) {
        id
        sets(page: 1, perPage: 100, sortType: STANDARD) {
          nodes {
            id
            fullRoundText
            round
            displayScore
            state
            slots {
              entrant {
                id
                name
                participants {
                  gamerTag
                }
              }
              standing {
                stats {
                  score {
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(STARTGG_API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query,
        variables: { id: phaseGroupId },
      }),
    });
    
    if (!response.ok) {
        console.error(`Status Error for group ${phaseGroupId}: ${response.status}`);
        return [];
    }

    const result = await response.json();

    if (result.errors) {
      console.error(`GraphQL Errors for group ${phaseGroupId}:`, result.errors);
      return [];
    }

    return result.data?.phaseGroup?.sets?.nodes || [];
  } catch (error) {
    console.error(`Network Error for group ${phaseGroupId}:`, error);
    return [];
  }
}

export async function fetchPhaseGroups(phaseId: string): Promise<StartGGPhaseGroup[]> {
  const query = `
    query PhaseGroups($id: ID!) {
      phase(id: $id) {
        id
        name
        phaseGroups {
          nodes {
            id
            displayIdentifier
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(STARTGG_API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query,
        variables: { id: phaseId },
      }),
    });
    const result = await response.json();
    return result.data?.phase?.phaseGroups?.nodes || [];
  } catch (error) {
    console.error(`Error fetching groups for phase ${phaseId}:`, error);
    return [];
  }
}
