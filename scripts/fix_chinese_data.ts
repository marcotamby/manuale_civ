import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Data sourced from aoe4world/data GitHub repo (civilizations/chinese.json)
const chineseData = {
    short_description: "Civiltà flessibile che si evolve attraverso le Grandi Dinastie. Costruisce velocemente, tassa le risorse e padroneggia la polvere da sparo.",
    passive_bonuses: [
        "Inizia nella Dinastia Tang: +30% raggio visivo degli Esploratori e accesso al Villaggio.",
        "Unità addestrate, tecnologie ricercate e risorse restituite generano Tasse (Oro) raccoglibili dagli Ufficiali Imperiali.",
        "Costruisce entrambi i Landmark di un'Età per sbloccare una Dinastia con bonus unici (Song, Yuan, Ming).",
        "I Villici costruiscono difese +50% più veloci e tutti gli altri edifici +100% più velocemente.",
        "La tecnologia Chimica è gratuita in Età I: Centri Città, Forti e Avamposti usano Feritoie a Cannone invece di quelle standard.",
        "I Cantieri Navali lavorano il +10% più velocemente."
    ],
    unique_units: [
        {
            id: "imperial-official",
            name: "Ufficiale Imperiale",
            type: "Infantry",
            age: 1,
            stats: { attack: 0, armor: 0, speed: 1.12, health: 75 },
            strengths: ["Supervisione Edifici", "Raccolta Tasse"],
            weaknesses: ["Tutto"],
            description: "Raccoglie Oro (Tasse) e usa 'Supervisiona' per aumentare del +150% la produzione degli edifici militari e di ricerca, o il +20% delle risorse raccolte dai Villici."
        },
        {
            id: "zhuge-nu",
            name: "Zhuge Nu",
            type: "Ranged",
            age: 2,
            stats: { attack: 12, armor: 0, speed: 1.12, health: 70 },
            strengths: ["Fanteria Leggera"],
            weaknesses: ["Cavalieri", "Cavalleggeri"],
            description: "Balestriere a fuoco rapido che spara 3 dardi per attacco. Efficace contro unità leggere. Disponibile con la Dinastia Song."
        },
        {
            id: "palace-guard",
            name: "Guardia del Palazzo",
            type: "Infantry",
            age: 3,
            stats: { attack: 12, armor: 3, speed: 1.25, health: 155 },
            strengths: ["Fanteria Leggera", "Arcieri"],
            weaknesses: ["Cavalieri", "Balestrieri"],
            description: "Variante dell'Uomo d'Arme con velocità superiore ma meno armatura. Rimpiazza l'Uomo d'Arme standard."
        },
        {
            id: "nest-of-bees",
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
            name: "Lanciere di Fuoco",
            type: "Cavalry",
            age: 3,
            stats: { attack: 20, armor: 0, speed: 1.62, health: 130 },
            strengths: ["Macchine da Assedio", "Edifici"],
            weaknesses: ["Lancieri", "Balestrieri"],
            description: "Cavalleria leggera con ampio raggio visivo e un attacco esplosivo in carica. Ottima contro macchine da assedio ed edifici. Disponibile con la Dinastia Yuan."
        },
        {
            id: "grenadier",
            name: "Granatiere",
            type: "Ranged",
            age: 4,
            stats: { attack: 25, armor: 0, speed: 1.12, health: 100 },
            strengths: ["Unità Raggruppate", "Fanteria Pesante"],
            weaknesses: ["Cavalleria", "Arcieri"],
            description: "Fanteria a polvere da sparo che lancia granate con danno ad area. Disponibile con la Dinastia Ming."
        }
    ],
    landmarks: [
        {
            id: "imperial-academy",
            name: "Accademia Imperiale",
            age: 2,
            type: "Economic",
            description: "Genera Oro dalle Tasse al +100% per gli edifici vicini. I Villici nel raggio lavorano più velocemente."
        },
        {
            id: "barbican-of-the-sun",
            name: "Barbacane del Sole",
            age: 2,
            type: "Defensive",
            description: "Fortezza con un potente cannone a lungo raggio. Agisce come un Forte avanzato con capacità difensive elevate."
        },
        {
            id: "astronomical-clocktower",
            name: "Torre dell'Orologio Astronomico",
            age: 3,
            type: "Military",
            description: "Produce macchine da assedio con +50% HP. Include varianti esclusive di armi d'assedio (Springald, Trebuchet, Bombarda, Nido delle Api, Ariete)."
        },
        {
            id: "imperial-palace",
            name: "Palazzo Imperiale",
            age: 3,
            type: "Economic",
            description: "Ampio raggio visivo strategico. Rivela la posizione dei Villici nemici sulla mappa con la tecnologia Spie Imperiali."
        },
        {
            id: "great-wall-gatehouse",
            name: "Porta della Grande Muraglia",
            age: 4,
            type: "Defensive",
            description: "Sblocca la costruzione di segmenti della Grande Muraglia. Aumenta la salute delle Mura di Pietra e delle Porte del +100%."
        },
        {
            id: "spirit-way",
            name: "Via degli Spiriti",
            age: 4,
            type: "Military",
            description: "Riduce il costo delle unità della Dinastia del -30% in prossimità. Sblocca tecnologia esclusiva per potenziare le unità."
        }
    ]
};

async function fixChineseData() {
    console.log("Aggiornamento dati Cinesi in corso...\n");

    const { error } = await supabase
        .from('civilizations')
        .update({
            short_description: chineseData.short_description,
            passive_bonuses: chineseData.passive_bonuses,
            unique_units: chineseData.unique_units,
            landmarks: chineseData.landmarks,
        })
        .eq('name', 'Cinesi');

    if (error) {
        console.error("ERRORE:", error.message);
    } else {
        console.log("✅ Cinesi aggiornati con successo!");
        console.log(`   Bonus passivi: ${chineseData.passive_bonuses.length}`);
        console.log(`   Unità uniche: ${chineseData.unique_units.map(u => u.name).join(', ')}`);
        console.log(`   Landmark: ${chineseData.landmarks.map(l => l.name).join(', ')}`);
    }
}

fixChineseData();
