process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const prodUrl = 'https://manualeciv.vercel.app/api/startgg';

const query = `
  query TournamentQuery($slug: String) {
    tournament(slug: $slug) {
      id
      name
      slug
      events {
        id
        name
        phases {
          id
          name
        }
      }
    }
  }
`;

async function testProduction(slug) {
  try {
    console.log(`Sending query to production API for slug: ${slug}...`);
    const response = await fetch(prodUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { slug }
      })
    });
    
    console.log(`Response status: ${response.status}`);
    const text = await response.text();
    console.log("Response text:");
    console.log(text);
  } catch (err) {
    console.error("Error:", err);
  }
}

testProduction("tournament/torneo-1v1-2026");
