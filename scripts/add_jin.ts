import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const jinDynasty = {
    id: "jin-dynasty",
    name: "Dinastia Jin",
    flag: "/flags/Jin Dynasty.png",
    difficulty: "Difficile",
    short_description: "Civiltà basata sull'amministrazione imperiale e sulla potenza della polvere da sparo, capace di evolversi attraverso diverse ere amministrative per sbloccare potenti bonus economici e militari.",
    passive_bonuses: [
      "Sistema di Amministrazione: Gestisci funzionari imperiali per raccogliere tasse e supervisionare la produzione.",
      "Mura della Grande Muraglia: Difese superiori e bonus di sorveglianza.",
      "Padrone della Polvere da Sparo: Unità d'assedio e di fanteria a distanza potenziate.",
      "Economia Dinastica: Bonus unici basati sulla dinastia attiva."
    ],
    unique_units: [
      {
        id: "jin-handcannoneer",
        name: "Handcannoneer di Jin",
        type: "Ranged",
        age: 4,
        stats: { attack: 35, armor: 2, speed: 1.12, health: 150 },
        strengths: ["Danni elevati", "Armatura"],
        weaknesses: ["Costo elevato", "Lento"],
        description: "Potente fanteria a distanza con polvere da sparo."
      }
    ],
    technologies: [],
    landmarks: [
      {
        id: "imperial-palace-jin",
        name: "Palazzo Imperiale",
        age: 2,
        description: "Centro amministrativo che aumenta la raccolta di tasse.",
        type: "Economic"
      },
      {
        id: "iron-foundry",
        name: "Fonderia di Ferro",
        age: 3,
        description: "Produce unità d'assedio più velocemente.",
        type: "Military"
      }
    ],
    videos: [],
    build_orders: [],
    strengths: [
      "Forte economia tardiva",
      "Difese eccellenti",
      "Superiorità nell'assedio"
    ],
    weaknesses: [
      "Inizio vulnerabile",
      "Dipendenza dai funzionari",
      "Costo tecnologico elevato"
    ]
};

async function main() {
    console.log('🚀 Adding Jin Dynasty to Supabase...');
    const { error } = await supabase
        .from('civilizations')
        .upsert(jinDynasty, { onConflict: 'id' });

    if (error) {
        console.error('❌ Error adding Jin Dynasty:', error.message);
    } else {
        console.log('✅ Jin Dynasty added successfully!');
    }
}

main();
