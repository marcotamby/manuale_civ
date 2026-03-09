const https = require('https');

function downloadAndPrint(civ) {
  https.get(`https://raw.githubusercontent.com/aoe4world/data/main/civilizations/${civ}.json`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`\n=== ${civ.toUpperCase()} ===`);
        const b = json.data.buildings.data;
        b.forEach(x => {
            if (x.classes.includes('landmark') || x.id.includes('wing') || x.id.includes('house-of-wisdom') || x.id.includes('town-center')) {
                console.log(`- ${x.id}: ${x.name} (Icon: ${x.icon})`);
            }
        });
      } catch (e) {
        console.error('Parse error on ' + civ, e.message);
      }
    });
  }).on('error', err => console.log('Error: ', err.message));
}

downloadAndPrint('byzantines');
downloadAndPrint('abbasid_dynasty');
downloadAndPrint('ayyubids');
