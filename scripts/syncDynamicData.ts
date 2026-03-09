import fs from 'fs';
import path from 'path';

const civIdMap: Record<string, string> = {
  "abbasid": "abbasid_dynasty",
  "ayyubids": "ayyubids",
  "delhi": "delhi_sultanate",
  "byzantines": "byzantines",
  "chinese": "chinese",
  "english": "english",
  "french": "french",
  "goldenhorde": "golden_horde",
  "hre": "holy_roman_empire",
  "japanese": "japanese",
  "jeannedarc": "jeanne_d_arc",
  "lancaster": "house_of_lancaster",
  "macedonian": "macedonian_dynasty",
  "malians": "malians",
  "mongols": "mongols",
  "orderofthedragon": "order_of_the_dragon",
  "ottomans": "ottomans",
  "rus": "rus",
  "sengoku": "sengoku_daimyo",
  "templar": "knights_templar",
  "tughlaq": "tughlaq_dynasty",
  "zhuxi": "zhu_xis_legacy"
};

const genericBaseIds = ["archer", "crossbowman", "handcannoneer", "mangonel", "spearman", "springald", "bombard", "man-at-arms", "knight"];

function cleanText(txt: string) {
  return txt.replace(/<[^>]*>?/gm, '').trim();
}

function determineUnitType(classes: string[], name: string) {
  const clsStr = classes.join(' ').toLowerCase();
  const nameStr = name.toLowerCase();
  
  if (clsStr.includes('cavalry') || clsStr.includes('camel') || clsStr.includes('elephant')) return 'Cavalry';
  if (clsStr.includes('archer') || clsStr.includes('ranged') || clsStr.includes('gunpowder')) return 'Ranged';
  if (clsStr.includes('siege') || nameStr.includes('ram') || nameStr.includes('trebuchet')) return 'Siege';
  return 'Infantry';
}

function determineLandmarkType(classes: string[], description: string) {
  const clsStr = classes.join(' ').toLowerCase();
  const descStr = description.toLowerCase();
  
  if (clsStr.includes('religious') || descStr.includes('monastery') || descStr.includes('relic') || descStr.includes('heal')) return 'Religious';
  if (clsStr.includes('defensive') || descStr.includes('keep') || descStr.includes('defense') || descStr.includes('tower')) return 'Defensive';
  if (clsStr.includes('economic') || descStr.includes('gold') || descStr.includes('resource') || descStr.includes('market')) return 'Economic';
  if (clsStr.includes('technology') || descStr.includes('research') || descStr.includes('upgrade')) return 'Technology';
  return 'Military';
}

async function run() {
  const result: any = {};
  
  for (const [ourId, apiId] of Object.entries(civIdMap)) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/aoe4world/data/main/civilizations/${apiId}.json`);
      if (!res.ok) {
        console.log(`[SKIP] Could not fetch ${apiId}`);
        continue;
      }
      const data = await res.json();
      
      const units = data.units?.data || [];
      const buildings = data.buildings?.data || [];
      
      const uniqueUnits = units
        .filter((u: any) => !genericBaseIds.includes(u.baseId))
        .filter((u: any) => u.type === 'unit' && !u.classes.includes('worker') && !u.classes.includes('ship') && !u.id.includes('villager') && !u.id.includes('trader') && !u.id.includes('scout'))
        // get the highest age version if there are multiple (or first appearing) -> just get the lowest age one to show it
        .reduce((acc: any[], current: any) => {
            const x = acc.find(item => item.baseId === current.baseId);
            if (!x || current.age < x.age) {
                if (x) acc.splice(acc.indexOf(x), 1);
                acc.push(current);
            }
            return acc;
         }, [])
        .map((u: any) => {
            const w = u.weapons?.[0] || { damage: 0 };
            const a = u.armor?.[0] || { value: 0 };
            return {
              id: u.id,
              name: u.name,
              type: determineUnitType(u.classes, u.name),
              age: u.age,
              stats: {
                attack: w.damage || 0,
                armor: a.value || 0,
                speed: u.movement?.speed || 1.0,
                health: u.hitpoints || 100
              },
              strengths: [u.classes.join(', ')],
              weaknesses: [],
              description: cleanText(u.description || '')
            };
        });

      const landmarks = buildings
        .filter((b: any) => b.classes.includes('landmark'))
        .map((b: any) => {
            return {
              id: b.id,
              name: b.name,
              age: b.age,
              type: determineLandmarkType(b.classes, cleanText(b.description || '')),
              description: cleanText(b.description || '')
            };
        });

      result[ourId] = {
        uniqueUnits,
        landmarks
      };
      
      console.log(`Processed ${ourId}: ${uniqueUnits.length} unique units, ${landmarks.length} landmarks`);
    } catch(e) {
      console.error(`Error processing ${ourId}:`, e);
    }
  }

  fs.writeFileSync(path.join(process.cwd(), 'src', 'data', 'generated_civ_data.json'), JSON.stringify(result, null, 2));
  console.log("Written to src/data/generated_civ_data.json");
}

run();
