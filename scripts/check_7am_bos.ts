import fs from 'fs';
import path from 'path';

const state7amPath = path.join(process.cwd(), 'scripts', 'state_7am_pristine.json');
const civs7am = JSON.parse(fs.readFileSync(state7amPath, 'utf-8'));

const lancaster = civs7am.find((c: any) => c.id === 'lancaster');
const sengoku = civs7am.find((c: any) => c.id === 'sengoku');

console.log("Lancaster build orders in 7 AM state:", lancaster?.build_orders?.length || 0);
if (lancaster?.build_orders?.length > 0) {
    console.log("Lancaster BO titles:", lancaster.build_orders.map((b: any) => b.title));
}

console.log("Sengoku build orders in 7 AM state:", sengoku?.build_orders?.length || 0);
if (sengoku?.build_orders?.length > 0) {
    console.log("Sengoku BO titles:", sengoku.build_orders.map((b: any) => b.title));
}
