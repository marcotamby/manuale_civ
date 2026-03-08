import fs from 'fs';

async function run() {
  const res = await fetch("https://aoe4world.com/explorer", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  const text = await res.text();
  const regex = /<img[^>]+src=["']([^"']+)["']/g;
  let matches;
  while ((matches = regex.exec(text)) !== null) {
     console.log(matches[1]);
  }
}
run();
