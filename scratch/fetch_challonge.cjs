const https = require('https');

https.get('https://challonge.com/it/gyunrhoc', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // try to extract participant names from common HTML structures
    // Participants are usually listed in brackets or standings
    // Let's just output the whole HTML to a file and parse it or grep it
    const fs = require('fs');
    fs.writeFileSync('scratch/challonge.html', data);
    console.log('Saved to scratch/challonge.html, length:', data.length);
  });
}).on('error', err => {
  console.log('Error:', err.message);
});
