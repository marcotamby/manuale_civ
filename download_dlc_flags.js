import fs from 'fs';
import path from 'path';

const flagUrls = {
  "goldenhorde": "https://static.aoe4world.com/assets/flags/golden_horde-3a689fad37debd619c57df4b2f82c57e12b9ad3055c1f2722bd1b2e318d11c0d.png",
  "lancaster": "https://static.aoe4world.com/assets/flags/house_of_lancaster-eb59b86336771c7ab996d411a9d12d71045b3639b06753301fde4a3a675b5d40.png",
  "templar": "https://static.aoe4world.com/assets/flags/knights_templar-939b2e79f7a74d99f2cf75756efc9d1db17fd344fbbc86c9bd8c411ef78b2350.png",
  "macedonian": "https://static.aoe4world.com/assets/flags/macedonian_dynasty-f1e76e7a33d34312ca9fb0c2efaf51bacbba8899cc308f3b08bcdd3ba931c7ff.png",
  "sengoku": "https://static.aoe4world.com/assets/flags/sengoku_daimyo-ec63e1dbe8500527716f522b0ca957ec63a337a80fa2abf26d89b278b356c45b.png",
  "tughlaq": "https://static.aoe4world.com/assets/flags/tughlaq_dynasty-0fb44a8770b846a0c4a82db577d50dbf011191d594ce93e7bb780bb7ee5becff.png"
};

const destDir = path.join(process.cwd(), 'public', 'flags');

async function run() {
  for (const [civ, url] of Object.entries(flagUrls)) {
     console.log(`Downloading ${civ} from ${url}...`);
     const res = await fetch(url, {
       headers: { "User-Agent": "Mozilla/5.0" }
     });
     if (res.ok) {
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(path.join(destDir, `${civ}.png`), Buffer.from(buffer));
        console.log(`Saved ${civ}.png`);
     } else {
        console.log(`Failed to load ${civ}.png: ${res.status}`);
     }
  }
}

run().catch(console.error);
