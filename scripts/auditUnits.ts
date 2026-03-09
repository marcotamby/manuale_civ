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

async function auditCiv(ourCivId: string, apiCivId: string) {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/aoe4world/data/main/civilizations/${apiCivId}.json`);
    if (!res.ok) {
      console.log(`[SKIP] Could not fetch ${apiCivId}. HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return {
       units: data.units?.data || [],
       buildings: data.buildings?.data || []
    };
  } catch(e) {
    console.log(`[ERROR] Failed for ${apiCivId}:`, e);
    return null;
  }
}

async function run() {
  console.log("Starting audit...");
  
  for (const [ourId, apiId] of Object.entries(civIdMap)) {
    console.log(`\n--- Auditing ${ourId} (${apiId}) ---`);
    const civData = await auditCiv(ourId, apiId);
    if (!civData) continue;
    
    const units = civData.units.map((u: any) => ({ id: u.id, baseId: u.baseId, name: u.name, classes: u.classes }));
    
    const hasArcher = units.some((u: any) => u.baseId === 'archer' || u.name.toLowerCase().includes('archer') && !u.name.toLowerCase().includes('cavalry') && !u.name.toLowerCase().includes('camel'));
    const hasMaA = units.some((u: any) => u.baseId === 'man-at-arms' || u.name.toLowerCase().includes('man-at-arms'));
    
    const uniqueIds = units.map((u:any) => u.id).slice(0, 5);

    console.log(`Has standard Archer text-wise? ${hasArcher}`);
    console.log(`Has standard Man-at-Arms? ${hasMaA}`);
    console.log(`First 5 units:`, uniqueIds.join(', '));
  }
}
run();
