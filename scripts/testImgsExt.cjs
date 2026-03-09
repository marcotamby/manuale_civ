const https = require('https');

const checkUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', () => {
      resolve({ url, status: 500 });
    });
  });
};

const ids = [
  'grand-winery', 'imperial-hippodrome', 'cistern-of-the-first-hill', 'golden-horn-tower', 'foreign-engineering-company', 'palatine-school',
  'culture-wing', 'economic-wing', 'military-wing', 'trade-wing',
  'culture-wing-logistics', 'culture-wing-advancement', 
  'economic-wing-growth', 'economic-wing-industry',
  'military-wing-smith', 'military-wing-reinforcements',
  'trade-wing-bazaar', 'trade-wing-advisors'
];

async function run() {
  for (const id of ids) {
    let found = false;
    for (let i of ['', '-1', '-2', '-3', '-4']) {
      const url = `https://data.aoe4world.com/images/buildings/${id}${i}.png`;
      let res = await checkUrl(url);
      if (res.status === 200) {
        console.log(`FOUND: ${id}${i}`);
        found = true;
        break;
      }
    }
    if (!found) {
        for (let i of ['', '-1', '-2', '-3', '-4']) {
            const id2 = id.replace(/-/g, '_');
            const url = `https://data.aoe4world.com/images/buildings/${id2}${i}.png`;
            let res = await checkUrl(url);
            if (res.status === 200) {
              console.log(`FOUND (underscores): ${id2}${i}`);
              found = true;
              break;
            }
        }
    }
    if (!found) console.log(`NOT FOUND: ${id}`);
  }
}

run();
