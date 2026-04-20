require('dotenv').config();

async function testFetch() {
  const fetch = globalThis.fetch;
  try {
    const res = await fetch('https://api.challonge.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CHALLONGE_CLIENT_ID,
        client_secret: process.env.CHALLONGE_CLIENT_SECRET,
        scope: 'unprotected_read'
      })
    });
    const { access_token } = await res.json();
    console.log("Got token");

    const tRes = await fetch('https://api.challonge.com/v2.1/tournaments/gyunrhoc', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Authorization-Type': 'v2',
        'Accept': 'application/vnd.api+json'
      }
    });
    if (!tRes.ok) {
      console.error(tRes.status, await tRes.text());
    } else {
      console.log(await tRes.json());
    }
  } catch (err) {
    console.error(err);
  }
}
testFetch();
