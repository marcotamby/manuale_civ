const fs = require('fs');
const https = require('https');

https.get('https://aoe4world.com/explorer', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const matches = data.match(/<img[^>]+src="([^">]+)"[^>]*alt="([^"]+)"/g);
    if(matches) {
       console.log("Found matches: ", matches.slice(0, 20));
    } else {
       console.log("No matches found");
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
