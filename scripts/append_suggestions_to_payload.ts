import fs from 'fs';
import path from 'path';

const suggestionsPath = 'c:\\Users\\marco\\OneDrive\\Desktop\\manualeciv\\scripts\\all_supabase_suggestions.json';
const payloadPath = 'c:\\Users\\marco\\OneDrive\\Desktop\\manualeciv\\recovery_payload.json';

const suggestions = JSON.parse(fs.readFileSync(suggestionsPath, 'utf-8'));
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

const lancasterSugg = suggestions.find((s: any) => s.civ_name === 'Lancaster' && s.section === 'build_order');
const sengokuSugg = suggestions.find((s: any) => s.civ_name === 'Sengoku Daimyo' && s.section === 'build_order');

if (lancasterSugg) {
  const bo = {
    id: `bo-1773663600000-lanc`,
    ...JSON.parse(lancasterSugg.suggestion_text),
    difficulty: 'Medium',
    author_nickname: lancasterSugg.user_nickname || lancasterSugg.user_name || null,
    author_rank: lancasterSugg.user_rank || 'Unranked'
  };
  let civ = payload.find((c: any) => c.id === 'lancaster');
  if (!civ) {
      civ = { id: 'lancaster', build_orders: [] };
      payload.push(civ);
  }
  civ.build_orders = civ.build_orders || [];
  if (!civ.build_orders.some((existingBo: any) => existingBo.title === bo.title)) {
      civ.build_orders.push(bo);
  }
}

if (sengokuSugg) {
  const bo = {
    id: `bo-1773663600001-sen`,
    ...JSON.parse(sengokuSugg.suggestion_text),
    difficulty: 'Medium',
    author_nickname: sengokuSugg.user_nickname || sengokuSugg.user_name || null,
    author_rank: sengokuSugg.user_rank || 'Unranked'
  };
  let civ = payload.find((c: any) => c.id === 'sengoku');
  if (!civ) {
      civ = { id: 'sengoku', build_orders: [] };
      payload.push(civ);
  }
  civ.build_orders = civ.build_orders || [];
  if (!civ.build_orders.some((existingBo: any) => existingBo.title === bo.title)) {
      civ.build_orders.push(bo);
  }
}

fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
console.log('Successfully appended Sengoku and Lancaster build orders to recovery_payload.json');
