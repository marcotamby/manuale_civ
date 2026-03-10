import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const fixes = [
    {
        name: 'Cinesi',
        units: [
            {
                id: 'imperial-official', name: 'Imperial Official', type: 'Infantry', age: 1,
                stats: { attack: 0, armor: 0, speed: 1.12, health: 75 },
                strengths: ['Economic Buff', 'Tax Collection'],
                weaknesses: ['Everything'],
                description: 'Collects tax gold and supervises buildings for production bonuses.'
            },
            {
                id: 'zhuge-nu', name: 'Zhuge Nu', type: 'Ranged', age: 2,
                stats: { attack: 12, armor: 0, speed: 1.12, health: 70 },
                strengths: ['Light Infantry'],
                weaknesses: ['Knights', 'Horsemen'],
                description: 'Rapid-fire crossbowman that fires 3 bolts per attack.'
            },
            {
                id: 'palace-guard', name: 'Palace Guard', type: 'Infantry', age: 3,
                stats: { attack: 12, armor: 3, speed: 1.25, health: 155 },
                strengths: ['Light Infantry', 'Archers'],
                weaknesses: ['Knights', 'Crossbowmen'],
                description: 'Faster variant of the Man-at-Arms with high durability.'
            }
        ]
    },
    {
        name: 'Dinastia Abbaside',
        units: [
            {
                id: 'camel-archer', name: 'Camel Archer', type: 'Ranged', age: 2,
                stats: { attack: 11, armor: 0, speed: 1.62, health: 150 },
                strengths: ['Cavalry', 'Archers'],
                weaknesses: ['Knights', 'Horsemen'],
                description: 'Mobile ranged unit that debuffs nearby horse cavalry.'
            },
            {
                id: 'ghulam', name: 'Ghulam', type: 'Infantry', age: 3,
                stats: { attack: 20, armor: 4, speed: 1.12, health: 195 },
                strengths: ['Light Infantry', 'Archers'],
                weaknesses: ['Knights', 'Crossbowmen'],
                description: 'Tough infantry that delivers a rapid double-strike attack.'
            },
            {
                id: 'camel-rider', name: 'Camel Rider', type: 'Cavalry', age: 3,
                stats: { attack: 14, armor: 0, speed: 1.62, health: 270 },
                strengths: ['Cavalry'],
                weaknesses: ['Spearmen', 'Crossbowmen'],
                description: 'Anti-cavalry specialist that applies the Camels Unease debuff.'
            }
        ]
    },
    {
        name: 'Ayyubidi',
        units: [
            {
                id: 'desert-raider', name: 'Desert Raider', type: 'Cavalry', age: 2,
                stats: { attack: 10, armor: 0, speed: 1.62, health: 120 },
                strengths: ['Light Units'],
                weaknesses: ['Knights'],
                description: 'Versatile raider that can switch between melee and ranged.'
            },
            {
                id: 'camel-lancer', name: 'Camel Lancer', type: 'Cavalry', age: 3,
                stats: { attack: 22, armor: 3, speed: 1.62, health: 210 },
                strengths: ['Cavalry'],
                weaknesses: ['Spearmen'],
                description: 'Strong heavy camel cavalry.'
            },
            {
                id: 'ghulam-ayyubid', name: 'Ghulam', type: 'Infantry', age: 3,
                stats: { attack: 12, armor: 4, speed: 1.12, health: 195 },
                strengths: ['Light Infantry'],
                weaknesses: ['Knights'],
                description: 'Tough infantry with a double-strike attack.'
            }
        ]
    }
];

async function fixUnits() {
    for (const fix of fixes) {
        console.log(`\nFixing units for: ${fix.name}`);
        const { error } = await supabase
            .from('civilizations')
            .update({ unique_units: fix.units })
            .eq('name', fix.name);

        if (error) {
            console.error(`  ERROR for ${fix.name}:`, error.message);
        } else {
            const unitNames = fix.units.map(u => u.name).join(', ');
            console.log(`  ✅ Updated with: ${unitNames}`);
        }
    }
    console.log('\nDone! Run the audit script again to verify.');
}

fixUnits();
