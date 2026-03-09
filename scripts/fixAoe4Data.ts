import fs from 'fs';
import path from 'path';
import { civilizationsData, unitsList, Unit } from '../src/data/aoe4Data';

// Map our ids to AoE4World codes
const civCodeMap: Record<string, string> = {
  "abbasid": "ab",
  "ayyubids": "ay",
  "delhi": "de",
  "byzantines": "by",
  "chinese": "ch",
  "english": "en",
  "french": "fr",
  "goldenhorde": "gol",
  "hre": "hr",
  "japanese": "ja",
  "jeannedarc": "je",
  "lancaster": "hl",
  "macedonian": "mac",
  "malians": "ma",
  "mongols": "mo",
  "orderofthedragon": "od",
  "ottomans": "ot",
  "rus": "ru",
  "sengoku": "sen",
  "templar": "kt",
  "tughlaq": "tug",
  "zhuxi": "zx"
};

const rawUnitsPath = path.join(process.cwd(), 'src', 'data', 'all_units_raw.json');
const allUnitsRaw = JSON.parse(fs.readFileSync(rawUnitsPath, 'utf8'));

// Generic units mapping
const genericBaseIds = ["archer", "crossbowman", "handcannoneer", "mangonel", "spearman", "springald", "bombard", "man-at-arms", "knight"];

function run() {
  console.log("Analyzing who should NOT have each generic unit...");
  const exclusions: Record<string, string[]> = {};
  
  for (const genericId of genericBaseIds) {
      exclusions[genericId] = [];
      const genericCandidates = allUnitsRaw.filter((u: any) => u.baseId === genericId || (u.id === genericId && u.type !== 'building'));
      
      const civsWithUnit = new Set(genericCandidates.flatMap((u: any) => u.civs));
      
      // If a civ is NOT in civsWithUnit, they should be excluded.
      for (const [ourId, code] of Object.entries(civCodeMap)) {
         if (!civsWithUnit.has(code)) {
            exclusions[genericId].push(ourId);
         }
      }
  }

  console.log("Exclusions:", exclusions);
  
  // We need to write this to a new aoe4Data.ts or just print it so we can modify it.
}

run();
