import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('📡 Fetching civilizations from Supabase...');
    const { data: civilizations, error } = await supabase
        .from('civilizations')
        .select('*');

    if (error) {
        console.error('❌ Error fetching civilizations:', error.message);
        return;
    }

    if (!civilizations) {
        console.error('❌ No civilizations found.');
        return;
    }

    // Map database fields to TypeScript interface fields
    const mappedCivs = civilizations.map(civ => ({
        id: civ.id,
        name: civ.name,
        flag: civ.flag,
        difficulty: civ.difficulty,
        shortDescription: civ.short_description,
        passiveBonuses: civ.passive_bonuses,
        uniqueUnits: civ.unique_units,
        technologies: civ.technologies,
        landmarks: civ.landmarks,
        videos: civ.videos,
        buildOrders: civ.build_orders,
        strengths: civ.strengths,
        weaknesses: civ.weaknesses,
        primaryColor: civ.primary_color || (civ.id === 'abbasid' ? '#1f2937' : civ.id === 'ayyubids' ? '#eab308' : civ.id === 'delhi' ? '#10b981' : civ.id === 'byzantines' ? '#8b5cf6' : civ.id === 'chinese' ? '#ef4444' : civ.id === 'english' ? '#f59e0b' : civ.id === 'french' ? '#3b82f6' : civ.id === 'hre' ? '#fbbf24' : civ.id === 'japanese' ? '#e2e8f0' : civ.id === 'jeannedarc' ? '#3b82f6' : civ.id === 'malians' ? '#d97706' : civ.id === 'mongols' ? '#4b5563' : civ.id === 'ottomans' ? '#dc2626' : civ.id === 'rus' ? '#2563eb' : civ.id === 'zhuxi' ? '#16a34a' : '#94a3b8')
    }));

    // Construct the file content
    let content = `export type UnitType = 'Infantry' | 'Cavalry' | 'Siege' | 'Ranged' | 'Religious' | 'Worker';
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
  difficulty: 1 | 2 | 3 | string; 
  steps: BuildOrderStep[];
  source?: string;
  author_id?: string;
  author_nickname?: string;
  author_rank?: string;
  author_avatar?: string;
  banner_url?: string;
  banner_position?: number;
  banner_position_x?: number;
  map?: string;
}

export interface Civilization {
  id: string;
  name: string;
  flag: string;
  difficulty: 'Facile' | 'Medio' | 'Difficile' | string;
  shortDescription: string;
  passiveBonuses: string[];
  uniqueUnits: Unit[];
  technologies: Technology[];
  landmarks: Landmark[];
  videos?: string[];
  buildOrders?: BuildOrder[];
  strengths?: string[];
  weaknesses?: string[];
  primaryColor?: string;
}

export const unitsList: Unit[] = []; // Pulled units logic could be here but for now empty to avoid redundancy

export const civilizationsData: Civilization[] = ${JSON.stringify(mappedCivs, null, 2)};
`;

    const filePath = path.join(process.cwd(), 'src/data/aoe4Data.ts');
    fs.writeFileSync(filePath, content);
    console.log('✅ Local data synchronized with Supabase!');
}

main();
