import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentNotified() {
    console.log("Checking recently notified suggestions...");

    const { data, error } = await supabase
        .from('suggestions')
        .select('id, user_email, status, notified, civ_name, section, created_at')
        .eq('notified', true)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching suggestions:", error);
        return;
    }

    console.log(`Found ${data.length} recently notified suggestions:`);
    data.forEach(s => {
        console.log(`- ID: ${s.id}, Email: ${s.user_email}, Status: ${s.status}, Civ: ${s.civ_name}, Section: ${s.section}, Last Update: ${s.updated_at}`);
    });
}

checkRecentNotified();
