import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

function checkUrl(url: string): Promise<number> {
    return new Promise(resolve => {
        const req = https.request(url, { method: 'HEAD' }, res => resolve(res.statusCode || 0));
        req.on('error', () => resolve(0));
        req.setTimeout(4000, () => { req.destroy(); resolve(0); });
        req.end();
    });
}

async function main() {
    const { data: civs } = await supabase.from('civilizations').select('name, unique_units, landmarks');
    if (!civs) return;

    console.log("=== UNIT IMAGE CHECK ===\n");
    const brokenUnits: any[] = [];
    for (const civ of civs) {
        for (const unit of (civ.unique_units || [])) {
            const id = unit.id.toLowerCase().replace(/\s+/g, '-');
            const url = `https://data.aoe4world.com/images/units/${id}.png`;
            const status = await checkUrl(url);
            if (status !== 200) {
                console.log(`❌ [${civ.name}] ${unit.name} → id="${id}" (HTTP ${status})`);
                brokenUnits.push({ civ: civ.name, unit: unit.name, id, url });
            } else {
                console.log(`✅ [${civ.name}] ${unit.name}`);
            }
        }
    }

    console.log("\n=== LANDMARK IMAGE CHECK ===\n");
    const brokenLandmarks: any[] = [];
    for (const civ of civs) {
        for (const lm of (civ.landmarks || [])) {
            const baseId = lm.imageId || lm.id;
            const url = `https://data.aoe4world.com/images/buildings/${baseId}.png`;
            const status = await checkUrl(url);
            if (status !== 200) {
                console.log(`❌ [${civ.name}] ${lm.name} → id="${baseId}" (HTTP ${status})`);
                brokenLandmarks.push({ civ: civ.name, landmark: lm.name, id: baseId, url });
            } else {
                console.log(`✅ [${civ.name}] ${lm.name}`);
            }
        }
    }

    console.log(`\n\nSUMMARY: ${brokenUnits.length} broken unit images, ${brokenLandmarks.length} broken landmark images`);
}

main();
