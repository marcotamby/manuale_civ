import https from 'https';

const checkUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', () => {
      resolve({ url, status: 500 });
    });
  });
};

const byz = [
  'grand-winery', 'imperial-hippodrome', 'cistern-of-the-first-hill', 'golden-horn-tower', 'foreign-engineering-company', 'palatine-school'
];

const abbasid = [
  'house-of-wisdom', 'town-center', 'culture-wing', 'economic-wing', 'military-wing', 'trade-wing'
];

const ayyubid = [
  'culture-wing-logistics', 'culture-wing-advancement', 
  'economic-wing-growth', 'economic-wing-industry',
  'military-wing-smith', 'military-wing-reinforcements',
  'trade-wing-bazaar', 'trade-wing-advisors'
];

async function run() {
  const allIds = [...byz, ...abbasid, ...ayyubid];
  for (const id of allIds) {
    const url1 = `https://data.aoe4world.com/images/buildings/${id}.png`;
    const url2 = `https://data.aoe4world.com/images/buildings/${id}-2.png`;
    
    let res = await checkUrl(url1);
    if (res.status === 200) {
      console.log(`FOUND: ${id}`);
    } else {
      let res2 = await checkUrl(url2);
      if (res2.status === 200) {
        console.log(`FOUND (-2): ${id}`);
      } else {
        console.log(`NOT FOUND: ${id}`);
      }
    }
  }
}

run();
