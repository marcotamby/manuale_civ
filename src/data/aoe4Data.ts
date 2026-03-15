export type UnitType = 'Infantry' | 'Cavalry' | 'Siege' | 'Ranged' | 'Religious';
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
  imageId?: string;
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
  source?: string;
  author_nickname?: string;
  author_rank?: string;
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
  strengths?: string[];
  weaknesses?: string[];
}

export const unitsList: Unit[] = [
  {
    id: "archer",
    name: "Archer",
    type: "Ranged",
    age: 2,
    stats: { attack: 5, armor: 0, speed: 1.25, health: 70 },
    strengths: ["Spearmen", "Crossbowmen"],
    weaknesses: ["Cavalry", "Man-at-Arms"],
    description: "Cheap ranged infantry with good damage vs. unarmored targets.\n+ High rate of fire\n- Weak against high ranged armor targets\n- Countered by Horsemen",
    excludedCivs: ['english', 'japanese', 'lancaster', 'macedonian', 'orderofthedragon', 'sengoku', 'zhuxi']
  },
  {
    id: "crossbowman",
    name: "Crossbowman",
    type: "Ranged",
    age: 3,
    stats: { attack: 11, armor: 0, speed: 1.13, health: 80 },
    strengths: ["Heavy Infantry", "Heavy Cavalry"],
    weaknesses: ["Light Cavalry", "Archers"],
    description: "High damage ranged unit best against heavy targets.\n+ Anti-heavy specialist\n- Low health\n- Countered by Horsemen",
    excludedCivs: ['french', 'japanese', 'jeannedarc', 'malians', 'orderofthedragon', 'sengoku']
  },
  {
    id: "handcannoneer",
    name: "Handcannoneer",
    type: "Ranged",
    age: 4,
    stats: { attack: 38, armor: 0, speed: 1.13, health: 130 },
    strengths: ["Infantry", "Cavalry"],
    weaknesses: ["Mangonels", "Archers"],
    description: "Powerful all-purpose ranged infantry.\n+ High damage\n- High cost\n- Slow movement speed\n- Countered by Horsemen",
    excludedCivs: ['japanese', 'malians', 'orderofthedragon', 'ottomans', 'rus', 'sengoku', 'templar', 'zhuxi']
  },
  {
    id: "mangonel",
    name: "Mangonel",
    type: "Siege",
    age: 3,
    stats: { attack: 10, armor: 0, speed: 0.75, health: 130 },
    strengths: ["Ranged Infantry", "Light Infantry"],
    weaknesses: ["Springalds", "Cavalry"],
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
    weaknesses: ["Archers", "Heavy Infantry"],
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
    strengths: ["Light Infantry", "Archers"],
    weaknesses: ["Crossbowmen", "Heavy Cavalry"],
    description: "Tough infantry with good damage.\n+ High armor\n- Slow movement\n- Countered by Knights, Lancers, and Crossbowmen",
    excludedCivs: ['abbasid', 'ayyubids', 'byzantines', 'chinese', 'japanese', 'lancaster', 'macedonian', 'malians', 'orderofthedragon', 'sengoku', 'zhuxi']
  },
  {
    id: "knight",
    name: "Knight",
    type: "Cavalry",
    age: 3,
    stats: { attack: 24, armor: 4, speed: 1.63, health: 230 },
    strengths: ["Archers", "Swordsmen"],
    weaknesses: ["Spearmen", "Camels"],
    description: "Expensive cavalry with high damage and melee armor. Effective against melee units.\n+ Heavy armor\n+ Strong in melee combat\n- Countered by Spearmen and Crossbowmen",
    excludedCivs: ['abbasid', 'ayyubids', 'delhi', 'byzantines', 'chinese', 'french', 'goldenhorde', 'japanese', 'jeannedarc', 'macedonian', 'malians', 'mongols', 'orderofthedragon', 'ottomans', 'sengoku', 'templar', 'tughlaq', 'zhuxi']
  }
];

