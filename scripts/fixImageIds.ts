import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

// Mapping: ID rotto -> ID corretto nel repo aoe4world
// Formato ID: usato per costruire URL immagine su aoe4world
// URL pattern: https://data.aoe4world.com/images/units/{id}/icon.png
//              https://data.aoe4world.com/images/buildings/{id}/icon.png

const UNIT_ID_FIXES: Record<string, string> = {
    // Rus
    "rus-knight": "knight", // Knight (Rus) usa l'ID generico

    // Ottomani
    sipahi: "sipahi",
    mehter: "mehter",
    janissary: "janissary",
    "great-bombard": "great-bombard",

    // Mongoli
    khan: "khan",
    keshik: "keshik",

    // HRE
    landsknecht: "landsknecht",

    // Cinesi
    "zhuge-nu": "zhuge-nu",
    "palace-guard": "palace-guard",
    "fire-lancer": "fire-lancer",
    grenadier: "grenadier",

    // Giovanna d'Arco
    "jeanne-hero": "jeanne-darc-knight", // L'hero di Giovanna è jeanne-darc-knight
    "jeannes-rider": "jeannes-rider",
    "jeannes-champion": "jeannes-champion",

    // Zhu Xi
    "zhuge-nu-zhuxi": "zhuge-nu", // Usa lo stesso ID base
    "shaolin-monk": "shaolin-monk",
    "yuan-raider": "yuan-raider",

    // Abbasidi
    "camel-archer": "camel-archer",
    ghulam: "ghulam",
    "camel-rider": "camel-rider",

    // Bizantini
    limitanei: "limitanei",
    "varangian-guard": "varangian-guard",
    cataphract: "cataphract",
    cheirosiphon: "cheirosiphon",

    // Giapponesi
    samurai: "samurai",
    "onna-bugeisha": "onna-bugeisha",
    shinobi: "shinobi",
    ozutsu: "ozutsu",

    // Ayyubidi
    "desert-raider": "desert-raider",
    "camel-lancer": "camel-lancer",
    "ghulam-ayyubid": "ghulam", // Ayyubid usa lo stesso ghulam base

    // Maliani
    donso: "donso",
    "javelin-thrower": "javelin-thrower",
    "musofadi-warrior": "musofadi-warrior",
    sofa: "sofa",

    // Francesi
    "royal-knight": "royal-knight",
    arbaletrier: "arbaletrier",
};

// Landmark ID fixes: ID rotto -> ID corretto
const LANDMARK_ID_FIXES: Record<string, string> = {
    // Rus
    "golden-gate": "the-golden-gate",
    "abbey-trinity": "abbey-of-the-trinity",

    // Ottomani
    sultanhani: "sultanhani-trade-network",
    "twin-minaret": "twin-minaret-medrese",
    "istanbul-palace": "istanbul-imperial-palace",
    "mehmed-armory": "mehmed-imperial-armory",
    "sea-gate-castle": "sea-gate-castle",

    // Mongoli
    "silver-tree": "the-silver-tree",
    "white-stupa": "the-white-stupa",

    // Giovanna d'Arco (usa gli stessi ID del gioco base francesi)
    "chamber-commerce-jd": "chamber-of-commerce",
    "school-cavalry-jd": "school-of-cavalry",
    "guild-hall-jd": "guild-hall",
    "royal-institute-jd": "royal-institute",
    "college-artillery-jd": "college-of-artillery",
    "red-palace-jd": "red-palace",

    // Zhu Xi
    "jiangnan-tower": "jiangnan-tower",
    "meditation-gardens": "meditation-gardens",
    "mount-lu": "mount-lu-academy",
    "shaolin-monastery": "shaolin-monastery",
    "temple-sun": "temple-of-the-sun",
    "zhuxi-library": "zhu-xis-library",

    // Abbasidi (usano landmark bizantini nel gioco)
    "grand-winery": "grand-winery",
    "imperial-hippodrome": "imperial-hippodrome",
    "cistern-first-hill": "cistern-of-the-first-hill",
    "golden-horn-tower": "golden-horn-tower",
    "foreign-engineering": "foreign-engineering-company",
    "palatine-school": "palatine-school",

    // Inglesi
    "white-tower": "the-white-tower",

    // Giapponesi
    "koka-township": "koka-township",
    "kura-storehouse": "kura-storehouse",
    "floating-gate": "floating-gate",
    "temple-equality": "temple-of-equality",
    tanegashima: "tanegashima-gunsmith",

    // Ayyubidi/Maliani (condividono landmark mali)
    "mansa-quarry": "mansa-quarry",
    "saharan-trade": "saharan-trade-network",
    "farimba-garrison": "farimba-garrison",
    "fulani-corral": "grand-fulani-corral",
    "fort-huntress": "fort-of-the-huntress",
    "griot-bara": "griot-bara",
};

async function fixImageIds() {
    let fixedUnits = 0;
    let fixedLandmarks = 0;
    let errors: string[] = [];

    console.log("🔧 Iniziando fix degli image ID...\n");

    // Fetch all civilizations
    const { data: civs, error: civError } = await supabase
        .from("civilizations")
        .select("id, name, unique_units, landmarks");

    if (civError) {
        console.error("Errore nel fetch civiltà:", civError);
        return;
    }

    for (const civ of civs || []) {
        let civUpdated = false;
        const updatedCiv: any = { unique_units: civ.unique_units, landmarks: civ.landmarks };

        // Fix unità
        if (Array.isArray(civ.unique_units)) {
            const updatedUnits = civ.unique_units.map((unit: any) => {
                if (unit.imageId && UNIT_ID_FIXES[unit.imageId]) {
                    const newId = UNIT_ID_FIXES[unit.imageId];
                    console.log(
                        `  [${civ.name}] Unit "${unit.name}": ${unit.imageId} -> ${newId}`
                    );
                    fixedUnits++;
                    civUpdated = true;
                    return { ...unit, imageId: newId };
                }
                return unit;
            });
            updatedCiv.unique_units = updatedUnits;
        }

        // Fix landmark
        if (Array.isArray(civ.landmarks)) {
            const updatedLandmarks = civ.landmarks.map((lm: any) => {
                if (lm.imageId && LANDMARK_ID_FIXES[lm.imageId]) {
                    const newId = LANDMARK_ID_FIXES[lm.imageId];
                    console.log(
                        `  [${civ.name}] Landmark "${lm.name}": ${lm.imageId} -> ${newId}`
                    );
                    fixedLandmarks++;
                    civUpdated = true;
                    return { ...lm, imageId: newId };
                }
                return lm;
            });
            updatedCiv.landmarks = updatedLandmarks;
        }

        // Aggiorna nel DB se ci sono modifiche
        if (civUpdated) {
            const { error: updateError } = await supabase
                .from("civilizations")
                .update({
                    unique_units: updatedCiv.unique_units,
                    landmarks: updatedCiv.landmarks,
                })
                .eq("id", civ.id);

            if (updateError) {
                errors.push(`Errore aggiornamento ${civ.name}: ${updateError.message}`);
                console.error(`  ❌ Errore aggiornamento ${civ.name}:`, updateError);
            } else {
                console.log(`  ✅ ${civ.name} aggiornata\n`);
            }
        }
    }

    console.log("\n📊 Riepilogo:");
    console.log(`  ✅ Unità corrette: ${fixedUnits}`);
    console.log(`  ✅ Landmark corretti: ${fixedLandmarks}`);
    if (errors.length > 0) {
        console.log(`  ❌ Errori: ${errors.length}`);
        errors.forEach((e) => console.log(`    - ${e}`));
    }
}

fixImageIds().catch(console.error);
