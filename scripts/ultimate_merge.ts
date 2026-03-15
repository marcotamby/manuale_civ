import fs from 'fs';
import path from 'path';

async function main() {
  const state7amPath = path.join(process.cwd(), 'scripts', 'supabase_civs_7am_state.json');
  const presentStatePath = path.join(process.cwd(), 'scripts', 'supabase_civs_present_state.json');
  
  if (!fs.existsSync(state7amPath) || !fs.existsSync(presentStatePath)) {
      console.error("Missing state files!");
      process.exit(1);
  }

  const civs7am = JSON.parse(fs.readFileSync(state7amPath, 'utf-8'));
  const presentCivs = JSON.parse(fs.readFileSync(presentStatePath, 'utf-8'));

  // civs7am is our GOLDEN TRUTH for: strengths, weaknesses, build_orders.
  // presentCivs is our GOLDEN TRUTH for: unique_units, technologies, landmarks, videos, passive_bonuses.
  // We also need to add Lancaster and Sengoku build orders from presentCivs since we recovered those today.

  for (const presentCiv of presentCivs) {
    let civ7am = civs7am.find((c: any) => c.id === presentCiv.id);
    
    // If the civ didn't exist at 7 AM (e.g. a brand new civ), add it completely
    if (!civ7am) {
        civs7am.push(presentCiv);
        console.log(`➕ Added entirely new civ from present state: ${presentCiv.id}`);
        continue;
    }

    // Update code-based arrays
    civ7am.unique_units = presentCiv.unique_units;
    civ7am.technologies = presentCiv.technologies;
    civ7am.landmarks = presentCiv.landmarks;
    civ7am.videos = presentCiv.videos;
    civ7am.passive_bonuses = presentCiv.passive_bonuses;
    civ7am.flag = presentCiv.flag;
    civ7am.difficulty = presentCiv.difficulty;
    civ7am.short_description = presentCiv.short_description;

    // Specifically inject the Lancaster and Sengoku build orders if missing
    if (presentCiv.id === 'lancaster' || presentCiv.id === 'sengoku') {
        civ7am.build_orders = civ7am.build_orders || [];
        for (const presentBo of (presentCiv.build_orders || [])) {
            if (!civ7am.build_orders.some((bo: any) => bo.title === presentBo.title)) {
                civ7am.build_orders.push(presentBo);
                console.log(`✅ Appended newly recovered build order '${presentBo.title}' for ${presentCiv.id}`);
            }
        }
    }
  }

  const outputMergedPath = path.join(process.cwd(), 'scripts', 'supabase_civs_ultimate_merged.json');
  fs.writeFileSync(outputMergedPath, JSON.stringify(civs7am, null, 2));
  console.log(`\n🎉 Ultimate merge complete! Output saved to ${outputMergedPath}`);
}

main();
