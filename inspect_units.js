import https from 'https';

https.get('https://raw.githubusercontent.com/aoe4world/data/main/units/all.json', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log("Total units in all.json:", data.data.length);
      console.log("Sample unit:", data.data[0].id, data.data[0].name, data.data[0].classes);
    } catch(e) { console.error("Error parsing", e); }
  });
}).on('error', console.error);
