import https from 'https';
import fs from 'fs';
import path from 'path';

// Output to our app data folder instead of public so we can import it in ts
const destPath = path.join(process.cwd(), 'src', 'data', 'all_units_raw.json');

https.get('https://raw.githubusercontent.com/aoe4world/data/main/units/all.json', { headers: { 'User-Agent': 'Node.js' } }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      fs.writeFileSync(destPath, JSON.stringify(parsed.data, null, 2));
      console.log(`Saved ${parsed.data.length} units to src/data/all_units_raw.json`);
    } catch(e) { console.error("Error parsing", e); }
  });
}).on('error', console.error);
