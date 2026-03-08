import https from 'https';

const options = {
  hostname: 'api.github.com',
  path: '/repos/aoe4world/data/contents/images',
  headers: { 'User-Agent': 'Node.js' }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(json.map(file => file.name).slice(0, 20));
    } catch(e) { console.error("Parse error:", e); }
  });
}).on("error", console.error);
