export type UnitType = 'Infantry' | 'Cavalry' | 'Siege' | 'Ranged';
export type Age = 1 | 2 | 3 | 4;

export interface UnitStats {
  attack: number;
  armor: number;
  speed: number;
  health: number;
}

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  age: Age;
  stats: UnitStats;
  strengths: string[];
  weaknesses: string[];
  description: string;
  excludedCivs?: string[];
}

export interface Technology {
  id: string;
  name: string;
  age: Age;
  description: string;
  building: string;
}

export interface Landmark {
  id: string;
  name: string;
  age: Age;
  description: string;
  type: 'Military' | 'Economic' | 'Defensive' | 'Religious' | 'Technology';
  imageId?: string;
}

export interface BuildOrderStep {
  time?: string;
  action: string;
  villagers?: string;
  note?: string;
}

export interface BuildOrder {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  steps: BuildOrderStep[];
}

export interface Civilization {
  id: string;
  name: string;
  flag: string;
  difficulty: 'Facile' | 'Medio' | 'Difficile';
  shortDescription: string;
  passiveBonuses: string[];
  uniqueUnits: Unit[];
  technologies: Technology[];
  landmarks: Landmark[];
  videos?: string[];
  buildOrders?: BuildOrder[];
}

export const unitsList: Unit[] = [
  {
    id: "archer",
    name: "Archer",
    type: "Ranged",
    age: 2,
    stats: { attack: 5, armor: 0, speed: 1.25, health: 70 },
    strengths: ["Spearmen","Crossbowmen"],
    weaknesses: ["Cavalry","Man-at-Arms"],
    description: "Cheap ranged infantry with good damage vs. unarmored targets.\n+ High rate of fire\n- Weak against high ranged armor targets\n- Countered by Horsemen",
    excludedCivs: ['english', 'japanese', 'lancaster', 'macedonian', 'orderofthedragon', 'sengoku', 'zhuxi']
  },
  {
    id: "crossbowman",
    name: "Crossbowman",
    type: "Ranged",
    age: 3,
    stats: { attack: 11, armor: 0, speed: 1.13, health: 80 },
    strengths: ["Heavy Infantry","Heavy Cavalry"],
    weaknesses: ["Light Cavalry","Archers"],
    description: "High damage ranged unit best against heavy targets.\n+ Anti-heavy specialist\n- Low health\n- Countered by Horsemen",
    excludedCivs: ['french', 'japanese', 'jeannedarc', 'malians', 'orderofthedragon', 'sengoku']
  },
  {
    id: "handcannoneer",
    name: "Handcannoneer",
    type: "Ranged",
    age: 4,
    stats: { attack: 38, armor: 0, speed: 1.13, health: 130 },
    strengths: ["Infantry","Cavalry"],
    weaknesses: ["Mangonels","Archers"],
    description: "Powerful all-purpose ranged infantry.\n+ High damage\n- High cost\n- Slow movement speed\n- Countered by Horsemen",
    excludedCivs: ['japanese', 'malians', 'orderofthedragon', 'ottomans', 'rus', 'sengoku', 'templar', 'zhuxi']
  },
  {
    id: "mangonel",
    name: "Mangonel",
    type: "Siege",
    age: 3,
    stats: { attack: 10, armor: 0, speed: 0.75, health: 130 },
    strengths: ["Ranged Infantry","Light Infantry"],
    weaknesses: ["Springalds","Cavalry"],
    description: "Fires multiple projectiles dealing damage in an area.\n+ Effective against massed units\n- Must be set up to fire",
    excludedCivs: ['ayyubids', 'chinese', 'zhuxi']
  },
  {
    id: "spearman",
    name: "Spearman",
    type: "Infantry",
    age: 1,
    stats: { attack: 7, armor: 0, speed: 1.25, health: 80 },
    strengths: ["Cavalry"],
    weaknesses: ["Archers","Heavy Infantry"],
    description: "Infantry best used against mounted units.\n+ Anti-cavalry specialist\n+ Additional damage against Elephants\n- Weak against heavy infantry\n- Countered by Archers",
    excludedCivs: ['byzantines', 'macedonian', 'malians', 'orderofthedragon']
  },
  {
    id: "springald",
    name: "Springald",
    type: "Siege",
    age: 3,
    stats: { attack: 14, armor: 3, speed: 0.88, health: 85 },
    strengths: ["Siege"],
    weaknesses: ["Melee Units"],
    description: "Anti-unit siege weapon. Fires bolts that pierce multiple units.\n+ Does not require setup to fire\n+ Bonus damage vs. melee infantry\n- Trivial damage vs. buildings",
    excludedCivs: ['tughlaq']
  },
  {
    id: "bombard",
    name: "Bombard",
    type: "Siege",
    age: 4,
    stats: { attack: 55, armor: 0, speed: 0.75, health: 210 },
    strengths: ["Buildings"],
    weaknesses: ["Melee Units"],
    description: "Intimidating siege gun excellent against buildings or any stubborn targets.\n+ High damage\n- Must be set up to fire",
    excludedCivs: ['abbasid', 'ayyubids', 'french', 'hre', 'jeannedarc', 'lancaster', 'orderofthedragon', 'ottomans', 'templar']
  },
  {
    id: "man-at-arms",
    name: "Man-at-Arms",
    type: "Infantry",
    age: 3,
    stats: { attack: 12, armor: 4, speed: 1.13, health: 155 },
    strengths: ["Light Infantry","Archers"],
    weaknesses: ["Crossbowmen","Heavy Cavalry"],
    description: "Tough infantry with good damage.\n+ High armor\n- Slow movement\n- Countered by Knights, Lancers, and Crossbowmen",
    excludedCivs: ['abbasid', 'ayyubids', 'byzantines', 'chinese', 'japanese', 'lancaster', 'macedonian', 'malians', 'orderofthedragon', 'sengoku', 'zhuxi']   
  },
  {
    id: "knight",
    name: "Knight",
    type: "Cavalry",
    age: 3,
    stats: { attack: 24, armor: 4, speed: 1.63, health: 230 },
    strengths: ["Archers","Swordsmen"],
    weaknesses: ["Spearmen","Camels"],
    description: "Expensive cavalry with high damage and melee armor. Effective against melee units.\n+ Heavy armor\n+ Strong in melee combat\n- Countered by Spearmen and Crossbowmen",
    excludedCivs: ['abbasid', 'ayyubids', 'delhi', 'byzantines', 'chinese', 'french', 'goldenhorde', 'japanese', 'jeannedarc', 'macedonian', 'malians', 'mongols', 'orderofthedragon', 'ottomans', 'sengoku', 'templar', 'tughlaq', 'zhuxi']
  }
];

