import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

function checkUrl(url: string): Promise<number> {
    return new Promise(resolve => {
        const req = https.request(url, { method: 'HEAD' }, res => resolve(res.statusCode || 0));
        req.on('error', () => resolve(0));
        req.setTimeout(5000, () => { req.destroy(); resolve(0); });
        req.end();
    });
}

async function main() {
    const { data: civs } = await supabase.from('civilizations').select('name, unique_units, landmarks');
    if (!civs) { console.error('No data'); return; }

    const brokenUnits: any[] = [];
    const brokenLandmarks: any[] = [];

    process.stderr.write("Checking units...\n");
    for (const civ of civs) {
        for (const unit of (civ.unique_units || [])) {
            const id = unit.id?.toLowerCase().replace(/\s+/g, '-') || '';
            const url = `https://data.aoe4world.com/images/units/${id}.png`;
            const status = await checkUrl(url);
            if (status !== 200) {
                brokenUnits.push({ civ: civ.name, name: unit.name, id, status });
            }
        }
    }

    process.stderr.write("Checking landmarks...\n");
    for (const civ of civs) {
        for (const lm of (civ.landmarks || [])) {
            const id = lm.imageId || lm.id || '';
            const url = `https://data.aoe4world.com/images/buildings/${id}.png`;
            const status = await checkUrl(url);
            if (status !== 200) {
                brokenLandmarks.push({ civ: civ.name, name: lm.name, id, status });
            }
        }
    }

    console.log(JSON.stringify({ brokenUnits, brokenLandmarks }, null, 2));
    process.stderr.write(`\nDone: ${brokenUnits.length} broken units, ${brokenLandmarks.length} broken landmarks\n`);
}

main();
