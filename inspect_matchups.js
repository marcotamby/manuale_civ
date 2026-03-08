import fs from 'fs';

try {
  const data = JSON.parse(fs.readFileSync('matchups.json', 'utf8'));
  console.log("Keys in matchups:", Object.keys(data));
  if (data.data && data.data.length > 0) {
     console.log("First matchup sample:", data.data[0]);
  }
} catch(e) { console.error(e); }
