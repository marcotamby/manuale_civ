import https from 'https';
import fs from 'fs';

https.get('https://api.github.com/repos/aoe4world/data/contents/units', { headers: { 'User-Agent': 'Node.js' } }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log("Units repo contents:");
      console.log(data.map(d => d.name));
    } catch(e) { console.error("Error parsing", e); }
  });
}).on('error', console.error);
