import fs from 'fs';
import path from 'path';

async function main() {
  const state7amPath = path.join(process.cwd(), 'scripts', 'state_7am_pristine.json');
  const suggestionsPath = path.join(process.cwd(), 'scripts', 'all_supabase_suggestions.json');
  
  if (!fs.existsSync(state7amPath) || !fs.existsSync(suggestionsPath)) {
      console.error("Missing state or suggestions files!");
      process.exit(1);
  }

  const civs7am = JSON.parse(fs.readFileSync(state7amPath, 'utf-8'));
  const suggestions = JSON.parse(fs.readFileSync(suggestionsPath, 'utf-8'));

  // Define exactly what we need to inject from our work today
  
  // 1. My fixes to unique_units for specific civs
  const hreUnits = [
      "Landsknecht - (Età 3)",
      "Prelato - (Età 1)",
      "Man-at-Arms - (Età 2)"
  ];
  const templarUnits = [
      "Hospitaller Knight",
      "Serjeant",
      "Genoese Crossbowman",
      "Heavy Spearman",
      "Condottiero",
      "Teutonic Knight",
      "Chevalier Confrere",
      "Templar Brother",
      "Venetian Trader",
      "Venetian Galley"
  ];
  const lancasterUnits = [
      "Longbowman",
      "Lord of Lancaster",
      "Demilancer",
      "Earl's Guard",
      "Yeoman",
      "Hobelar"
  ];

  // 2. The recovered build orders from suggestions
  const lancasterSugg = suggestions.find((s: any) => s.civ_name === 'Lancaster' && s.section === 'build_order');
  const sengokuSugg = suggestions.find((s: any) => s.civ_name === 'Sengoku Daimyo' && s.section === 'build_order');

  let mergedCount = 0;

  for (const civ of civs7am) {
    
    // Inject HRE units
    if (civ.id === 'hre') {
        civ.unique_units = hreUnits;
        console.log(`✅ Injected updated unique_units for HRE`);
    }

    // Inject Templar units
    if (civ.id === 'templar') {
        civ.unique_units = templarUnits;
        console.log(`✅ Injected updated unique_units for Templar`);
    }

    // Inject Lancaster units and build order
    if (civ.id === 'lancaster') {
        civ.unique_units = lancasterUnits;
        console.log(`✅ Injected updated unique_units for Lancaster`);
        
        if (lancasterSugg) {
            const bo = {
                id: `bo-1773663600000-lanc`,
                ...JSON.parse(lancasterSugg.suggestion_text),
                difficulty: 'Medium',
                author_nickname: lancasterSugg.user_nickname || lancasterSugg.user_name || null,
                author_rank: lancasterSugg.user_rank || 'Unranked'
            };
            civ.build_orders = civ.build_orders || [];
            if (!civ.build_orders.some((existingBo: any) => existingBo.title === bo.title)) {
                civ.build_orders.push(bo);
                console.log(`✅ Appended recovered suggestion build order for Lancaster`);
                mergedCount++;
            }
        }
    }

    // Inject Sengoku build order
    if (civ.id === 'sengoku') {
        if (sengokuSugg) {
            const bo = {
                id: `bo-1773663600001-sen`,
                ...JSON.parse(sengokuSugg.suggestion_text),
                difficulty: 'Medium',
                author_nickname: sengokuSugg.user_nickname || sengokuSugg.user_name || null,
                author_rank: sengokuSugg.user_rank || 'Unranked'
            };
            civ.build_orders = civ.build_orders || [];
            if (!civ.build_orders.some((existingBo: any) => existingBo.title === bo.title)) {
                civ.build_orders.push(bo);
                console.log(`✅ Appended recovered suggestion build order for Sengoku Daimyo`);
                mergedCount++;
            }
        }
    }
  }

  const outputMergedPath = path.join(process.cwd(), 'scripts', 'supabase_civs_ultimate_safe_merged.json');
  fs.writeFileSync(outputMergedPath, JSON.stringify(civs7am, null, 2));
  console.log(`\n🎉 Ultimate safe merge complete! Saved to ${outputMergedPath}`);
}

main();
