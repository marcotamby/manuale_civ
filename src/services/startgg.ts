const STARTGG_API_URL = 'https://api.start.gg/gql/alpha';

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
  phaseGroups: {
    nodes: StartGGPhaseGroup[];
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
          phases {
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
    return result.data?.tournament || null;
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return null;
  }
}

export async function fetchPhaseGroupSets(phaseGroupId: string): Promise<StartGGSet[]> {
  const query = `
    query PhaseGroupSets($id: ID!) {
      phaseGroup(id: $id) {
        id
        sets(page: 1, perPage: 100) {
          nodes {
            id
            fullRoundText
            round
            displayScore
            slots {
              entrant {
                id
                name
                participants {
                  id
                  gamerTag
                  player {
                    id
                    gamerTag
                  }
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
    const result = await response.json();
    return result.data?.phaseGroup?.sets?.nodes || [];
  } catch (error) {
    console.error('Error fetching sets:', error);
    return [];
  }
}
