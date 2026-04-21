
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkTable() {
    const { data, error } = await supabase.from('tournaments').select('*').limit(1);
    if (error) {
        console.log('Table "tournaments" likely does not exist or error:', error.message);
    } else {
        console.log('Table "tournaments" exists.');
    }
}

checkTable();
