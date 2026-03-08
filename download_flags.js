import fs from 'fs';
import path from 'path';

const destDir = path.join(process.cwd(), 'public', 'flags');
if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
}

async function run() {
  console.log("Fetching aoe4world.com/explorer...");
  const res = await fetch("https://aoe4world.com/explorer", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html"
    }
  });
  
  const text = await res.text();
  
  // Find all matches for `<img ... src="/images/civilizations/abbasid.png"`
  // or `src="https://.../civilizations/abbasid.png"`
  const regex = /src=["']([^"']+\/civilizations\/([^"'\.]+)\.png)["']/g;
  let matches;
  const urls = new Map();
  
  while ((matches = regex.exec(text)) !== null) {
     const fullUrl = matches[1].startsWith('http') ? matches[1] : `https://aoe4world.com${matches[1]}`;
     const civName = matches[2];
     urls.set(civName, fullUrl);
  }
  
  console.log(`Found ${urls.size} distinct civilization flag URLs.`);
  
  for (const [civ, url] of urls.entries()) {
     console.log(`Downloading ${civ} from ${url}...`);
     const imgRes = await fetch(url, {
       headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
     });
     
     if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        fs.writeFileSync(path.join(destDir, `${civ}.png`), Buffer.from(buffer));
        console.log(`Saved ${civ}.png`);
     } else {
        console.log(`Failed to load ${civ}.png: ${imgRes.status}`);
     }
  }
}

run().catch(console.error);
