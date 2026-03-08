async function checkApi() {
  const response = await fetch('https://aoe4world.com/api/v0/stats/rm_solo/maps?include_civs=true');
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2).substring(0, 2000));
}
checkApi();
