const TOKEN = '9d5af3de7c8aeceef5bd796d62144fe8';
const SLUG = 'torneo-1v1-2026';

async function testStartGG() {
  const query = `
    query TournamentQuery($slug: String) {
      tournament(slug: $slug) {
        id
        name
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
    const response = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        query,
        variables: { slug: SLUG },
      }),
    });

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching from start.gg:', error);
  }
}

testStartGG();
