import https from 'https';

https.get('https://aoe4world.com/api/v0/stats/rm_solo/matchups', { headers: { 'User-Agent': 'Node.js' } }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log("Matchups Data Keys:", Object.keys(data));
      if (data.data && data.data.length > 0) {
         console.log("Sample Matchup (first element):", JSON.stringify(data.data[0], null, 2));
      }
    } catch(e) { console.error("Error parsing", e); }
  });
}).on('error', console.error);
