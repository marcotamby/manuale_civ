import fs from 'fs';

const content = fs.readFileSync('c:/Users/marco/OneDrive/Desktop/manualeciv/src/data/aoe4Data.ts', 'utf8');

function findMatches(id: string) {
    const matches = [];
    let pos = content.indexOf(`"id": "${id}"`);
    while (pos !== -1) {
        const line = content.substring(0, pos).split('\n').length;
        matches.push(line);
        pos = content.indexOf(`"id": "${id}"`, pos + 1);
    }
    return matches;
}

console.log('Jin Dynasty lines:', findMatches('jin-dynasty'));
console.log('Abbasid lines:', findMatches('abbasid'));
console.log('Abbasidi lines (name):', content.indexOf('Abbasidi'));
