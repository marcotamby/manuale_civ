const fs = require('fs');

const data = JSON.parse(fs.readFileSync('c:/Users/marco/OneDrive/Desktop/manualeciv/src/data/all_units_raw.json', 'utf8'));
const byz = data.data.filter(u => u.civs.includes('by') && u.type === 'unit');
console.log("Byzantine all units:");
byz.forEach(u => console.log(u.id, u.name, u.unique ? '(UNIQUE)' : ''));
