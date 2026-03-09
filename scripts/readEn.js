import fs from 'fs';

const ts = fs.readFileSync('src/data/all_units_raw.json', 'utf8');
const units = JSON.parse(ts);
const englishUnits = units.filter(u => u.civs.includes('en') && u.type === 'unit');

console.log("English total units:", englishUnits.length);

const genericBaseIds = ["archer", "crossbowman", "handcannoneer", "mangonel", "spearman", "springald", "bombard", "man-at-arms", "knight"];

function cleanText(txt) {
  return txt ? txt.replace(/<[^>]*>?/gm, '').trim() : '';
}

function determineUnitType(classes, name) {
  const clsStr = classes.join(' ').toLowerCase();
  const nameStr = name.toLowerCase();
  
  if (clsStr.includes('cavalry') || clsStr.includes('camel') || clsStr.includes('elephant') || clsStr.includes('horse')) return 'Cavalry';
  if (clsStr.includes('archer') || clsStr.includes('ranged') || clsStr.includes('gunpowder')) return 'Ranged';
  if (clsStr.includes('siege') || nameStr.includes('ram') || nameStr.includes('trebuchet')) return 'Siege';
  return 'Infantry';
}

const uniqueUnits = englishUnits
    .filter(u => !genericBaseIds.includes(u.baseId))
    .filter(u => !u.classes.includes('worker') && !u.classes.includes('ship') && !u.id.includes('villager') && !u.id.includes('trader') && !u.id.includes('scout') && !u.id.includes('king'))
    // get lowest age
    .reduce((acc, current) => {
        const x = acc.find(item => item.baseId === current.baseId);
        if (!x || current.age < x.age) {
            if (x) acc.splice(acc.indexOf(x), 1);
            acc.push(current);
        }
        return acc;
    }, [])
    .map((u) => {
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
          strengths: u.classes,
          weaknesses: [],
          description: cleanText(u.description)
        };
    });

console.log(JSON.stringify(uniqueUnits, null, 2));
