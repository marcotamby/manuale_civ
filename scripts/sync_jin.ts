
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

let envPath = '.env.local';
if (!fs.existsSync(envPath)) envPath = '.env';

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const jinData = {
    "id": "jin-dynasty",
    "name": "Dinastia Jin",
    "flag": "/civs/Jin Dynasty.webp",
    "difficulty": "Difficile",
    "short_description": "Una civiltà nomade e imperiale che domina con la sua cavalleria d'élite e la potenza d'assedio superiore. I Jin eccellono nel controllo della mappa grazie ai villaggi a cavallo e ai tributari che potenziano la loro economia.",
    "passive_bonuses": [
      "Villaggi a Cavallo: Può addestrare fino a 20 villaggi a cavallo che raccolgono risorse e si muovono più velocemente dei villaggi standard.",
      "Pascoli (Grasslands): Permette di costruire un Pascolo in una posizione strategica al passaggio di epoca per la produzione rapida di cavalleria.",
      "Meng'an Mouke: Le Stalle di Guerra costruite vicino ai Pascoli producono cavalleria rapidamente utilizzando i cavalli disponibili.",
      "Emissari: Può addestrare fino a 2 Emissari per stabilire Tributari negli insediamenti commerciali neutrali e corrompere unità nemiche.",
      "Tributari: Generano una rendita passiva di Cibo e migliorano del 15% il reddito d'oro dei Mercanti.",
      "Esperienza d'Assedio: Accesso all'Officina Meccanica già nell'Età Feudale; le Bed Crossbows sostituiscono le Springald."
    ],
    "unique_units": [
      {
        "id": "emissary",
        "age": 1,
        "name": "Emissary",
        "type": "Worker",
        "stats": { "armor": 0, "speed": 1.25, "attack": 0, "health": 100 },
        "strengths": ["Support", "Diplomacy"],
        "weaknesses": ["Combat Units"],
        "description": "Non-combat support unit that can establish Tributaries and bribe enemy units."
      },
      {
        "id": "mounted-villager",
        "age": 1,
        "name": "Mounted Villager",
        "type": "Worker",
        "stats": { "armor": 0, "speed": 1.42, "attack": 6, "health": 85 },
        "strengths": ["Speed", "Economy"],
        "weaknesses": ["Archers", "Early Raids"],
        "description": "High-speed economic unit that collects resources and repairs buildings faster than standard villagers."
      },
      {
        "id": "reindeer-trader",
        "age": 1,
        "name": "Reindeer Trader",
        "type": "Worker",
        "stats": { "armor": 0, "speed": 1.1, "attack": 0, "health": 100 },
        "strengths": ["Trading"],
        "weaknesses": ["Cavalry"],
        "description": "Unique trader that costs food and gold instead of just gold."
      },
      {
        "id": "mohe-tribesman",
        "age": 2,
        "name": "Mohe Tribesman",
        "type": "Cavalry",
        "stats": { "armor": 0, "speed": 1.625, "attack": 11, "health": 90 },
        "strengths": ["Light Infantry"],
        "weaknesses": ["Heavy Cavalry", "Spearmen"],
        "description": "Fast and cheap ranged cavalry, excellent against light infantry."
      },
      {
        "id": "bed-crossbow",
        "age": 2,
        "name": "Bed Crossbow",
        "type": "Siege",
        "stats": { "armor": 0, "speed": 0.75, "attack": 40, "health": 132 },
        "strengths": ["Infantry", "Light Units"],
        "weaknesses": ["Cavalry", "Melee Units"],
        "description": "Anti-infantry siege unit that replaces the Springald. Bolts pierce through multiple units."
      },
      {
        "id": "zhanma-swordsman",
        "age": 3,
        "name": "Zhanma Swordsman",
        "type": "Infantry",
        "stats": { "armor": 8, "speed": 1.12, "attack": 23, "health": 250 },
        "strengths": ["Cavalry"],
        "weaknesses": ["Ranged Units", "Crossbowmen"],
        "description": "Elite armored infantry armed with a greatsword. Extremely effective against cavalry."
      },
      {
        "id": "iron-pagoda",
        "age": 3,
        "name": "Iron Pagoda",
        "type": "Cavalry",
        "stats": { "armor": 10, "speed": 1.38, "attack": 26, "health": 290 },
        "strengths": ["Melee Infantry", "Splash Damage"],
        "weaknesses": ["Spearmen", "Crossbowmen"],
        "description": "Heavy armored cavalry that deals splash damage."
      },
      {
        "id": "eruptor",
        "age": 4,
        "name": "Eruptor",
        "type": "Ranged",
        "stats": { "armor": 0, "speed": 1.12, "attack": 53, "health": 155 },
        "strengths": ["Single Target", "Heavy Units"],
        "weaknesses": ["Swarm Units", "Cavalry"],
        "description": "Powerful gunpowder unit with high single-target damage."
      }
    ],
    "technologies": [],
    "landmarks": [
      {
        "id": "flower-pagoda",
        "age": 2,
        "name": "Flower Pagoda",
        "type": "Economic",
        "description": "Consente di piantare un Flower Garden che aumenta la velocità di raccolta e la velocità d'attacco delle unità vicine."
      },
      {
        "id": "great-pasture",
        "age": 2,
        "name": "Great Pasture",
        "type": "Military",
        "description": "Agisce contemporaneamente come Stalla di Guerra e Pascolo (Grassland)."
      },
      {
        "id": "dragon-pavilion",
        "age": 3,
        "name": "Dragon Pavilion",
        "type": "Economic",
        "description": "Riduce il costo degli Emissari del 33% e ne genera uno gratuitamente. Aggiunge Bed Crossbows ai Centri Città."
      },
      {
        "id": "mountain-hall",
        "age": 3,
        "name": "Mountain Hall",
        "type": "Religious",
        "description": "Agisce come Monastero. Genera Karma raccogliendo risorse vicine, sbloccando benedizioni globali."
      },
      {
        "id": "great-wall-bastion",
        "age": 4,
        "name": "Great Wall Bastion",
        "type": "Defensive",
        "description": "Funge da Mastio dotato di 4 Bed Crossbows. Aumenta il danno di tutte le Bed Crossbows dell'esercito."
      },
      {
        "id": "pagoda-forest",
        "age": 4,
        "name": "Pagoda Forest",
        "type": "Economic",
        "description": "Genera periodicamente piccole pagode che producono Legno e rallentano i nemici."
      }
    ],
    "strengths": [
      "Mobilità Superiore: I villaggi a cavallo e la cavalleria precoce permettono un controllo della mappa eccellente.",
      "Economia Flessibile: I Tributari e i villaggi a cavallo scalano l'economia in modo unico.",
      "Potenza d'Assedio: Le Bed Crossbows dominano le masse di fanteria nemica.",
      "Unità d'Elite: Iron Pagoda e Zhanma Swordsman sono tra le unità da mischia più forti del gioco."
    ],
    "weaknesses": [
      "Costi Elevati: Le unità d'élite richiedono un massiccio investimento in risorse.",
      "Dipendenza Strutturale: La perdita dei Pascoli o degli Emissari paralizza la produzione e l'economia.",
      "Vulnerabilità Iniziale: I villaggi a cavallo sono costosi da rimpiazzare se persi precocemente."
    ]
};

async function syncJin() {
  console.log('🚀 Syncing Jin Dynasty to Supabase (Safe columns + technologies)...');
  
  const { error } = await supabase
    .from('civilizations')
    .upsert(jinData, { onConflict: 'id' });

  if (error) {
    console.error('❌ Error syncing Jin Dynasty:', error.message);
  } else {
    console.log('✅ Jin Dynasty synced successfully!');
  }
}

syncJin();
