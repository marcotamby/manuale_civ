import fs from 'fs';

const content = fs.readFileSync('c:/Users/marco/OneDrive/Desktop/manualeciv/src/data/aoe4Data.ts', 'utf8');

// We know civilizationsData starts with [ and ends with ];
// Each civ starts with { and ends with },
// The civ ID is the first "id": property after the {

const startTag = 'export const civilizationsData: Civilization[] = [';
const startIndex = content.indexOf(startTag) + startTag.length;
const arrayContent = content.substring(startIndex, content.lastIndexOf('];'));

const civs = [];
let depth = 0;
let currentCivStart = -1;

for (let i = 0; i < arrayContent.length; i++) {
    if (arrayContent[i] === '{') {
        if (depth === 0) currentCivStart = i;
        depth++;
    } else if (arrayContent[i] === '}') {
        depth--;
        if (depth === 0) {
            const civText = arrayContent.substring(currentCivStart, i + 1);
            const idMatch = civText.match(/"id":\s*"([^"]+)"/);
            const nameMatch = civText.match(/"name":\s*"([^"]+)"/);
            if (idMatch) {
                civs.push({ id: idMatch[1], name: nameMatch ? nameMatch[1] : 'Unknown' });
            }
        }
    }
}

console.log('Top-level Civs Found:', civs.length);
civs.forEach((c, idx) => console.log(`${idx + 1}. ${c.id} (${c.name})`));