// Civilizations list
export const civilizationsData: Civilization[] = [
  {
    id: "abbasid",
    name: "Abbasidi",
    flag: "/civs/Abbasid Dynasty.png",
    difficulty: "Medio",
    shortDescription: "A flexible and adaptable civilization focused on the House of Wisdom.",
    passiveBonuses: ["Constructing buildings near the House of Wisdom increases the Golden Age tier.", "Berry bushes gather 30% faster but cannot hunt Boars."],
    uniqueUnits: [
      {
        id: "camel-archer",
        name: "Camel Archer",
        type: "Ranged",
        age: 2,
        stats: { attack: 11, armor: 0, speed: 1.62, health: 150 },
        strengths: ["Cavalry", "Archers"],
        weaknesses: ["Knights", "Horsemen"],
        description: "Mobile ranged unit that debuffs nearby horse cavalry."
      },
      {
        id: "ghulam",
        name: "Ghulam",
        type: "Infantry",
        age: 3,
        stats: { attack: 20, armor: 4, speed: 1.12, health: 195 },
        strengths: ["Light Infantry", "Archers"],
        weaknesses: ["Knights", "Crossbowmen"],
        description: "Tough infantry that delivers a rapid double-strike attack."
      },
      {
        id: "camel-rider",
        name: "Camel Rider",
        type: "Cavalry",
        age: 3,
        stats: { attack: 14, armor: 0, speed: 1.62, health: 270 },
        strengths: ["Cavalry"],
        weaknesses: ["Spearmen", "Crossbowmen"],
        description: "Anti-cavalry specialist that applies the Camels Unease debuff."
      }
    ],
    technologies: [],
    landmarks: [
      { id: "house-of-wisdom", name: "House of Wisdom (Costruita in Età I)", age: 1, type: "Technology", description: "L'edificio centrale da cui si ricercano le Ali per avanzare d'età. Le ali sbloccano potenti tecnologie esclusive." },
      { id: "economic-wing-2", imageId: "economic-wing", name: "Ala Economica", age: 2, type: "Economic", description: "Sblocca tecnologie come Fresh Foodstuffs (-35% costo abitanti), Agriculture e Improved Processing. Può essere scelta in Età 2, 3 o 4." },
      { id: "military-wing-2", imageId: "military-wing", name: "Ala Militare", age: 2, type: "Military", description: "Sblocca tecnologie per potenziare la fanteria e i cammelli (Boot Camp, Camel Support, Camel Shields). Può essere scelta in Età 2, 3 o 4." },
      { id: "culture-wing-2", imageId: "culture-wing", name: "Ala Culturale", age: 2, type: "Technology", description: "Sblocca tecnologie chiave come Preservation of Knowledge (-30% costo ricerche) e cure mediche. Può essere scelta in Età 2, 3 o 4." },
      { id: "trade-wing-2", imageId: "trade-wing", name: "Ala Commerciale", age: 2, type: "Economic", description: "Migliora enormemente il commercio, fornendo bonus difensivi e risorse secondarie ai mercanti. Può essere scelta in Età 2, 3 o 4." },
      
      { id: "economic-wing-3", imageId: "economic-wing", name: "Ala Economica", age: 3, type: "Economic", description: "Sblocca tecnologie come Fresh Foodstuffs, Agriculture e Improved Processing." },
      { id: "military-wing-3", imageId: "military-wing", name: "Ala Militare", age: 3, type: "Military", description: "Sblocca tecnologie infanteria e cammelli. Fornisce inoltre truppe immediate se costruita." },
      { id: "culture-wing-3", imageId: "culture-wing", name: "Ala Culturale", age: 3, type: "Technology", description: "Sblocca Preservation of Knowledge e Medical Centers." },
      { id: "trade-wing-3", imageId: "trade-wing", name: "Ala Commerciale", age: 3, type: "Economic", description: "Migliora l'economia del mercato e dei commercianti." },

      { id: "economic-wing-4", imageId: "economic-wing", name: "Ala Economica", age: 4, type: "Economic", description: "Completa i potenziamenti agricoli e della raccolta." },
      { id: "military-wing-4", imageId: "military-wing", name: "Ala Militare", age: 4, type: "Military", description: "Completa i potenziamenti bellici per fanteria e cavalieri su cammello." },
      { id: "culture-wing-4", imageId: "culture-wing", name: "Ala Culturale", age: 4, type: "Technology", description: "Permette agli Imām di convertire le unità senza reliquia." },
      { id: "trade-wing-4", imageId: "trade-wing", name: "Ala Commerciale", age: 4, type: "Economic", description: "Permette ai commercianti di riportare risorse secondarie preziose." }
    ]
  },
  {
    id: "ayyubids",
    name: "Ayyubidi",
    flag: "/civs/Ayyubids.png",
    difficulty: "Medio",
    shortDescription: "A versatile civilization leveraging Desert Raiders and House of Wisdom advancements.",
    passiveBonuses: ["House of Wisdom wings grant unique, immediate bonuses when advancing."],
    uniqueUnits: [
      { id: "desert-raider", name: "Desert Raider", type: "Cavalry", age: 2, stats: { attack: 10, armor: 0, speed: 1.62, health: 120 }, strengths: ["Light Units"], weaknesses: ["Knights"], description: "Versatile raider that can switch between melee and ranged." },
      { id: "camel-lancer", name: "Camel Lancer", type: "Cavalry", age: 3, stats: { attack: 22, armor: 3, speed: 1.62, health: 210 }, strengths: ["Cavalry"], weaknesses: ["Spearmen"], description: "Strong heavy camel cavalry." },
      { id: "ghulam-ayyubid", name: "Ghulam", type: "Infantry", age: 3, stats: { attack: 12, armor: 4, speed: 1.12, health: 195 }, strengths: ["Light Infantry"], weaknesses: ["Knights"], description: "Tough infantry with a double-strike attack." }
    ],
    technologies: [],
    landmarks: [
      { id: "house-of-wisdom-ay", imageId: "house-of-wisdom", name: "House of Wisdom (Costruita in Età I)", age: 1, type: "Technology", description: "Dalla House of Wisdom si scelgono le Ali per avanzare. A differenza degli Abbasidi, le ali forniscono bonus immediati unici tra due scelte per ala." },
      { id: "culture-wing-logistics-2", imageId: "culture-wing", name: "Ala Culturale (Curatori / Avanzamento)", age: 2, type: "Religious", description: "Scegli tra Dervisci gratuiti (Logistica) o avanzamenti d'età più veloci ed economici (Avanzamento). Disponibile in tutte le età." },
      { id: "economic-wing-growth-2", imageId: "economic-wing", name: "Ala Economica (Crescita / Industria)", age: 2, type: "Economic", description: "Scegli tra la creazione automatica di abitanti extra (Crescita) o grandi carichi di legno gratuiti (Industria). Disponibile in tutte le età." },
      { id: "military-wing-smith-2", imageId: "military-wing", name: "Ala Militare (Fabbri / Rinforzi)", age: 2, type: "Military", description: "Scegli tra potenziamenti da Fabbro automatici gratuiti (Maestri Fabbri) o un flusso costante di Desert Raiders gratuiti (Rinforzi). Disponibile in tutte le età." },
      { id: "trade-wing-bazaar-2", imageId: "trade-wing", name: "Ala Commerciale (Bazar / Consiglieri)", age: 2, type: "Economic", description: "Scegli tra mercanti neutrali che offrono scambi eccellenti (Bazar) o potenti Atabeg che supportano le guarnigioni (Consiglieri). Disponibile in tutte le età." },

      { id: "culture-wing-logistics-3", imageId: "culture-wing", name: "Ala Culturale (Curatori / Avanzamento)", age: 3, type: "Religious", description: "Ottieni Dervisci (Logistica) o sconti sull'avanzamento d'età (Avanzamento)." },
      { id: "economic-wing-growth-3", imageId: "economic-wing", name: "Ala Economica (Crescita / Industria)", age: 3, type: "Economic", description: "Abitanti gratuiti extra (Crescita) o legna immediata (Industria)." },
      { id: "military-wing-smith-3", imageId: "military-wing", name: "Ala Militare (Fabbri / Rinforzi)", age: 3, type: "Military", description: "Upgrades del fabbro gratuiti e istantanei (Maestri Fabbri) o spawn periodico di Desert Raiders d'élite (Rinforzi)." },
      { id: "trade-wing-bazaar-3", imageId: "trade-wing", name: "Ala Commerciale (Bazar / Consiglieri)", age: 3, type: "Economic", description: "Genera scambi speciali al Bazar (Bazar) o fornisce preziosi Atabeg per potenziare la salute dell'esercito (Consiglieri)." },
      
      { id: "culture-wing-logistics-4", imageId: "culture-wing", name: "Ala Culturale (Curatori / Avanzamento)", age: 4, type: "Religious", description: "Dervisci o avanzamento d'età finale." },
      { id: "economic-wing-growth-4", imageId: "economic-wing", name: "Ala Economica (Crescita / Industria)", age: 4, type: "Economic", description: "Enorme flusso di abitanti rapidi o massiccia iniezione di legno." },
      { id: "military-wing-smith-4", imageId: "military-wing", name: "Ala Militare (Fabbri / Rinforzi)", age: 4, type: "Military", description: "Garantisce gli ultimi potenziamenti fabbro o grandi spawn di incursori del deserto." },
      { id: "trade-wing-bazaar-4", imageId: "trade-wing", name: "Ala Commerciale (Bazar / Consiglieri)", age: 4, type: "Economic", description: "Ultimi scambi neutri iper-convenienti o Atabeg supremi." }
    ]
  },
  {
    id: "delhi",
    name: "Sultanato di Delhi",
    flag: "/civs/Delhi Sultanate.png",
    difficulty: "Difficile",
    shortDescription: "A research-focused civilization with free technologies and War Elephants.",
    passiveBonuses: ["All technologies are free but take longer to research.", "Scholars speed up research times significantly."],
    uniqueUnits: [
      { id: "scholar", name: "Scholar", type: "Infantry", age: 1, stats: { attack: 0, armor: 0, speed: 1.12, health: 90 }, strengths: ["Research Boost"], weaknesses: ["Everything"], description: "Speeds up research and heals units." },
      { id: "ghazi-raider", name: "Ghazi Raider", type: "Cavalry", age: 2, stats: { attack: 13, armor: 0, speed: 1.62, health: 125 }, strengths: ["Heavy Cavalry"], weaknesses: ["Spearmen"], description: "Strong light cavalry effective vs heavy armor." },
      { id: "war-elephant", name: "War Elephant", type: "Cavalry", age: 3, stats: { attack: 30, armor: 4, speed: 1.00, health: 700 }, strengths: ["Buildings", "Infantry"], weaknesses: ["Spearmen", "Crossbowmen"], description: "Massive high-health melee unit." }
    ],
    technologies: [],
    landmarks: [
      { id: "dome-faith", name: "Dome of the Faith", age: 2, type: "Religious", description: "Produces Scholars at -50% cost." },
      { id: "tower-victory", name: "Tower of Victory", age: 2, type: "Military", description: "Infantry near tower gain +15% attack speed permanently." },
      { id: "compound-defender", name: "Compound of the Defender", age: 3, type: "Defensive", description: "Infantry can build stone walls; reduces stone cost." },
      { id: "house-learning", name: "House of Learning", age: 3, type: "Technology", description: "Unlocks diverse unique technologies." },
      { id: "palace-sultan", name: "Palace of the Sultan", age: 4, type: "Religious", description: "Periodically produces free Tower Elephants." }
    ]
  },
  {
    id: "byzantines",
    name: "Bizantini",
    flag: "/civs/Byzantines.png",
    difficulty: "Difficile",
    shortDescription: "A complex defensive civilization utilizing an aqueduct network and mercenaries.",
    passiveBonuses: ["Aqueducts increase production speed and gather rates.", "Can hire foreign mercenaries using Olive Oil."],
    uniqueUnits: [
      { id: "limitanei", name: "Limitanei", type: "Infantry", age: 2, stats: { attack: 9, armor: 0, speed: 1.12, health: 90 }, strengths: ["Cavalry"], weaknesses: ["Archers"], description: "Spearman replacement with Shield Wall ability." },
      { id: "varangian-guard", name: "Varangian Guard", type: "Infantry", age: 3, stats: { attack: 12, armor: 4, speed: 1.12, health: 160 }, strengths: ["Heavy Units"], weaknesses: ["Crossbowmen"], description: "Elite infantry that can use Berserk mode." },
      { id: "cataphract", name: "Cataphract", type: "Cavalry", age: 3, stats: { attack: 24, armor: 4, speed: 1.38, health: 280 }, strengths: ["All Ground Units"], weaknesses: ["Spearmen"], description: "Super heavy cavalry with a Trample charge." },
      { id: "cheirosiphon", name: "Cheirosiphon", type: "Siege", age: 3, stats: { attack: 0, armor: 0, speed: 0.88, health: 220 }, strengths: ["Buildings"], weaknesses: ["Melee"], description: "Greek Fire ram that deals area fire damage." }
    ],
    technologies: [],
    landmarks: [
      { id: "grand-winery", name: "Grand Winery", age: 2, type: "Economic", description: "+60% Olive Oil from nearby farms; acts as a Monastery." },
      { id: "imperial-hippodrome", name: "Imperial Hippodrome", age: 2, type: "Military", description: "Unlocks Triumph ability for cavalry speed/heal." },
      { id: "cistern-first-hill", name: "Cistern of the First Hill", age: 3, type: "Defensive", description: "Acts as a large Cistern; provides healing flasks." },
      { id: "golden-horn-tower", name: "Golden Horn Tower", age: 3, type: "Military", description: "Periodically spawns free Mercenary units." },
      { id: "foreign-engineering", name: "Foreign Engineering Company", age: 4, type: "Military", description: "Produces unique mercenary siege units." },
      { id: "palatine-school", name: "Palatine School", age: 4, type: "Technology", description: "Acts as a University; produces free elite mercenary units when researching technologies." }
    ]
  },
  {
    id: "chinese",
    name: "Cinesi",
    flag: "/civs/Chinese.png",
    difficulty: "Difficile",
    shortDescription: "A booming civilization with rapid construction, powerful dynasties, and gunpowder.",
    passiveBonuses: ["Villagers construct defenses 50% faster and all other buildings 100% faster.", "Can build both Landmarks in an Age to unlock powerful Dynasties."],
    uniqueUnits: [
      {
        id: "imperial-official",
        name: "Imperial Official",
        type: "Infantry",
        age: 1,
        stats: { attack: 0, armor: 0, speed: 1.12, health: 75 },
        strengths: ["Economic Buff", "Tax Collection"],
        weaknesses: ["Everything"],
        description: "Collects tax gold and supervises buildings for production bonuses."
      },
      {
        id: "zhuge-nu",
        name: "Zhuge Nu",
        type: "Ranged",
        age: 2,
        stats: { attack: 12, armor: 0, speed: 1.12, health: 70 },
        strengths: ["Light Infantry"],
        weaknesses: ["Knights", "Horsemen"],
        description: "Rapid-fire crossbowman that fires 3 bolts per attack."
      },
      {
        id: "palace-guard",
        name: "Palace Guard",
        type: "Infantry",
        age: 3,
        stats: { attack: 12, armor: 3, speed: 1.25, health: 155 },
        strengths: ["Light Infantry", "Archers"],
        weaknesses: ["Knights", "Crossbowmen"],
        description: "Faster variant of the Man-at-Arms with high durability."
      }
    ],
    technologies: [],
    landmarks: [
      { id: "imperial-academy", name: "Imperial Academy", age: 2, type: "Economic", description: "Increases tax gold generated by nearby buildings by +100%." },
      { id: "barbican-of-the-sun", name: "Barbican of the Sun", age: 2, type: "Defensive", description: "Strong fortification with a long-range cannon." },
      { id: "astronomical-clocktower", name: "Astronomical Clocktower", age: 3, type: "Military", description: "Produces siege units with +50% health." },
      { id: "imperial-palace", name: "Imperial Palace", age: 3, type: "Economic", description: "Large vision; reveals enemy villager locations." },
      { id: "great-wall-gatehouse", name: "Great Wall Gatehouse", age: 4, type: "Defensive", description: "Increases health of Stone Walls/Gates by +100%." },
      { id: "spirit-way", name: "Spirit Way", age: 4, type: "Military", description: "Reduces Dynasty unit costs by -30% nearby." }
    ]
  },
  {
    id: "delhi",
    name: "Sultanato di Delhi",
    flag: "/civs/Delhi Sultanate.png",
    difficulty: "Difficile",
    shortDescription: "A research-focused civilization with free technologies and War Elephants.",
    passiveBonuses: ["All technologies are free but take longer to research.", "Scholars speed up research times significantly."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "english",
    name: "Inglesi",
    flag: "/civs/English.png",
    difficulty: "Facile",
    shortDescription: "A defensive civilization with a strong agricultural economy and the formidable Longbowman.",
    passiveBonuses: [
      "Farms are 50% cheaper to construct.",
      "Network of Castles: Town Centers, Outposts, Towers, and Keeps grant a +25% attack speed bonus.",
      "Vanguard Men-at-Arms available in the Dark Age (I)."
    ],
    uniqueUnits: [
      {
        id: "king-2",
        name: "King",
        type: "Cavalry",
        age: 2,
        stats: { attack: 16, armor: 2, speed: 1.62, health: 220 },
        strengths: ["Raiding", "Heal Support"],
        weaknesses: ["Spearmen", "Crossbowmen"],
        description: "A powerful leader that heals nearby out-of-combat units by +2 HP/s."
      },
      {
        id: "longbowman-2",
        name: "Longbowman",
        type: "Ranged",
        age: 2,
        stats: { attack: 6, armor: 0, speed: 1.12, health: 70 },
        strengths: ["Spearmen", "Archers", "Light Infantry"],
        weaknesses: ["Knights", "Horsemen"],
        description: "Long-ranged archer unit capable of deploying defensive palings against cavalry."
      },
      {
        id: "man-at-arms-1",
        name: "Vanguard Man-at-Arms",
        type: "Infantry",
        age: 1,
        stats: { attack: 8, armor: 3, speed: 1.12, health: 100 },
        strengths: ["Light Infantry", "Archers"],
        weaknesses: ["Crossbowmen", "Heavy Cavalry"],
        description: "Tough early infantry available in the Dark Age with good damage and armor."
      },
      {
        id: "wynguard-ranger-4",
        name: "Wynguard Ranger",
        type: "Ranged",
        age: 4,
        stats: { attack: 12, armor: 3, speed: 1.12, health: 125 },
        strengths: ["Standard Infantry"],
        weaknesses: ["Siege", "Heavy Cavalry"],
        description: "Elite variant of the Longbowman with significantly higher damage and health."
      },
      {
        id: "wynguard-footman-4",
        name: "Wynguard Footman",
        type: "Infantry",
        age: 4,
        stats: { attack: 20, armor: 6, speed: 1.12, health: 280 },
        strengths: ["Frontline Tanking"],
        weaknesses: ["Crossbowmen", "Handcannoneers"],
        description: "A specialized Man-at-Arms with exceptionally high health and pierce armor."
      }
    ],
    technologies: [
      { id: "tech-armor-clad", name: "Armor Clad", age: 3, building: "Barracks", description: "Grants Men-at-Arms +2 armor." },
      { id: "tech-shattering-projectiles", name: "Shattering Projectiles", age: 4, building: "Siege Workshop", description: "Trebuchets deal AoE damage." }
    ],
    landmarks: [
      { id: "abbey-of-kings", name: "Abbey of Kings", age: 2, type: "Religious", description: "Heals nearby friendly units out of combat (+6 HP/1s). Can produce Kings." },
      { id: "council-hall", name: "Council Hall", age: 2, type: "Military", description: "Archery Range that works 100% faster. Longbowmen are 5% cheaper." },
      { id: "kings-palace", name: "King's Palace", age: 3, type: "Economic", description: "Acts as a fully functional Town Center." },
      { id: "white-tower", name: "The White Tower", age: 3, type: "Defensive", description: "Acts as a Keep that works 75% faster and has all technologies." },
      { id: "berkshire-palace", name: "Berkshire Palace", age: 4, type: "Defensive", description: "Powerful Keep with +50% greater range and incendiary arrows." },
      { id: "wynguard-palace", name: "Wynguard Palace", age: 4, type: "Military", description: "Produces specialized battalions (Rangers, Footmen, etc.)." }
    ]
  },
  {
    id: "french",
    name: "Francesi",
    flag: "/civs/French.png",
    difficulty: "Facile",
    shortDescription: "A cavalry-focused civilization with a strong trading economy and powerful Royal Knights.",
    passiveBonuses: [
      "Villagers and Scouts are produced 10/15/20% faster per Age.",
      "Economic technology upgrades cost 30% less.",
      "Traders can return any resource to Markets."
    ],
    uniqueUnits: [
      {
        id: "royal-knight",
        name: "Royal Knight",
        type: "Cavalry",
        age: 2,
        stats: { attack: 19, armor: 3, speed: 1.62, health: 190 },
        strengths: ["Archers", "Infantry"],
        weaknesses: ["Spearmen", "Crossbowmen"],
        description: "Heavy cavalry unit that heals out of combat."
      },
      {
        id: "arbaletrier",
        name: "Arbalétrier",
        type: "Ranged",
        age: 3,
        stats: { attack: 12, armor: 1, speed: 1.12, health: 80 },
        strengths: ["Heavy Infantry", "Heavy Cavalry"],
        weaknesses: ["Archers", "Light Cavalry"],
        description: "Crossbowman with a deployable Pavise that grants +5 ranged armor."
      },
      {
        id: "royal-cannon",
        name: "Royal Cannon",
        type: "Siege",
        age: 4,
        stats: { attack: 75, armor: 0, speed: 0.75, health: 228 },
        strengths: ["Buildings"],
        weaknesses: ["Melee Units"],
        description: "Improved version of the standard cannon with higher damage."
      }
    ],
    technologies: [
      { id: "tech-chivalry", name: "Chivalry", age: 2, building: "School of Cavalry", description: "Royal Knights heal 1 HP every 1s when out of combat." },
      { id: "tech-enlistment-incentives", name: "Enlistment Incentives", age: 4, building: "Keep", description: "Improves French influence, reducing unit cost around Keeps by 10%." }
    ],
    landmarks: [
      { id: "chamber-of-commerce", name: "Chamber of Commerce", age: 2, type: "Economic", description: "Acts as a Market. All Traders return +30% more resources." },
      { id: "school-of-cavalry", name: "School of Cavalry", age: 2, type: "Military", description: "Acts as a Stable. All Stables produce units 20% faster." },
      { id: "guild-hall", name: "Guild Hall", age: 3, type: "Economic", description: "Stores resources over time; generation speed increases with accumulation." },
      { id: "royal-institute", name: "Royal Institute", age: 3, type: "Technology", description: "Houses unique French technologies at a 20% reduced cost." },
      { id: "college-of-artillery", name: "College of Artillery", age: 4, type: "Military", description: "Provides access to Royal Artillery units with +20% damage." },
      { id: "red-palace", name: "Red Palace", age: 4, type: "Defensive", description: "Acts as a powerful Keep with high-damage arbalest bolts." }
    ]
  },
  {
    id: "goldenhorde",
    name: "Orda d'Oro",
    flag: "/civs/Golden Horde.png",
    difficulty: "Medio",
    shortDescription: "An aggressive variant of the Mongols focusing on early cavalry and economy.",
    passiveBonuses: ["Mobile buildings like the Mongols.", "Increased early economic and military pressure."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "hre",
    name: "Sacro Romano Impero",
    flag: "/civs/Holy Roman Empire.png",
    difficulty: "Medio",
    shortDescription: "An infantry-heavy civilization buffed by religious Prelates.",
    passiveBonuses: ["Prelates can inspire economy and military units.", "Early Men-at-Arms access and powerful relic bonuses."],
    uniqueUnits: [
      {
        id: "prelate",
        name: "Prelate",
        type: "Infantry", // Acts as religious but putting in infantry for grid
        age: 1,
        stats: { attack: 0, armor: 0, speed: 1.12, health: 90 },
        strengths: ["Economic Buff", "Healing"],
        weaknesses: ["Everything"],
        description: "Support unit that inspires villagers to increase gather rates by 40%."
      },
      {
        id: "landsknecht",
        name: "Landsknecht",
        type: "Infantry",
        age: 3,
        stats: { attack: 17, armor: 0, speed: 1.12, health: 85 },
        strengths: ["Massed Units", "Light Infantry"],
        weaknesses: ["Archers", "Knights"],
        description: "Uses a large two-handed sword to deal significant area-of-effect damage."
      }
    ],
    technologies: [],
    landmarks: [
      { id: "aachen-chapel", name: "Aachen Chapel", age: 2, type: "Economic", description: "Inspires units in a large radius if a Prelate is garrisoned." },
      { id: "meinwerk-palace", name: "Meinwerk Palace", age: 2, type: "Technology", description: "Blacksmith where technologies cost -40% and research 40% faster." },
      { id: "burgrave-palace", name: "Burgrave Palace", age: 3, type: "Military", description: "Barracks that produces infantry 400% faster (in batches)." },
      { id: "regnitz-cathedral", name: "Regnitz Cathedral", age: 3, type: "Economic", description: "Relics garrisoned here generate +100% Gold. Acts as a Monastery." },
      { id: "palace-of-swabia", name: "Palace of Swabia", age: 4, type: "Economic", description: "Producs villagers 200% faster and at a 66% lower cost." },
      { id: "elzbach-palace", name: "Elzbach Palace", age: 4, type: "Defensive", description: "Keep with +50% HP. Reduces damage to nearby buildings by 33%." }
    ]
  },
  {
    id: "japanese",
    name: "Giapponesi",
    flag: "/civs/Japanese.png",
    difficulty: "Medio",
    shortDescription: "An infantry and farming-centric civilization utilizing Samurai and Shinobi.",
    passiveBonuses: ["Town Centers can upgrade into Daimyo Manors to increase farm gather rates.", "Forges offer unique melee upgrade paths."],
    uniqueUnits: [
      { id: "samurai", name: "Samurai", type: "Infantry", age: 2, stats: { attack: 10, armor: 3, speed: 1.12, health: 130 }, strengths: ["Infantry"], weaknesses: ["Crossbowmen"], description: "Heavy infantry with Deflective Armor that blocks strikes." },
      { id: "onna-bugeisha", name: "Onna-Bugeisha", type: "Infantry", age: 2, stats: { attack: 8, armor: 0, speed: 1.38, health: 80 }, strengths: ["Light Units"], weaknesses: ["Archers"], description: "Fast light infantry with high attack range." },
      { id: "shinobi", name: "Shinobi", type: "Infantry", age: 2, stats: { attack: 8, armor: 0, speed: 1.25, health: 100 }, strengths: ["Sabotage"], weaknesses: ["Detection"], description: "Stealth unit that can teleport and sabotage buildings." },
      { id: "ozutsu", name: "Ozutsu", type: "Infantry", age: 4, stats: { attack: 40, armor: 0, speed: 1.12, health: 140 }, strengths: ["Buildings", "Siege"], weaknesses: ["Cavalry"], description: "Siege infantry armed with hand cannons." }
    ],
    technologies: [],
    landmarks: [
      { id: "koka-township", name: "Koka Township", age: 2, type: "Military", description: "Produces Shinobi units." },
      { id: "kura-storehouse", name: "Kura Storehouse", age: 2, type: "Economic", description: "Acts as a Resource Drop-off; generates free Wood/Farms." },
      { id: "floating-gate", name: "Floating Gate", age: 3, type: "Religious", description: "Produces Shinto Priests and Yorishiro for building buffs." },
      { id: "temple-equality", name: "Temple of Equality", age: 3, type: "Religious", description: "Produces Buddhist Monks to debuff enemy units." },
      { id: "tanegashima", name: "Tanegashima Gunsmith", age: 4, type: "Military", description: "Produces Ozutsu and other gunpowder units." }
    ]
  },
  {
    id: "jeannedarc",
    name: "Giovanna d'Arco",
    flag: "/civs/Jeanne d'Arc.png",
    difficulty: "Difficile",
    shortDescription: "A hero-led civilization where Jeanne d'Arc levels up and leads her army to victory.",
    passiveBonuses: ["Jeanne d'Arc gains experience from building, combat, and landmarks to unlock powerful abilities.", "Highly aggressive and tempo-based."],
    uniqueUnits: [
      { id: "jeanne-hero", name: "Giovanna d'Arco", type: "Infantry", age: 1, stats: { attack: 10, armor: 2, speed: 1.12, health: 150 }, strengths: ["Versatility"], weaknesses: ["Death"], description: "Hero unit that evolves and gains powerful abilities." },
      { id: "jeannes-rider", name: "Cavaliere di Giovanna", type: "Cavalry", age: 3, stats: { attack: 15, armor: 0, speed: 1.62, health: 155 }, strengths: ["Support"], weaknesses: ["Spearmen"], description: "Agile light cavalry that supports Jeanne." },
      { id: "jeannes-champion", name: "Campione di Giovanna", type: "Infantry", age: 3, stats: { attack: 12, armor: 4, speed: 1.12, health: 175 }, strengths: ["Protective"], weaknesses: ["Crossbowmen"], description: "Heavy infantry elite protector." }
    ],
    technologies: [],
    landmarks: [
      { id: "chamber-commerce-jd", name: "Camera di Commercio", age: 2, type: "Economic", description: "Aumenta la generazione di oro dal commercio del 20%." },
      { id: "school-cavalry-jd", name: "Scuola di Cavalleria", age: 2, type: "Military", description: "Tutte le stalle producono unità il 20% più velocemente." },
      { id: "guild-hall-jd", name: "Sede della Gilda", age: 3, type: "Economic", description: "Accumula risorse nel tempo." },
      { id: "royal-institute-jd", name: "Istituto Reale", age: 3, type: "Technology", description: "Contiene tecnologie uniche francesi a costo ridotto." },
      { id: "college-artillery-jd", name: "Collegio d'Artiglieria", age: 4, type: "Military", description: "Produce unità d'artiglieria con +20% danni." },
      { id: "red-palace-jd", name: "Palazzo Rosso", age: 4, type: "Defensive", description: "Forte mastio con potenti difese di balestrieri." }
    ]
  },
  {
    id: "lancaster",
    name: "Lancaster",
    flag: "/civs/House of Lancaster.png",
    difficulty: "Facile",
    shortDescription: "A variant of the English with powerful longbowmen upgrades and defensive traits.",
    passiveBonuses: ["Enhanced defensive networks.", "Focus on ranged superiority and area denial."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "macedonian",
    name: "Macedoni",
    flag: "/civs/Macedonian Dynasty.png",
    difficulty: "Facile",
    shortDescription: "A variant of the Byzantines featuring robust frontline units and unique mercenaries.",
    passiveBonuses: ["Specialized infantry formations.", "Unique mercenary contracts."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "malians",
    name: "Maliani",
    flag: "/civs/Malians.png",
    difficulty: "Difficile",
    shortDescription: "An economy-driven civilization focused on Gold, Cattle, and stealthy infantry.",
    passiveBonuses: ["Pit Mines automatically generate Gold", "Musofadi Warriors can utilize stealth."],
    uniqueUnits: [
      { id: "donso", name: "Donso", type: "Infantry", age: 1, stats: { attack: 8, armor: 3, speed: 1.12, health: 80 }, strengths: ["Cavalry"], weaknesses: ["Archers"], description: "Anti-cavalry infantry with a ranged spear throw." },
      { id: "javelin-thrower", name: "Giavellottiere", type: "Ranged", age: 2, stats: { attack: 8, armor: 3, speed: 1.12, health: 70 }, strengths: ["Archers"], weaknesses: ["Cavalry"], description: "Ranged unit that counters other ranged units." },
      { id: "musofadi-warrior", name: "Guerriero Musofadi", type: "Infantry", age: 2, stats: { attack: 10, armor: 0, speed: 1.25, health: 95 }, strengths: ["Heavy Units"], weaknesses: ["Archers"], description: "Light infantry capable of entering stealth." },
      { id: "sofa", name: "Sofa", type: "Cavalry", age: 2, stats: { attack: 12, armor: 3, speed: 1.62, health: 160 }, strengths: ["Light Units"], weaknesses: ["Spearmen"], description: "Fast and relatively cheap heavy cavalry." }
    ],
    technologies: [],
    landmarks: [
      { id: "mansa-quarry", name: "Cava di Mansa", age: 2, type: "Economic", description: "Generates Gold or Stone passively (75/min)." },
      { id: "saharan-trade", name: "Rete Commerciale Sahariana", age: 2, type: "Defensive", description: "Toll Outpost that generates Food from trade." },
      { id: "farimba-garrison", name: "Guarnigione di Farimba", age: 3, type: "Military", description: "Trains specialized units in batches for Gold." },
      { id: "fulani-corral", name: "Recinto dei Fulani", age: 3, type: "Economic", description: "Nearby cattle provide constant Food income." },
      { id: "fort-huntress", name: "Forte della Cacciatrice", age: 4, type: "Defensive", description: "Keep with poison arrows and stealth aura." },
      { id: "griot-bara", name: "Griot Bara", age: 4, type: "Technology", description: "Activates powerful civilization-wide festivals." }
    ]
  },
  {
    id: "mongols",
    name: "Mongoli",
    flag: "/civs/Mongols.png",
    difficulty: "Difficile",
    shortDescription: "A nomadic civilization capable of moving their bases, excelling in rapid cavalry strikes.",
    passiveBonuses: [
      "All buildings can be packed up and moved to a new location.",
      "Start with maximum population limit; no need to build houses.",
      "Cavalry produce 50% faster, or can produce double with stone."
    ],
    uniqueUnits: [
      {
        id: "khan",
        name: "Khan",
        type: "Cavalry",
        age: 1,
        stats: { attack: 4, armor: 0, speed: 1.62, health: 140 },
        strengths: ["Support Arrows", "Scouting"],
        weaknesses: ["Melee Units"],
        description: "Cavalry hero that uses Signal Arrows to buff nearby units."
      },
      {
        id: "mangudai",
        name: "Mangudai",
        type: "Ranged",
        age: 2,
        stats: { attack: 5, armor: 0, speed: 1.62, health: 70 },
        strengths: ["Infantry", "Villagers"],
        weaknesses: ["Archers", "Knights"],
        description: "Highly mobile horse archer capable of firing while moving."
      },
      {
        id: "keshik",
        name: "Keshik",
        type: "Cavalry",
        age: 2,
        stats: { attack: 15, armor: 3, speed: 1.62, health: 145 },
        strengths: ["Early Raiding"],
        weaknesses: ["Spearmen"],
        description: "Heavy cavalry that heals when attacking."
      }
    ],
    technologies: [
      { id: "tech-yam-network", name: "Yam Network", age: 2, building: "Outpost", description: "Outposts grant a speed boost to all nearby cavalry and traders." },
      { id: "tech-stone-commerce", name: "Stone Commerce", age: 4, building: "Market", description: "Traders also provide stone alongside gold." }
    ],
    landmarks: [
      { id: "deer-stones", name: "Deer Stones", age: 2, type: "Military", description: "Grants Yam Network speed aura and special archer units." },
      { id: "silver-tree", name: "The Silver Tree", age: 2, type: "Economic", description: "Acts as a Market. Trader production +40% faster and -40% cheaper." },
      { id: "kurultai", name: "Kurultai", age: 3, type: "Military", description: "Heals nearby units and provides +20% damage bonus with Khan." },
      { id: "steppe-redoubt", name: "Steppe Redoubt", age: 3, type: "Economic", description: "Acts as a Ger. Gold income increased by +50%." },
      { id: "khaganate-palace", name: "Khaganate Palace", age: 4, type: "Military", description: "Automatically spawns diverse Mongol armies." },
      { id: "white-stupa", name: "The White Stupa", age: 4, type: "Economic", description: "Generates 240 stone per minute without an Ovoo." }
    ]
  },
  {
    id: "orderofthedragon",
    name: "Ordine del Drago",
    flag: "/civs/Order of the Dragon.png",
    difficulty: "Facile",
    shortDescription: "An elite variant of the Holy Roman Empire, focusing on fewer, but incredibly powerful units.",
    passiveBonuses: ["Units are individually much stronger but cost double the resources and population space."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "ottomans",
    name: "Ottomani",
    flag: "/civs/Ottomans.png",
    difficulty: "Medio",
    shortDescription: "A military powerhouse offering free troop production through Military Schools.",
    passiveBonuses: ["Military Schools produce units slowly for free.", "Gain Vizier Points to unlock powerful civilization-wide abilities."],
    uniqueUnits: [
      { id: "sipahi", name: "Cavalry", type: "Cavalry", age: 2, stats: { attack: 11, armor: 0, speed: 1.62, health: 135 }, strengths: ["Archers"], weaknesses: ["Spearmen"], description: "Light cavalry that can activate Fortitude for more damage." },
      { id: "mehter", name: "Mehter", type: "Cavalry", age: 2, stats: { attack: 0, armor: 1, speed: 1.62, health: 140 }, strengths: ["Buffs"], weaknesses: ["Combat Icons"], description: "War drummer that provides tactical auras to nearby units." },
      { id: "janissary", name: "Janissary", type: "Ranged", age: 3, stats: { attack: 16, armor: 0, speed: 1.12, health: 80 }, strengths: ["Cavalry"], weaknesses: ["Archers"], description: "Gunpowder unit strong vs cavalry; can repair siege." },
      { id: "great-bombard", name: "Great Bombard", type: "Siege", age: 4, stats: { attack: 150, armor: 0, speed: 0.62, health: 400 }, strengths: ["Buildings", "Masses"], weaknesses: ["Melee Cavalry"], description: "The largest and most powerful siege cannon." }
    ],
    technologies: [],
    landmarks: [
      { id: "sultanhani", name: "Sultanhani Trade Network", age: 2, type: "Economic", description: "Garrisons Traders to generate Gold over time." },
      { id: "twin-minaret", name: "Twin Minaret Medrese", age: 2, type: "Economic", description: "Acts as a Mill; spawns infinite Berry Bushes." },
      { id: "istanbul-palace", name: "Istanbul Imperial Palace", age: 3, type: "Technology", description: "Increases Vizier Point generation speed." },
      { id: "mehmed-armory", name: "Mehmed Imperial Armory", age: 3, type: "Military", description: "Automatically produces free Siege units." },
      { id: "sea-gate-castle", name: "Sea Gate Castle", age: 4, type: "Defensive", description: "Strengthens trade and acts as a powerful Keep." }
    ]
  },
  {
    id: "rus",
    name: "Rusiani",
    flag: "/civs/Rus.png",
    difficulty: "Medio",
    shortDescription: "A hunting and forestry civilization relying on Bounties and robust Wooden Fortresses.",
    passiveBonuses: ["Gain Bounty from hunting animals, increasing global gather rates.", "Produce strong early knights and wooden defensive structures."],
    uniqueUnits: [
      {
        id: "rus-knight",
        name: "Knight (Rus)",
        type: "Cavalry",
        age: 2,
        stats: { attack: 19, armor: 3, speed: 1.62, health: 190 },
        strengths: ["Archers", "Standard Units"],
        weaknesses: ["Spearmen", "Crossbowmen"],
        description: "Powerful heavy cavalry available an age earlier (Age II)."
      },
      {
        id: "warrior-monk",
        name: "Warrior Monk",
        type: "Cavalry",
        age: 3,
        stats: { attack: 11, armor: 0, speed: 1.62, health: 190 },
        strengths: ["Combat Buffs", "Relics"],
        weaknesses: ["Spearmen", "Archers"],
        description: "Support unit that buffs nearby combat units with Saint's Blessing."
      },
      {
        id: "streltsy",
        name: "Streltsy",
        type: "Ranged",
        age: 4,
        stats: { attack: 35, armor: 0, speed: 1.12, health: 150 },
        strengths: ["All Ground Units"],
        weaknesses: ["Mangonels", "Horsemen"],
        description: "Gunpowder unit that gets stronger when standing still."
      }
    ],
    technologies: [],
    landmarks: [
      { id: "golden-gate", name: "The Golden Gate", age: 2, type: "Economic", description: "Specialized Market with highly favorable exchange rates." },
      { id: "kremlin", name: "The Kremlin", age: 2, type: "Defensive", description: "Reinforced Wooden Fortress; can call temporary Militia." },
      { id: "high-trade-house", name: "High Trade House", age: 3, type: "Economic", description: "Generates gold from nearby trees and periodically spawns Deer." },
      { id: "abbey-trinity", name: "Abbey of the Trinity", age: 3, type: "Religious", description: "Acts as a Monastery; trains Warrior Monks at lower cost." },
      { id: "high-armory", name: "High Armory", age: 4, type: "Military", description: "Reduces cost of Siege Workshops and provides unique upgrades." },
      { id: "spasskaya-tower", name: "Spasskaya Tower", age: 4, type: "Defensive", description: "High-health Keep with pre-unlocked weapon emplacements." }
    ]
  },
  {
    id: "sengoku",
    name: "Sengoku Daimyo",
    flag: "/civs/Sengoku Daimyo.png",
    difficulty: "Difficile",
    shortDescription: "A variant of the Japanese focusing intensely on Samurai warfare and rapid expansion.",
    passiveBonuses: ["Aggressive early game melee bonuses.", "Enhanced Daimyo mechanics for military production."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "templar",
    name: "Knights Templar",
    flag: "/civs/Knights Templar.png",
    difficulty: "Medio",
    shortDescription: "A variant of the French with a fanatical cavalry focus and unique religious orders.",
    passiveBonuses: ["Powerful Templar Knights with charge bonuses.", "Monasteries provide unique military upgrades."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "tughlaq",
    name: "Dinastia di Tughlaq",
    flag: "/civs/Tughlaq Dynasty.png",
    difficulty: "Medio",
    shortDescription: "A variant of the Delhi Sultanate heavily utilizing elephants and defensive structures.",
    passiveBonuses: ["Earlier access to War Elephants.", "Stronger defensive network integration."],
    uniqueUnits: [],
    technologies: [],
    landmarks: []
  },
  {
    id: "zhuxi",
    name: "Eredità di Zhu Xi",
    flag: "/civs/Zhu Xi's Legacy.png",
    difficulty: "Difficile",
    shortDescription: "A fast-paced Imperial variant of the Chinese emphasizing early Dynasties.",
    passiveBonuses: ["Cheaper officials and streamlined access to powerful Shaolin Monks and Chu Ko Nu.", "Earlier access to robust technologies."],
    uniqueUnits: [
      { id: "zhuge-nu-zhuxi", name: "Zhuge Nu", type: "Ranged", age: 2, stats: { attack: 12, armor: 0, speed: 1.12, health: 70 }, strengths: ["Light Infantry"], weaknesses: ["Cavalry"], description: "Rapid-fire crossbowman." },
      { id: "shaolin-monk", name: "Monaco Shaolin", type: "Infantry", age: 3, stats: { attack: 15, armor: 2, speed: 1.25, health: 190 }, strengths: ["All Units"], weaknesses: ["Massed Ranged"], description: "Powerful monk that can reflect ranged attacks." },
      { id: "yuan-raider", name: "Predone Yuan", type: "Cavalry", age: 4, stats: { attack: 15, armor: 4, speed: 2.00, health: 200 }, strengths: ["Raiding"], weaknesses: ["Spearmen"], description: "Extremely fast light cavalry." }
    ],
    technologies: [],
    landmarks: [
      { id: "jiangnan-tower", name: "Torre Jiangnan", age: 2, type: "Military", description: "Acts as tax drop-off; grants free units on building completion." },
      { id: "meditation-gardens", name: "Giardini della Meditazione", age: 2, type: "Economic", description: "Generates resources based on nearby deposits." },
      { id: "mount-lu", name: "Accademia del Monte Lu", age: 3, type: "Economic", description: "Improves tax collection and food gathering." },
      { id: "shaolin-monastery", name: "Monastero Shaolin", age: 3, type: "Religious", description: "Produces powerful Shaolin Monks." },
      { id: "temple-sun", name: "Tempio del Sole", age: 4, type: "Technology", description: "Grants powerful global togglable buffs." },
      { id: "zhuxi-library", name: "Biblioteca di Zhu Xi", age: 4, type: "Technology", description: "Access to powerful unique upgrades." }
    ]
  }
];
