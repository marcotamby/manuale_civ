const fs = require('fs');
const html = fs.readFileSync('scratch/archive.html', 'utf8');

// There's a standings list usually: <td class='rank'>1</td><td class='display_name'>Team Name</td>
const regex = /data-participant_id="[^"]+">\s*<td[^>]*>(?:<span[^>]*>[0-9a-z]+<\/span>\s*)?(\d+)[a-z]{2}<\/td>\s*<td[^>]*>(?:<div[^>]*>.*?<\/div>)?\s*<span[^>]*>(.*?)<\/span>/gi;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Rank:', m[1], 'Name:', m[2].trim());
}

const titles = html.match(/<title>(.*?)<\/title>/);
if (titles) console.log('Title:', titles[1]);

// Searching for typical vuex store state:
const storeRegex = /window\._initialStoreState = (.*?);/;
const m2 = html.match(storeRegex);
if(m2) {
   const data = JSON.parse(m2[1]);
   const parts = Object.values(data.participants || {});
   parts.sort((a,b) => a.final_rank - b.final_rank);
   console.log('From Store:');
   parts.slice(0, 3).forEach(p => console.log('Rank:', p.final_rank, p.display_name));
}

// Or maybe it's in a <script> element
const scriptMatches = [...html.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
for(const script of scriptMatches) {
   if (script[1].includes('final_rank') || script[1].includes('participants')) {
      console.log('Found participants in script, length:', script[1].length);
      const m3 = script[1].match(/"participants":\s*(\[.*?\])/);
      if (m3) {
         try {
            const parts = JSON.parse(m3[1]);
            parts.sort((a,b) => a.final_rank - b.final_rank);
            parts.slice(0,3).forEach(p => console.log('Rank:', p.final_rank, p.display_name || p.name));
         } catch(e) {}
      }
   }
}
