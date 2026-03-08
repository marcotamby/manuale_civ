import fs from 'fs';
import path from 'path';

const rawUnitsPath = path.join(process.cwd(), 'src', 'data', 'all_units_raw.json');
const rawData = JSON.parse(fs.readFileSync(rawUnitsPath, 'utf8'));

// We only want base unique units without variants for the main pool to avoid clutter
const processedUnits = [];
const seenIds = new Set();

for (const raw of rawData) {
  // Try to group base units correctly
  // aoe4world data format: raw.id, raw.name, raw.classes, raw.weapons, raw.armor, raw.hitpoints, raw.age
  // We need to map this to our Unit interface
  
  if (seenIds.has(raw.baseId)) continue;
  seenIds.add(raw.baseId);
  
  // Decide Type
  let type = "Infantry";
  if (raw.classes.includes("cavalry")) type = "Cavalry";
  else if (raw.classes.includes("siege")) type = "Siege";
  else if (raw.classes.includes("ranged")) type = "Ranged";

  // Calculate stats robustly (weapons array might be empty)
  let attack = 0;
  if (raw.weapons && raw.weapons.length > 0) {
     attack = raw.weapons[0].damage || 0;
  }
  
  let armor = 0;
  if (raw.armor && raw.armor.length > 0) {
     armor = raw.armor[0].value || 0;
  }
  
  const unit = {
    id: raw.baseId || raw.id,
    name: raw.name,
    type: type,
    age: raw.age || 1,
    stats: {
      attack: attack,
      armor: armor,
      speed: raw.movement ? raw.movement.speed : 1.0,
      health: raw.hitpoints || 100
    },
    strengths: [],
    weaknesses: [],
    description: raw.description || "Age of Empires IV Unit."
  };
  
  processedUnits.push(unit);
}

const outputPath = path.join(process.cwd(), 'src', 'data', 'parsed_units.json');
fs.writeFileSync(outputPath, JSON.stringify(processedUnits, null, 2));

console.log(`Parsed ${processedUnits.length} base units successfully.`);
