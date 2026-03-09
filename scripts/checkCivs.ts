import fs from 'fs';

async function fetchCiv(id: string) {
  try {
    console.log(`Fetching ${id}...`);
    const res = await fetch(`https://raw.githubusercontent.com/aoe4world/data/main/civilizations/${id}.json`);
    const d = await res.json();
    
    console.log(`==== ${id.toUpperCase()} ====`);
    
    const buildings = d?.data?.buildings?.data || [];
    const landmarks = buildings.filter((b: any) => 
        b.classes.includes('landmark') || b.id.includes('wing') || b.id.includes('house-of-wisdom')
    );
    console.log("Landmarks / Wings:");
    landmarks.forEach((l: any) => console.log(`- [Age ${l.age}] ${l.id} : ${l.name} (${cleanText(l.description)})`));

    const allUnits = d?.data?.units?.data || [];
    const units = allUnits.filter((u: any) => u.type === 'unit' && u.unique);
    console.log("Unique Units:");
    units.forEach((u: any) => console.log(`- [Age ${u.age}] ${u.id} : ${u.name}`));
    console.log("\n");
  } catch (e) {
    console.log(`Failed to fetch ${id}`, e);
  }
}

function cleanText(txt: string) {
  return txt ? txt.replace(/<[^>]*>?/gm, '').trim() : '';
}

async function run() {
    await fetchCiv('abbasid_dynasty');
    await fetchCiv('ayyubids');
    await fetchCiv('byzantines');
}

run();
