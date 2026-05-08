import fs from 'fs';

const content = fs.readFileSync('c:/Users/marco/OneDrive/Desktop/manualeciv/src/data/aoe4Data.ts', 'utf8');

// Simple regex to find IDs of civilizations (they are directly after { at start of line or with some spaces)
const idRegex = /"id":\s*"([^"]+)"/g;
let match;
const ids = [];
while ((match = idRegex.exec(content)) !== null) {
    ids.push(match[1]);
}

// Filtering for civilization IDs specifically is hard with just regex if units also have IDs.
// But we can check for the pattern.
console.log('Found IDs:', ids.length);
// Print first 50 IDs
console.log('First 50 IDs:', ids.slice(0, 50));
// Print IDs that look like civ IDs (not unit IDs)
// Civ IDs are usually at the top level of the array elements.