// Civilizations list
export const civilizationsData: Civilization[] = [
  {
    id: "abbasid",
    name: "Abbasidi",
    flag: "/civs/Abbasid Dynasty.webp",
    difficulty: "Medio",
    shortDescription: "A flexible and adaptable civilization focused on the House of Wisdom.",
    passiveBonuses: ["Constructing buildings near the House of Wisdom increases the Golden Age tier.", "Berry bushes gather 30% faster but cannot hunt Boars."],
    uniqueUnits: [
      {
        id: "camel-archer",
        imageId: "camel-archer-2",
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
        imageId: "ghulam-3",
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
        imageId: "camel-rider-3",
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
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
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
    flag: "/civs/Ayyubids.webp",
    difficulty: "Medio",
    shortDescription: "A versatile civilization leveraging Desert Raiders and House of Wisdom advancements.",
    passiveBonuses: ["House of Wisdom wings grant unique, immediate bonuses when advancing."],
    uniqueUnits: [
      { id: "desert-raider", imageId: "desert-raider-2", name: "Desert Raider", type: "Cavalry", age: 2, stats: { attack: 10, armor: 0, speed: 1.62, health: 120 }, strengths: ["Light Units"], weaknesses: ["Knights"], description: "Versatile raider that can switch between melee and ranged." },
      { id: "camel-lancer", imageId: "camel-lancer-3", name: "Camel Lancer", type: "Cavalry", age: 3, stats: { attack: 22, armor: 3, speed: 1.62, health: 210 }, strengths: ["Cavalry"], weaknesses: ["Spearmen"], description: "Strong heavy camel cavalry." },
      { id: "ghulam-ayyubid", imageId: "ghulam-3", name: "Ghulam", type: "Infantry", age: 3, stats: { attack: 12, armor: 4, speed: 1.12, health: 195 }, strengths: ["Light Infantry"], weaknesses: ["Knights"], description: "Tough infantry with a double-strike attack." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
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
    flag: "/civs/Delhi Sultanate.webp",
    difficulty: "Difficile",
    shortDescription: "A research-focused civilization with free technologies and War Elephants.",
    passiveBonuses: ["All technologies are free but take longer to research.", "Scholars speed up research times significantly."],
    uniqueUnits: [
      { id: "scholar", imageId: "scholar-1", name: "Scholar", type: "Religious", age: 1, stats: { attack: 0, armor: 0, speed: 1.12, health: 90 }, strengths: ["Research Boost"], weaknesses: ["Everything"], description: "Speeds up research and heals units." },
      { id: "ghazi-raider", imageId: "ghazi-raider-2", name: "Ghazi Raider", type: "Cavalry", age: 2, stats: { attack: 13, armor: 0, speed: 1.62, health: 125 }, strengths: ["Heavy Cavalry"], weaknesses: ["Spearmen"], description: "Strong light cavalry effective vs heavy armor." },
      { id: "war-elephant", imageId: "war-elephant-3", name: "War Elephant", type: "Cavalry", age: 3, stats: { attack: 30, armor: 4, speed: 1.00, health: 700 }, strengths: ["Buildings", "Infantry"], weaknesses: ["Spearmen", "Crossbowmen"], description: "Massive high-health melee unit." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "dome-faith", imageId: "dome-of-the-faith-1", name: "Dome of the Faith", age: 2, type: "Religious", description: "Produces Scholars at -50% cost." },
      { id: "tower-victory", imageId: "tower-of-victory-1", name: "Tower of Victory", age: 2, type: "Military", description: "Infantry near tower gain +15% attack speed permanently." },
      { id: "compound-defender", imageId: "compound-of-the-defender-2", name: "Compound of the Defender", age: 3, type: "Defensive", description: "Infantry can build stone walls; reduces stone cost." },
      { id: "house-learning", imageId: "house-of-learning-2", name: "House of Learning", age: 3, type: "Technology", description: "Unlocks diverse unique technologies." },
      { id: "palace-sultan", imageId: "palace-of-the-sultan-3", name: "Palace of the Sultan", age: 4, type: "Religious", description: "Periodically produces free Tower Elephants." },
      { id: "hisar-academy", imageId: "hisar-academy-3", name: "Hisar Academy", age: 4, type: "Technology", description: "Functions as a Madrasa and generates Food per minute based on the total number of technologies researched." }
    ]
  },
  {
    id: "byzantines",
    name: "Bizantini",
    flag: "/civs/Byzantines.webp",
    difficulty: "Difficile",
    shortDescription: "A complex defensive civilization utilizing an aqueduct network and mercenaries.",
    passiveBonuses: ["Aqueducts increase production speed and gather rates.", "Can hire foreign mercenaries using Olive Oil."],
    uniqueUnits: [
      { id: "limitanei", imageId: "limitanei-1", name: "Limitanei", type: "Infantry", age: 1, stats: { attack: 9, armor: 0, speed: 1.12, health: 90 }, strengths: ["Cavalry"], weaknesses: ["Archers"], description: "Spearman replacement with Shield Wall ability." },
      { id: "varangian-guard", imageId: "varangian-guard-3", name: "Varangian Guard", type: "Infantry", age: 3, stats: { attack: 12, armor: 4, speed: 1.12, health: 160 }, strengths: ["Heavy Units"], weaknesses: ["Crossbowmen"], description: "Elite infantry that can use Berserk mode." },
      { id: "cataphract", imageId: "cataphract-3", name: "Cataphract", type: "Cavalry", age: 3, stats: { attack: 24, armor: 4, speed: 1.38, health: 280 }, strengths: ["All Ground Units"], weaknesses: ["Spearmen"], description: "Super heavy cavalry with a Trample charge." },
      { id: "cheirosiphon", imageId: "cheirosiphon-3", name: "Cheirosiphon", type: "Siege", age: 3, stats: { attack: 0, armor: 0, speed: 0.88, health: 220 }, strengths: ["Buildings"], weaknesses: ["Melee"], description: "Greek Fire ram that deals area fire damage." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "grand-winery", name: "Grand Winery", age: 2, type: "Economic", description: "+60% Olive Oil from nearby farms; acts as a Monastery." },
      { id: "imperial-hippodrome", name: "Imperial Hippodrome", age: 2, type: "Military", description: "Unlocks Triumph ability for cavalry speed/heal." },
      { id: "cistern-first-hill", imageId: "cistern-of-the-first-hill-2", name: "Cistern of the First Hill", age: 3, type: "Defensive", description: "Acts as a large Cistern; provides healing flasks." },
      { id: "golden-horn-tower", name: "Golden Horn Tower", age: 3, type: "Military", description: "Periodically spawns free Mercenary units." },
      { id: "foreign-engineering", imageId: "foreign-engineering-company-3", name: "Foreign Engineering Company", age: 4, type: "Military", description: "Produces unique mercenary siege units." },
      { id: "palatine-school", name: "Palatine School", age: 4, type: "Technology", description: "Acts as a University; produces free elite mercenary units when researching technologies." }
    ]
  },
  {
    id: "chinese",
    name: "Cinesi",
    flag: "/civs/Chinese.webp",
    difficulty: "Difficile",
    shortDescription: "Civiltà flessibile che si evolve attraverso le Grandi Dinastie. Costruisce velocemente, tassa le risorse e padroneggia la polvere da sparo.",
    passiveBonuses: [
      "Inizia nella Dinastia Tang: +30% raggio visivo degli Esploratori e accesso al Villaggio.",
      "Unità addestrate, tecnologie ricercate e risorse restituite generano Tasse (Oro) raccoglibili dagli Ufficiali Imperiali.",
      "Costruisce entrambi i Landmark di un'Età per sbloccare una Dinastia con bonus unici (Song, Yuan, Ming).",
      "I Villici costruiscono difese +50% più veloci e tutti gli altri edifici +100% più velocemente.",
      "La tecnologia Chimica è gratuita in Età I: difese usano Feritoie a Cannone invece di quelle standard.",
      "I Cantieri Navali lavorano il +10% più velocemente."
    ],
    uniqueUnits: [
      {
        id: "imperial-official",
        imageId: "imperial-official-1",
        name: "Ufficiale Imperiale",
        type: "Infantry",
        age: 1,
        stats: { attack: 0, armor: 0, speed: 1.12, health: 75 },
        strengths: ["Supervisione Edifici", "Raccolta Tasse"],
        weaknesses: ["Tutto"],
        description: "Raccoglie Oro (Tasse) e usa 'Supervisiona' per aumentare del +150% la produzione degli edifici militari, o il +20% delle risorse dei Villici."
      },
      {
        id: "zhuge-nu",
        imageId: "zhuge-nu-2",
        name: "Zhuge Nu",
        type: "Ranged",
        age: 2,
        stats: { attack: 12, armor: 0, speed: 1.12, health: 70 },
        strengths: ["Fanteria Leggera"],
        weaknesses: ["Cavalieri", "Cavalleggeri"],
        description: "Balestriere a fuoco rapido che spara 3 dardi per attacco. Sblocato con la Dinastia Song."
      },
      {
        id: "palace-guard",
        imageId: "palace-guard-3",
        name: "Guardia del Palazzo",
        type: "Infantry",
        age: 3,
        stats: { attack: 12, armor: 3, speed: 1.25, health: 155 },
        strengths: ["Fanteria Leggera", "Arcieri"],
        weaknesses: ["Cavalieri", "Balestrieri"],
        description: "Rimpiazza l'Uomo d'Arme. Stessa forza ma con velocità superiore e meno armatura."
      },
      {
        id: "nest-of-bees",
        imageId: "nest-of-bees-3",
        name: "Nido delle Api",
        type: "Siege",
        age: 3,
        stats: { attack: 8, armor: 0, speed: 0.75, health: 130 },
        strengths: ["Fanteria Ammassata", "Unità Leggere"],
        weaknesses: ["Cavalieri", "Springalds"],
        description: "Rimpiazza il Mangonel. Lancia una raffica di razzi che causano danni ad area. Letale contro unità raggruppate."
      },
      {
        id: "fire-lancer",
        imageId: "fire-lancer-3",
        name: "Lanciere di Fuoco",
        type: "Cavalry",
        age: 3,
        stats: { attack: 20, armor: 0, speed: 1.62, health: 130 },
        strengths: ["Macchine da Assedio", "Edifici"],
        weaknesses: ["Lancieri", "Balestrieri"],
        description: "Cavalleria leggera con attacco esplosivo in carica, ottima contro macchinari d'assedio ed edifici. Sblocato con la Dinastia Yuan."
      },
      {
        id: "grenadier",
        imageId: "grenadier-4",
        name: "Granatiere",
        type: "Ranged",
        age: 4,
        stats: { attack: 25, armor: 0, speed: 1.12, health: 100 },
        strengths: ["Unità Raggruppate", "Fanteria Pesante"],
        weaknesses: ["Cavalleria", "Arcieri"],
        description: "Fanteria a polvere da sparo che lancia granate con danno ad area. Sblocato con la Dinastia Ming."
      }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "imperial-academy", name: "Imperial Academy", age: 2, type: "Economic", description: "Genera Oro dalle Tasse al +100% per gli edifici vicini." },
      { id: "barbican-of-the-sun", name: "Barbican of the Sun", age: 2, type: "Defensive", description: "Fortezza con potente cannone a lungo raggio." },
      { id: "astronomical-clocktower", name: "Astronomical Clocktower", age: 3, type: "Military", description: "Produce macchine d'assedio con +50% HP. Include Springald, Trebuchet, Bombarda e Nido delle Api esclusive." },
      { id: "imperial-palace", name: "Imperial Palace", age: 3, type: "Economic", description: "Ampio raggio visivo. Con 'Spie Imperiali' rivela la posizione dei Villici nemici." },
      { id: "great-wall-gatehouse", name: "Great Wall Gatehouse", age: 4, type: "Defensive", description: "Sblocca la Grande Muraglia. Aumenta la salute delle Mura di Pietra e Porte del +100%." },
      { id: "spirit-way", name: "Spirit Way", age: 4, type: "Military", description: "Riduce il costo delle unità della Dinastia del -30% nelle vicinanze." }
    ]
  },
  {
    id: "english",
    name: "Inglesi",
    flag: "/civs/English.webp",
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
        imageId: "king-2",
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
        imageId: "longbowman-2",
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
        imageId: "man-at-arms-1",
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
        imageId: "longbowman-4",
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
        imageId: "man-at-arms-4",
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
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "abbey-of-kings", name: "Abbey of Kings", age: 2, type: "Religious", description: "Heals nearby friendly units out of combat (+6 HP/1s). Can produce Kings." },
      { id: "council-hall", name: "Council Hall", age: 2, type: "Military", description: "Archery Range that works 100% faster. Longbowmen are 5% cheaper." },
      { id: "kings-palace", name: "King's Palace", age: 3, type: "Economic", description: "Acts as a fully functional Town Center." },
      { id: "white-tower", imageId: "the-white-tower-2", name: "The White Tower", age: 3, type: "Defensive", description: "Acts as a Keep that works 75% faster and has all technologies." },
      { id: "berkshire-palace", name: "Berkshire Palace", age: 4, type: "Defensive", description: "Powerful Keep with +50% greater range and incendiary arrows." },
      { id: "wynguard-palace", name: "Wynguard Palace", age: 4, type: "Military", description: "Produces specialized battalions (Rangers, Footmen, etc.)." }
    ]
  },
  {
    id: "french",
    name: "Francesi",
    flag: "/civs/French.webp",
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
        imageId: "knight-2",
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
        imageId: "arbaletrier-3",
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
        imageId: "cannon-4",
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
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
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
    flag: "/civs/Golden Horde.webp",
    difficulty: "Medio",
    shortDescription: "An aggressive variant of the Mongols focusing on early cavalry and economy.",
    passiveBonuses: ["Mobile buildings like the Mongols.", "Increased early economic and military pressure."],
    uniqueUnits: [
      {
        id: "kharash",
        name: "Kharash",
        type: "Infantry",
        age: 1,
        stats: { attack: 6, armor: 0, speed: 1.13, health: 50 },
        strengths: ["Supporto", "Costo"],
        weaknesses: ["Tutte le unità"],
        description: "Fanteria da mischia a basso costo che aumenta passivamente l'armatura delle unità vicine."
      },
      {
        id: "batu-khan",
        name: "Batu Khan",
        type: "Cavalry",
        age: 1,
        stats: { attack: 10, armor: 3, speed: 1.63, health: 190 },
        strengths: ["Supporto", "Manovre"],
        weaknesses: ["Lancieri"],
        description: "Unità eroe che potenzia l'esercito con manovre tattiche uniche."
      },
      {
        id: "torguud",
        name: "Torguud",
        type: "Cavalry",
        age: 1,
        stats: { attack: 10, armor: 3, speed: 1.63, health: 220 },
        strengths: ["Bodyguard", "Alta Salute"],
        weaknesses: ["Lancieri", "Balestrieri"],
        description: "Cavalleria pesante che protegge il Khan deviando i danni su di sé."
      },
      {
        id: "keshik",
        name: "Keshik",
        type: "Cavalry",
        age: 2,
        stats: { attack: 15, armor: 3, speed: 1.63, health: 150 },
        strengths: ["Corpo a corpo", "Sostenibilità"],
        weaknesses: ["Lancieri", "Balestrieri"],
        description: "Cavalleria pesante che si cura attaccando. Sostituisce il Cavaliere."
      },
      {
        id: "kipchak-archer",
        name: "Kipchak Archer",
        type: "Ranged",
        age: 2,
        stats: { attack: 10, armor: 0, speed: 1.63, health: 105 },
        strengths: ["Mobilità", "Hit-and-Run"],
        weaknesses: ["Arcieri", "Cavalleggeri"],
        description: "Arciere a cavallo capace di scoccare frecce in movimento."
      },
      {
        id: "rus-tribute",
        name: "Rus Tribute",
        type: "Infantry",
        age: 3,
        stats: { attack: 12, armor: 3, speed: 1.13, health: 200 },
        strengths: ["Anti-Cavalleria", "Costo"],
        weaknesses: ["Unità a distanza"],
        description: "Fanteria pesante evocata gratuitamente alla Tenda d'Oro con bonus vs cavalleria."
      },
      {
        id: "traction-trebuchet",
        name: "Traction Trebuchet",
        type: "Siege",
        age: 3,
        stats: { attack: 40, armor: 0, speed: 0.88, health: 125 },
        strengths: ["Edifici", "Mobilità"],
        weaknesses: ["Unità da mischia"],
        description: "Trabucco ad alta mobilità per schieramenti rapidi e distruzione di edifici."
      },
      {
        id: "shaman",
        name: "Shaman",
        type: "Religious",
        age: 3,
        stats: { attack: 0, armor: 0, speed: 1.13, health: 130 },
        strengths: ["Cura", "Reliquie"],
        weaknesses: ["Tutte le unità nemiche"],
        description: "Unità religiosa capace di curare e utilizzare le manovre del Khan."
      }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center-1", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "town-center-2", imageId: "town-center-1", name: "Centro Città", age: 2, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "town-center-3", imageId: "town-center-1", name: "Centro Città", age: 3, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "town-center-4", imageId: "town-center-1", name: "Centro Città", age: 4, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "golden-tent", imageId: "golden-tent-1", name: "Tenda d'Oro", age: 2, type: "Military", description: "L'edificio centrale per il reclutamento del Khan e il comando dell'esercito. Consente di avanzare d'età e ricercare potenti editti." },
      { id: "golden-tent-3", imageId: "golden-tent-1", name: "Tenda d'Oro (Età III)", age: 3, type: "Military", description: "Potenziamento della Tenda d'Oro per l'Età dei Castelli." },
      { id: "golden-tent-4", imageId: "golden-tent-1", name: "Tenda d'Oro (Età IV)", age: 4, type: "Military", description: "Massimo potenziamento della Tenda d'Oro per l'Età Imperiale." }
    ]
  },
  {
    id: "hre",
    name: "Sacro Romano Impero",
    flag: "/civs/Holy Roman Empire.webp",
    difficulty: "Medio",
    shortDescription: "An infantry-heavy civilization buffed by religious Prelates.",
    passiveBonuses: ["Prelates can inspire economy and military units.", "Early Men-at-Arms access and powerful relic bonuses."],
    uniqueUnits: [
      {
        id: "prelate",
        imageId: "prelate-1",
        name: "Prelate",
        type: "Religious",
        age: 1,
        stats: { attack: 0, armor: 0, speed: 1.12, health: 90 },
        strengths: ["Economic Buff", "Healing"],
        weaknesses: ["Everything"],
        description: "Support unit that inspires villagers to increase gather rates by 40."
      },
      {
        id: "landsknecht",
        imageId: "landsknecht-3",
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
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
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
    flag: "/civs/Japanese.webp",
    difficulty: "Medio",
    shortDescription: "An infantry and farming-centric civilization utilizing Samurai and Shinobi.",
    passiveBonuses: ["Town Centers can upgrade into Daimyo Manors to increase farm gather rates.", "Forges offer unique melee upgrade paths."],
    uniqueUnits: [
      { id: "samurai", imageId: "samurai-2", name: "Samurai", type: "Infantry", age: 2, stats: { attack: 10, armor: 3, speed: 1.12, health: 130 }, strengths: ["Infantry"], weaknesses: ["Crossbowmen"], description: "Heavy infantry with Deflective Armor that blocks strikes." },
      { id: "onna-bugeisha", imageId: "onna-bugeisha-2", name: "Onna-Bugeisha", type: "Infantry", age: 2, stats: { attack: 8, armor: 0, speed: 1.38, health: 80 }, strengths: ["Light Units"], weaknesses: ["Archers"], description: "Fast light infantry with high attack range." },
      { id: "shinobi", imageId: "shinobi-2", name: "Shinobi", type: "Infantry", age: 2, stats: { attack: 8, armor: 0, speed: 1.25, health: 100 }, strengths: ["Sabotage"], weaknesses: ["Detection"], description: "Stealth unit that can teleport and sabotage buildings." },
      { id: "ozutsu", imageId: "ozutsu-4", name: "Ozutsu", type: "Infantry", age: 4, stats: { attack: 40, armor: 0, speed: 1.12, health: 140 }, strengths: ["Buildings", "Siege"], weaknesses: ["Cavalry"], description: "Siege infantry armed with hand cannons." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "koka-township", name: "Koka Township", age: 2, type: "Military", description: "Produces Shinobi units." },
      { id: "kura-storehouse", name: "Kura Storehouse", age: 2, type: "Economic", description: "Acts as a Resource Drop-off; generates free Wood/Farms." },
      { id: "floating-gate", name: "Floating Gate", age: 3, type: "Religious", description: "Produces Shinto Priests and Yorishiro for building buffs." },
      { id: "temple-equality", imageId: "temple-of-equality-2", name: "Temple of Equality", age: 3, type: "Religious", description: "Produces Buddhist Monks to debuff enemy units." },
      { id: "tanegashima", imageId: "tanegashima-gunsmith-3", name: "Tanegashima Gunsmith", age: 4, type: "Military", description: "Produces Ozutsu and other gunpowder units." },
      { id: "castle-of-the-crow", imageId: "castle-of-the-crow-3", name: "Castle of the Crow", age: 4, type: "Defensive", description: "Acts as a powerful defensive structure that periodically spawns Treasure Caravans from neutral Trading Posts, providing large amounts of Food, Wood, Gold, and Stone." }
    ]
  },
  {
    id: "jeannedarc",
    name: "Giovanna d'Arco",
    flag: "/civs/Jeanne d'Arc.webp",
    difficulty: "Difficile",
    shortDescription: "A hero-led civilization where Jeanne d'Arc levels up and leads her army to victory.",
    passiveBonuses: ["Jeanne d'Arc gains experience from building, combat, and landmarks to unlock powerful abilities.", "Highly aggressive and tempo-based."],
    uniqueUnits: [
      { id: "jeanne-hero", imageId: "jeanne-hero-1", name: "Giovanna d'Arco", type: "Infantry", age: 1, stats: { attack: 10, armor: 2, speed: 1.12, health: 150 }, strengths: ["Versatility"], weaknesses: ["Death"], description: "Hero unit that evolves and gains powerful abilities." },
      { id: "jeannes-rider", imageId: "jeannes-rider-3", name: "Cavaliere di Giovanna", type: "Cavalry", age: 3, stats: { attack: 15, armor: 0, speed: 1.62, health: 155 }, strengths: ["Support"], weaknesses: ["Spearmen"], description: "Agile light cavalry that supports Jeanne." },
      { id: "jeannes-champion", imageId: "jeannes-champion-3", name: "Campione di Giovanna", type: "Infantry", age: 3, stats: { attack: 12, armor: 4, speed: 1.12, health: 175 }, strengths: ["Protective"], weaknesses: ["Crossbowmen"], description: "Heavy infantry elite protector." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "chamber-commerce-jd", imageId: "chamber-of-commerce", name: "Chamber of Commerce", age: 2, type: "Economic", description: "Acts as a Market. All Traders return +30% more resources." },
      { id: "school-cavalry-jd", imageId: "school-of-cavalry", name: "School of Cavalry", age: 2, type: "Military", description: "Acts as a Stable. All Stables produce units 20% faster." },
      { id: "guild-hall-jd", imageId: "guild-hall", name: "Guild Hall", age: 3, type: "Economic", description: "Stores resources over time; generation speed increases with accumulation." },
      { id: "royal-institute-jd", imageId: "royal-institute", name: "Royal Institute", age: 3, type: "Technology", description: "Houses unique French technologies at a 20% reduced cost." },
      { id: "college-artillery-jd", imageId: "college-of-artillery", name: "College of Artillery", age: 4, type: "Military", description: "Provides access to Royal Artillery units with +20% damage." },
      { id: "red-palace-jd", imageId: "red-palace", name: "Red Palace", age: 4, type: "Defensive", description: "Acts as a powerful Keep with high-damage arbalest bolts." }
    ]
  },
  {
    id: "lancaster",
    name: "Lancaster",
    flag: "/civs/House of Lancaster.webp",
    difficulty: "Facile",
    shortDescription: "A variant of the English with powerful longbowmen upgrades and defensive traits.",
    passiveBonuses: ["Enhanced defensive networks.", "Focus on ranged superiority and area denial."],
    uniqueUnits: [],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "abbey-of-kings-lan", imageId: "abbey-of-kings-1", name: "Abbey of Kings", age: 2, type: "Religious", description: "Heals nearby friendly units out of combat (+6 HP/1s). Can produce Kings." },
      { id: "lancaster-castle", imageId: "white-tower-2", name: "Lancaster Castle", age: 2, type: "Defensive", description: "Acts as a Keep and Archery Range/Stable." },
      { id: "white-tower-lan", imageId: "the-white-tower-2", name: "The White Tower", age: 3, type: "Defensive", description: "Acts as a Keep that works 75% faster and has all technologies." },
      { id: "kings-college", imageId: "kings-college-2", name: "King's College", age: 3, type: "Technology", description: "Acts as a University and improves research speed." },
      { id: "wynguard-palace-lan", imageId: "wynguard-palace-3", name: "Wynguard Palace", age: 4, type: "Military", description: "Produces specialized battalions (Rangers, Footmen, etc.)." },
      { id: "berkshire-palace-lan", imageId: "berkshire-palace-3", name: "Berkshire Palace", age: 4, type: "Defensive", description: "Powerful Keep with +50% greater range and incendiary arrows." }
    ]
  },
  {
    id: "macedonian",
    name: "Macedoni",
    flag: "/civs/Macedonian Dynasty.webp",
    difficulty: "Facile",
    shortDescription: "A variant of the Byzantines featuring robust frontline units and unique mercenaries.",
    passiveBonuses: ["Specialized infantry formations.", "Unique mercenary contracts."],
    uniqueUnits: [],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "grand-winery-mac", imageId: "grand-winery-1", name: "Grand Winery", age: 2, type: "Economic", description: "+60% Olive Oil from nearby farms; acts as a Monastery." },
      { id: "imperial-hippodrome-mac", imageId: "imperial-hippodrome-1", name: "Imperial Hippodrome", age: 2, type: "Military", description: "Unlocks Triumph ability for cavalry speed/heal." },
      { id: "cistern-first-hill-mac", imageId: "cistern-of-the-first-hill-2", name: "Cistern of the First Hill", age: 3, type: "Defensive", description: "Acts as a large Cistern; provides healing flasks." },
      { id: "golden-horn-tower-mac", imageId: "golden-horn-tower-2", name: "Golden Horn Tower", age: 3, type: "Military", description: "Periodically spawns free Mercenary units." },
      { id: "foreign-engineering-mac", imageId: "foreign-engineering-company-3", name: "Foreign Engineering Company", age: 4, type: "Military", description: "Produces unique mercenary siege units." },
      { id: "palatine-school-mac", imageId: "palatine-school-3", name: "Palatine School", age: 4, type: "Technology", description: "Acts as a University; produces free elite mercenary units when researching technologies." }
    ]
  },
  {
    id: "malians",
    name: "Maliani",
    flag: "/civs/Malians.webp",
    difficulty: "Difficile",
    shortDescription: "An economy-driven civilization focused on Gold, Cattle, and stealthy infantry.",
    passiveBonuses: ["Pit Mines automatically generate Gold", "Musofadi Warriors can utilize stealth."],
    uniqueUnits: [
      { id: "donso", imageId: "donso-1", name: "Donso", type: "Infantry", age: 1, stats: { attack: 8, armor: 3, speed: 1.12, health: 80 }, strengths: ["Cavalry"], weaknesses: ["Archers"], description: "Anti-cavalry infantry with a ranged spear throw." },
      { id: "javelin-thrower", imageId: "javelin-thrower-2", name: "Giavellottiere", type: "Ranged", age: 2, stats: { attack: 8, armor: 3, speed: 1.12, health: 70 }, strengths: ["Archers"], weaknesses: ["Cavalry"], description: "Ranged unit that counters other ranged units." },
      { id: "musofadi-warrior", imageId: "musofadi-warrior-2", name: "Guerriero Musofadi", type: "Infantry", age: 2, stats: { attack: 10, armor: 0, speed: 1.25, health: 95 }, strengths: ["Heavy Units"], weaknesses: ["Archers"], description: "Light infantry capable of entering stealth." },
      { id: "sofa", imageId: "sofa-2", name: "Sofa", type: "Cavalry", age: 2, stats: { attack: 12, armor: 3, speed: 1.62, health: 160 }, strengths: ["Light Units"], weaknesses: ["Spearmen"], description: "Fast and relatively cheap heavy cavalry." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "mansa-quarry", name: "Cava di Mansa", age: 2, type: "Economic", description: "Generates Gold or Stone passively (75/min)." },
      { id: "saharan-trade", imageId: "saharan-trade-network-1", name: "Rete Commerciale Sahariana", age: 2, type: "Defensive", description: "Toll Outpost that generates Food from trade." },
      { id: "farimba-garrison", name: "Guarnigione di Farimba", age: 3, type: "Military", description: "Trains specialized units in batches for Gold." },
      { id: "fulani-corral", imageId: "grand-fulani-corral-2", name: "Recinto dei Fulani", age: 3, type: "Economic", description: "Nearby cattle provide constant Food income." },
      { id: "fort-huntress", imageId: "fort-of-the-huntress-3", name: "Forte della Cacciatrice", age: 4, type: "Defensive", description: "Keep with poison arrows and stealth aura." },
      { id: "griot-bara", name: "Griot Bara", age: 4, type: "Technology", description: "Activates powerful civilization-wide festivals." }
    ]
  },
  {
    id: "mongols",
    name: "Mongoli",
    flag: "/civs/Mongols.webp",
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
        imageId: "khan-1",
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
        imageId: "mangudai-2",
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
        imageId: "keshik-2",
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
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "deer-stones", imageId: "deer-stones-1", name: "Deer Stones", age: 2, type: "Military", description: "Grants access to the Khan's Hunter at the Archery Range and instantly researches the Yam Network technology." },
      { id: "yam-network", name: "Yam Network", age: 2, type: "Military", description: "Outposts grant a speed boost to all nearby cavalry and traders." },
      { id: "silver-tree", imageId: "the-silver-tree-1", name: "The Silver Tree", age: 2, type: "Economic", description: "Acts as a Market. Trader production +40% faster and -40% cheaper." },
      { id: "kurultai", name: "Kurultai", age: 3, type: "Military", description: "Heals nearby units and provides +20% damage bonus with Khan." },
      { id: "steppe-redoubt", name: "Steppe Redoubt", age: 3, type: "Economic", description: "Acts as a Ger. Gold income increased by +50%." },
      { id: "khaganate-palace", name: "Khaganate Palace", age: 4, type: "Military", description: "Automatically spawns diverse Mongol armies." },
      { id: "white-stupa", imageId: "the-white-stupa-3", name: "The White Stupa", age: 4, type: "Economic", description: "Generates 240 stone per minute without an Ovoo." }
    ]
  },
  {
    id: "orderofthedragon",
    name: "Ordine del Drago",
    flag: "/civs/Order of the Dragon.webp",
    difficulty: "Facile",
    shortDescription: "An elite variant of the Holy Roman Empire, focusing on fewer, but incredibly powerful units.",
    passiveBonuses: ["Units are individually much stronger but cost double the resources and population space."],
    uniqueUnits: [
      { id: "gilded-spearman", imageId: "spearman-1", name: "Gilded Spearman", type: "Infantry", age: 1, stats: { attack: 14, armor: 0, speed: 1.25, health: 160 }, strengths: ["Cavalry"], weaknesses: ["Archers", "Heavy Infantry"], description: "Elite variant of the Spearman with double health and damage." },
      { id: "gilded-archer", imageId: "archer-2", name: "Gilded Archer", type: "Ranged", age: 2, stats: { attack: 10, armor: 0, speed: 1.25, health: 140 }, strengths: ["Spearmen", "Crossbowmen"], weaknesses: ["Cavalry", "Man-at-Arms"], description: "Elite variant of the Archer with double health and damage." },
      { id: "gilded-horseman", imageId: "horseman-2", name: "Gilded Horseman", type: "Cavalry", age: 2, stats: { attack: 18, armor: 2, speed: 1.88, health: 250 }, strengths: ["Archers", "Siege"], weaknesses: ["Spearmen", "Knights"], description: "Elite variant of the Horseman with double health and damage." },
      { id: "gilded-knight", imageId: "knight-3", name: "Gilded Knight", type: "Cavalry", age: 3, stats: { attack: 48, armor: 8, speed: 1.62, health: 460 }, strengths: ["Archers", "Infantry"], weaknesses: ["Spearmen", "Crossbowmen"], description: "Elite variant of the Knight with double health and damage." },
      { id: "gilded-landsknecht", imageId: "landsknecht-3", name: "Gilded Landsknecht", type: "Infantry", age: 3, stats: { attack: 34, armor: 0, speed: 1.12, health: 170 }, strengths: ["Massed Units", "Light Infantry"], weaknesses: ["Archers", "Knights"], description: "Elite variant of the Landsknecht with double health and damage." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "aachen-chapel-od", imageId: "aachen-chapel", name: "Aachen Chapel", age: 2, type: "Economic", description: "Inspires all Villagers in a large radius and increases their gather rate by +15%. Acts as a drop-off point for all resource types." },
      { id: "meinwerk-palace-od", imageId: "meinwerk-palace", name: "Meinwerk Palace", age: 2, type: "Technology", description: "Blacksmith where technologies cost -50% and research 50% faster." },
      { id: "burgrave-palace-od", imageId: "burgrave-palace", name: "Burgrave Palace", age: 3, type: "Military", description: "Barracks that produces units 35% faster and 35% cheaper." },
      { id: "regnitz-cathedral-od", imageId: "regnitz-cathedral", name: "Regnitz Cathedral", age: 3, type: "Economic", description: "All Relics generate +100% gold while garrisoned. Acts as a Monastery." },
      { id: "palace-of-swabia-od", imageId: "palace-of-swabia", name: "Palace of Swabia", age: 4, type: "Economic", description: "Acts as a Town Center. Produces Villagers +200% faster and at -66% cost." },
      { id: "elzbach-palace-od", imageId: "elzbach-palace", name: "Elzbach Palace", age: 4, type: "Defensive", description: "Acts as a Keep with +50% health. Buildings within influence take -25% less damage." }
    ]
  },
  {
    id: "ottomans",
    name: "Ottomani",
    flag: "/civs/Ottomans.webp",
    difficulty: "Medio",
    shortDescription: "A military powerhouse offering free troop production through Military Schools.",
    passiveBonuses: ["Military Schools produce units slowly for free.", "Gain Vizier Points to unlock powerful civilization-wide abilities."],
    uniqueUnits: [
      { id: "sipahi", imageId: "sipahi-2", name: "Sipahi", type: "Cavalry", age: 2, stats: { attack: 11, armor: 0, speed: 1.62, health: 135 }, strengths: ["Archers"], weaknesses: ["Spearmen"], description: "Light cavalry that can activate Fortitude for more damage." },
      { id: "mehter", imageId: "mehter-2", name: "Mehter", type: "Cavalry", age: 2, stats: { attack: 0, armor: 1, speed: 1.62, health: 140 }, strengths: ["Buffs"], weaknesses: ["Combat Icons"], description: "War drummer that provides tactical auras to nearby units." },
      { id: "janissary", imageId: "janissary-3", name: "Janissary", type: "Ranged", age: 3, stats: { attack: 16, armor: 0, speed: 1.12, health: 80 }, strengths: ["Cavalry"], weaknesses: ["Archers"], description: "Gunpowder unit strong vs cavalry; can repair siege." },
      { id: "great-bombard", imageId: "great-bombard-4", name: "Great Bombard", type: "Siege", age: 4, stats: { attack: 150, armor: 0, speed: 0.62, health: 400 }, strengths: ["Buildings", "Masses"], weaknesses: ["Melee Cavalry"], description: "The largest and most powerful siege cannon." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "sultanhani", imageId: "sultanhani-trade-network-1", name: "Sultanhani Trade Network", age: 2, type: "Economic", description: "Garrisons Traders to generate Gold over time." },
      { id: "twin-minaret", imageId: "twin-minaret-medrese-1", name: "Twin Minaret Medrese", age: 2, type: "Economic", description: "Acts as a Mill; spawns infinite Berry Bushes." },
      { id: "istanbul-palace", imageId: "istanbul-imperial-palace-2", name: "Istanbul Imperial Palace", age: 3, type: "Technology", description: "Increases Vizier Point generation speed." },
      { id: "mehmed-armory", imageId: "mehmed-imperial-armory-2", name: "Mehmed Imperial Armory", age: 3, type: "Military", description: "Automatically produces free Siege units." },
      { id: "sea-gate-castle", name: "Sea Gate Castle", age: 4, type: "Defensive", description: "Strengthens trade and acts as a powerful Keep." },
      { id: "istanbul-observatory", imageId: "istanbul-observatory-3", name: "Istanbul Observatory", age: 4, type: "Technology", description: "Functions as a University and significantly enhances the production speed influence provided by Blacksmiths and Universities." }
    ]
  },
  {
    id: "rus",
    name: "Rusiani",
    flag: "/civs/Rus.webp",
    difficulty: "Medio",
    shortDescription: "A hunting and forestry civilization relying on Bounties and robust Wooden Fortresses.",
    passiveBonuses: ["Gain Bounty from hunting animals, increasing global gather rates.", "Produce strong early knights and wooden defensive structures."],
    uniqueUnits: [
      {
        id: "rus-knight",
        imageId: "knight-2",
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
        imageId: "warrior-monk-3",
        name: "Warrior Monk",
        type: "Cavalry",
        age: 3,
        stats: { attack: 11, armor: 0, speed: 1.62, health: 190 },
        strengths: ["Combat Buffs", "Relics"],
        weaknesses: ["Spearmen"],
        description: "Religious cavalry unit that buffs nearby allies after combat."
      },
      {
        id: "streltsy",
        imageId: "streltsy-4",
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
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "golden-gate", imageId: "the-golden-gate-1", name: "The Golden Gate", age: 2, type: "Economic", description: "Specialized Market with highly favorable exchange rates." },
      { id: "kremlin", name: "The Kremlin", age: 2, type: "Defensive", description: "Reinforced Wooden Fortress; can call temporary Militia." },
      { id: "high-trade-house", name: "High Trade House", age: 3, type: "Economic", description: "Generates gold from nearby trees and periodically spawns Deer." },
      { id: "abbey-trinity", imageId: "abbey-of-the-trinity-2", name: "Abbey of the Trinity", age: 3, type: "Religious", description: "Acts as a Monastery; trains Warrior Monks at lower cost." },
      { id: "high-armory", name: "High Armory", age: 4, type: "Military", description: "Reduces cost of Siege Workshops and provides unique upgrades." },
      { id: "spasskaya-tower", name: "Spasskaya Tower", age: 4, type: "Defensive", description: "High-health Keep with pre-unlocked weapon emplacements." }
    ]
  },
  {
    id: "sengoku",
    name: "Sengoku Daimyo",
    flag: "/civs/Sengoku Daimyo.webp",
    difficulty: "Difficile",
    shortDescription: "A variant of the Japanese focusing intensely on Samurai warfare and rapid expansion.",
    passiveBonuses: ["Aggressive early game melee bonuses.", "Enhanced Daimyo mechanics for military production."],
    uniqueUnits: [
      { id: "samurai-sd", imageId: "samurai-2", name: "Samurai", type: "Infantry", age: 2, stats: { attack: 10, armor: 3, speed: 1.12, health: 130 }, strengths: ["Infantry"], weaknesses: ["Crossbowmen"], description: "Heavy infantry with Deflective Armor that blocks strikes." },
      { id: "onna-bugeisha-sd", imageId: "onna-bugeisha-2", name: "Onna-Bugeisha", type: "Infantry", age: 2, stats: { attack: 8, armor: 0, speed: 1.38, health: 80 }, strengths: ["Light Units"], weaknesses: ["Archers"], description: "Fast light infantry with high attack range." },
      { id: "shinobi-sd", imageId: "shinobi-2", name: "Shinobi", type: "Infantry", age: 2, stats: { attack: 8, armor: 0, speed: 1.25, health: 100 }, strengths: ["Sabotage"], weaknesses: ["Detection"], description: "Stealth unit that can teleport and sabotage buildings." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "koka-township", imageId: "koka-township-1", name: "Koka Township", age: 2, type: "Military", description: "Allows the production of Shinobi units and grants specialized sabotage abilities." },
      { id: "ryokan", imageId: "ryokan-1", name: "Ryokan", age: 2, type: "Economic", description: "Provides 10/15/20 population and heals nearby friendly units out of combat." },
      { id: "temple-equality-sd", imageId: "temple-of-equality-2", name: "Temple of Equality", age: 3, type: "Religious", description: "Produces Buddhist Monks to debuff enemy units." },
      { id: "sake-brewery", imageId: "sake-brewery-2", name: "Sake Brewery", age: 3, type: "Economic", description: "Generates significant gold and provides Matsuri buffs to nearby villagers." },
      { id: "sword-hunt-statue", imageId: "sword-hunt-statue-3", name: "Sword Hunt Statue", age: 4, type: "Military", description: "Decreases Daimyo cost and increases their aura attack speed bonus." },
      { id: "castle-of-the-crow-sd", imageId: "castle-of-the-crow-3", name: "Castle of the Crow", age: 4, type: "Defensive", description: "Acts as a powerful defensive structure that periodically spawns Treasure Caravans." }
    ]
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
    landmarks: [
      { id: "town-center-1", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "town-center-2", imageId: "town-center-1", name: "Centro Città", age: 2, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "fortress-2", imageId: "fortress-2", name: "Fortezza", age: 2, type: "Defensive", description: "Potente struttura difensiva che protegge il territorio." },
      { id: "town-center-3", imageId: "town-center-1", name: "Centro Città", age: 3, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "fortress-3", imageId: "fortress-2", name: "Fortezza", age: 3, type: "Defensive", description: "Potente struttura difensiva che protegge il territorio." },
      { id: "town-center-4", imageId: "town-center-1", name: "Centro Città", age: 4, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "fortress-4", imageId: "fortress-2", name: "Fortezza", age: 4, type: "Defensive", description: "Potente struttura difensiva che protegge il territorio." }
    ]
  },
  {
    id: "tughlaq",
    name: "Dinastia di Tughlaq",
    flag: "/civs/Tughlaq Dynasty.png",
    difficulty: "Medio",
    shortDescription: "A variant of the Delhi Sultanate heavily utilizing elephants and defensive structures.",
    passiveBonuses: ["Earlier access to War Elephants.", "Stronger defensive network integration."],
    uniqueUnits: [
      { id: "worker-elephant", imageId: "worker-elephant", name: "Worker Elephant", type: "Siege", age: 1, stats: { attack: 0, armor: 2, speed: 1, health: 400 }, strengths: ["Resource gathering", "Mobile drop-off"], weaknesses: ["Vulnerable to attacks"], description: "Gathers all resources and acts as a mobile drop-off point. Moves and builds faster than villagers." },
      { id: "healer-elephant", imageId: "healer-elephant", name: "Healer Elephant", type: "Religious", age: 2, stats: { attack: 0, armor: 1, speed: 1.12, health: 250 }, strengths: ["Healing in combat", "Garrison relics"], weaknesses: ["Vulnerable to melee"], description: "Religious unit mounted on an elephant capable of healing units in combat." },
      { id: "raider-elephant", imageId: "tower-war-elephant", name: "Raider Elephant", type: "Cavalry", age: 2, stats: { attack: 20, armor: 2, speed: 1.25, health: 600 }, strengths: ["Siege", "Buildings"], weaknesses: ["Spearmen"], description: "Fast cavalry elephant effective against buildings and units." },
      { id: "ballista-elephant", imageId: "ballista-elephant", name: "Ballista Elephant", type: "Siege", age: 3, stats: { attack: 40, armor: 3, speed: 1, health: 800 }, strengths: ["Infantry", "Units"], weaknesses: ["Spearmen", "Springalds"], description: "Siege elephant effective against both units and structures." },
      { id: "war-elephant-tughlaq", imageId: "war-elephant", name: "War Elephant", type: "Cavalry", age: 3, stats: { attack: 30, armor: 4, speed: 0.88, health: 1200 }, strengths: ["High health", "Damage"], weaknesses: ["Spearmen", "Handcannoneers"], description: "Heavy cavalry unit with very high health and damage." },
      { id: "amir-warrior", imageId: "amir-warrior", name: "Amir Warrior", type: "Infantry", age: 2, stats: { attack: 12, armor: 2, speed: 1.25, health: 150 }, strengths: ["Zero population cost", "Powerful near forts"], weaknesses: ["Weak far from forts"], description: "Powerful free heavy infantry with no population cost. Excels near Tughlaqabad Forts." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "dome-of-the-faith", imageId: "dome-of-the-faith-1", name: "Dome of the Faith", age: 2, type: "Religious", description: "Acts as a Mosque and provides early access to Healer Elephants. Produces Imams and Healer Elephants at a discount of 65 Gold." },
      { id: "tower-of-victory", imageId: "tower-of-victory-1", name: "Tower of Victory", age: 2, type: "Technology", description: "Increases the attack speed of Elephants by +20% when produced from buildings within influence." },
      { id: "compound-of-the-defender", imageId: "compound-of-the-defender-3", name: "Compound of the Defender", age: 3, type: "Defensive", description: "Reduces Stone cost of buildings by 20%. Unlocks an additional upgrade to each Tughlaqabad Fort which enhances health and Governor benefits." },
      { id: "house-of-learning", imageId: "house-of-learning-3", name: "House of Learning", age: 3, type: "Technology", description: "Advances to the next Age and contains many unique technologies." },
      { id: "hisar-academy", imageId: "hisar-academy-4", name: "Hisar Academy", age: 4, type: "Technology", description: "Acts as a Madrasa. Generates 70 Food and 70 Gold per minute for every active Governor." },
      { id: "palace-of-the-sultan", imageId: "palace-of-the-sultan-4", name: "Palace of the Sultan", age: 4, type: "Military", description: "Grants the fourth-tier benefactor bonus of an appointed Governor immediately." }
    ]
  },
  {
    id: "zhuxi",
    name: "Eredità di Zhu Xi",
    flag: "/civs/Zhu Xis Legacy.png",
    difficulty: "Difficile",
    shortDescription: "A fast-paced Imperial variant of the Chinese emphasizing early Dynasties.",
    passiveBonuses: ["Cheaper officials and streamlined access to powerful Shaolin Monks and Chu Ko Nu.", "Earlier access to robust technologies."],
    uniqueUnits: [
      { id: "zhuge-nu-zhuxi", imageId: "zhuge-nu-2", name: "Zhuge Nu", type: "Ranged", age: 2, stats: { attack: 12, armor: 0, speed: 1.12, health: 70 }, strengths: ["Fanteria Leggera"], weaknesses: ["Cavalieri", "Cavalleggeri"], description: "Rapid-fire crossbowman." },
      { id: "shaolin-monk", imageId: "shaolin-monk-3", name: "Monaco Shaolin", type: "Religious", age: 3, stats: { attack: 15, armor: 2, speed: 1.25, health: 190 }, strengths: ["All Units"], weaknesses: ["Massed Ranged"], description: "Powerful monk that can reflect ranged attacks." },
      { id: "yuan-raider", imageId: "fire-lancer-3", name: "Predone Yuan", type: "Cavalry", age: 4, stats: { attack: 15, armor: 4, speed: 2.00, health: 200 }, strengths: ["Raiding"], weaknesses: ["Spearmen"], description: "Extremely fast light cavalry." }
    ],
    technologies: [],
    landmarks: [
      { id: "town-center", imageId: "town-center-1", name: "Centro Città", age: 1, type: "Economic", description: "L'edificio principale della civiltà. Produce abitanti e funge da punto di consegna per tutte le risorse." },
      { id: "jiangnan-tower", name: "Torre Jiangnan", age: 2, type: "Military", description: "Acts as tax drop-off; grants free units on building completion." },
      { id: "meditation-gardens", name: "Giardini della Meditazione", age: 2, type: "Economic", description: "Generates resources based on nearby deposits." },
      { id: "mount-lu", imageId: "mount-lu-academy-1", name: "Accademia del Monte Lu", age: 3, type: "Economic", description: "Improves tax collection and food gathering." },
      { id: "shaolin-monastery", name: "Monastero Shaolin", age: 3, type: "Religious", description: "Produces powerful Shaolin Monks." },
      { id: "temple-sun", imageId: "temple-of-the-sun-3", name: "Tempio del Sole", age: 4, type: "Technology", description: "Grants powerful global togglable buffs." },
      { id: "zhuxi-library", imageId: "zhu-xis-library-3", name: "Biblioteca di Zhu Xi", age: 4, type: "Technology", description: "Access to powerful unique upgrades." }
    ]
  }
];
