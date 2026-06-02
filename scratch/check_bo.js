const testDescriptions = [
  'Research <img src="/assets/pictures/technology_economy/double-broadaxe.webp" class="icon-tech" /><img src="/assets/pictures/technology_japanese/takezaiku-2.webp" class="icon-tech" /> and build 4th <img src="/assets/pictures/unit_sengoku/yatai.webp" class="icon-default" />.',
  'Start queing units. <img src="/assets/pictures/unit_sengoku/yari-2.webp" class="icon-military" />/<img src="/assets/pictures/unit_japanese/yumi-ashigaru-2.webp" class="icon-military" />',
  'Build <img src="/assets/pictures/technology_sengoku/takeda_daimyo_1.webp" class="icon-tech" />/<img src="/assets/pictures/technology_sengoku/oda_daimyo_1.webp" class="icon-tech" /> depending on if you went <img src="https://aoe4guides.com/assets/pictures/building_military/stable.webp" class="icon-military" /> or <img src="/assets/pictures/unit_sengoku/daimyo.webp" class="icon-military" title="Daimyo" />.'
];

testDescriptions.forEach(desc => {
  console.log("Original:", desc);
  const parsed = desc
    .replace(/<img([^>]+)>/g, (match, attrs) => {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      if (titleMatch && titleMatch[1]) {
        return `[${titleMatch[1]}]`;
      }
      
      const srcMatch = attrs.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        const url = srcMatch[1];
        const filename = url.substring(url.lastIndexOf('/') + 1);
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
        const cleanName = nameWithoutExt.replace(/[-_]/g, ' ');
        return `[${cleanName}]`;
      }
      return '';
    })
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '');
    
  console.log("Parsed  :", parsed);
  console.log("------------------------");
});
