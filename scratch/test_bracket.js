const TOKEN = '9d5af3de7c8aeceef5bd796d62144fe8';
const PHASE_GROUP_ID = 3150736; // La fase finale a doppia eliminazione

async function testBracket() {
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
    const response = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        query,
        variables: { id: PHASE_GROUP_ID },
      }),
    });

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testBracket();
