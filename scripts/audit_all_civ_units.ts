import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditCivs() {
    const { data, error } = await supabase
        .from('civilizations')
        .select('name, unique_units');

    if (error) {
        console.error(error);
        return;
    }

    console.log("Audit of unique units in DB:");
    data.forEach(c => {
        const unitNames = c.unique_units?.map(u => u.name).join(', ') || 'NONE';
        console.log(`${c.name.padEnd(25)}: ${unitNames}`);
    });
}

auditCivs();
