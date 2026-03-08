import fs from 'fs';
import path from 'path';

// Load parsed units
const parsedUnitsPath = path.join(process.cwd(), 'src', 'data', 'parsed_units.json');
const parsedUnits = JSON.parse(fs.readFileSync(parsedUnitsPath, 'utf8'));

// Only keep units that are generally interesting and common
const allowedTypes = new Set(['spearman', 'man-at-arms', 'knight', 'archer', 'crossbowman', 'handcannoneer', 'trebuchet', 'mangonel', 'springald', 'bombard']);

const filteredUnits = parsedUnits.filter(u => allowedTypes.has(u.id));

console.log(`Kept ${filteredUnits.length} core unit types.`);

// We will overwrite the `unitsList` in `aoe4Data.ts` with these richer and dynamic stats
// Let's generate a TS string we can paste
let tsString = `export const dynamicUnitsList: Unit[] = [\n`;
for (const u of filteredUnits) {
  // Try to define strengths and weaknesses based on type or id
  let strengths = [];
  let weaknesses = [];
  
  if (u.id === 'spearman') { strengths = ['Cavalry']; weaknesses = ['Archers', 'Heavy Infantry']; }
  else if (u.id === 'man-at-arms') { strengths = ['Light Infantry', 'Archers']; weaknesses = ['Crossbowmen', 'Heavy Cavalry']; }
  else if (u.id === 'knight') { strengths = ['Archers', 'Swordsmen']; weaknesses = ['Spearmen', 'Camels']; }
  else if (u.id === 'archer') { strengths = ['Spearmen', 'Crossbowmen']; weaknesses = ['Cavalry', 'Man-at-Arms']; }
  else if (u.id === 'crossbowman') { strengths = ['Heavy Infantry', 'Heavy Cavalry']; weaknesses = ['Light Cavalry', 'Archers']; }
  else if (u.id === 'handcannoneer') { strengths = ['Infantry', 'Cavalry']; weaknesses = ['Mangonels', 'Archers']; }
  else if (u.id === 'springald') { strengths = ['Siege']; weaknesses = ['Melee Units']; }
  else if (u.id === 'mangonel') { strengths = ['Ranged Infantry', 'Light Infantry']; weaknesses = ['Springalds', 'Cavalry']; }
  else if (u.id === 'trebuchet' || u.id === 'bombard') { strengths = ['Buildings']; weaknesses = ['Melee Units']; }

  let age = u.age;
  // Fallbacks per game design if age missing
  if (u.id === 'spearman') age = 1;
  if (u.id === 'archer') age = 2;
  if (u.id === 'knight' || u.id === 'man-at-arms' || u.id === 'crossbowman') age = 3;
  if (u.id === 'handcannoneer' || u.id === 'bombard') age = 4;
  
  tsString += `  {
    id: "${u.id}",
    name: "${u.name}",
    type: "${u.type}",
    age: ${age},
    stats: { attack: ${u.stats.attack}, armor: ${u.stats.armor}, speed: ${Math.round(u.stats.speed * 100) / 100}, health: ${u.stats.health} },
    strengths: ${JSON.stringify(strengths)},
    weaknesses: ${JSON.stringify(weaknesses)},
    description: "${u.description.replace(/"/g, '\\"')}"
  },\n`;
}
tsString += `];`;

fs.writeFileSync('generated_units.ts', tsString);
console.log("Wrote dynamic units array to generated_units.ts");
