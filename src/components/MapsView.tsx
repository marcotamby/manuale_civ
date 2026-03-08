
interface MapInfo {
  name: string;
  category: string;
  url: string;
}

const MAPS_DATA: MapInfo[] = [
  { name: "African Waters", category: "Acquatica", url: "https://liquipedia.net/ageofempires/African_Waters_(AoE4)" },
  { name: "Altai", category: "Terrestre", url: "https://liquipedia.net/ageofempires/Altai" },
  { name: "Ancient Spires", category: "Ibrida", url: "https://liquipedia.net/ageofempires/Ancient_Spires" },
  { name: "Arabia", category: "Terrestre", url: "https://liquipedia.net/ageofempires/Arabia_(AoE4)" },
  { name: "Archipelago", category: "Acquatica", url: "https://liquipedia.net/ageofempires/Archipelago_(AoE4)" },
  { name: "Black Forest", category: "Chiusa", url: "https://liquipedia.net/ageofempires/Black_Forest_(AoE4)" },
  { name: "Boulder Bay", category: "Acquatica", url: "https://liquipedia.net/ageofempires/Boulder_Bay" },
  { name: "Confluence", category: "Ibrida", url: "https://liquipedia.net/ageofempires/Confluence_(AoE4)" },
  { name: "Danube River", category: "Ibrida", url: "https://liquipedia.net/ageofempires/Danube_River" },
  { name: "Dry Arabia", category: "Terrestre", url: "https://liquipedia.net/ageofempires/Dry_Arabia" },
  { name: "French Pass", category: "Chiusa", url: "https://liquipedia.net/ageofempires/French_Pass" },
  { name: "Hill and Dale", category: "Chiusa", url: "https://liquipedia.net/ageofempires/Hill_and_Dale" },
  { name: "High View", category: "Terrestre", url: "https://liquipedia.net/ageofempires/High_View" },
  { name: "King of the Hill", category: "Terrestre", url: "https://liquipedia.net/ageofempires/King_of_the_Hill_(AoE4)" },
  { name: "Lipany", category: "Terrestre", url: "https://liquipedia.net/ageofempires/Lipany" },
  { name: "MegaRandom", category: "Speciale", url: "https://liquipedia.net/ageofempires/MegaRandom_(AoE4)" },
  { name: "Mongolian Heights", category: "Ibrida", url: "https://liquipedia.net/ageofempires/Mongolian_Heights" },
  { name: "Mountain Pass", category: "Chiusa", url: "https://liquipedia.net/ageofempires/Mountain_Pass_(AoE4)" },
  { name: "Nagari", category: "Ibrida", url: "https://liquipedia.net/ageofempires/Nagari" },
  { name: "The Pit", category: "Terrestre", url: "https://liquipedia.net/ageofempires/The_Pit" },
];

export function MapsView() {
  const categories = Array.from(new Set(MAPS_DATA.map(m => m.category)));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--color-brand-dark)]">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
          Mappe di Age of Empires IV
        </h1>
        <p className="text-gray-400 italic">Lista completa delle mappe competitive e casuali.</p>
      </header>

      <div className="space-y-12 max-w-6xl pb-20">
        {categories.map(category => (
          <section key={category}>
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-yellow-500 pl-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MAPS_DATA.filter(m => m.category === category).map(map => (
                <a
                  key={map.name}
                  href={map.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass p-5 rounded-2xl border border-white/5 hover:border-yellow-500/50 hover:bg-white/5 transition-all group flex flex-col justify-between h-32"
                >
                  <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">{map.name}</h3>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">{category}</span>
                    <span className="text-xs text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity">Vedi su Liquipedia →</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
