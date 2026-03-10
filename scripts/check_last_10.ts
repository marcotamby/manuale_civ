import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    console.log("Status of last 10 processed suggestions:");
    data.forEach(s => {
        console.log(`- ID: ${s.id}, Email: ${s.user_email}, Status: ${s.status}, Notified: ${s.notified}, Created: ${s.created_at}`);
    });
}

checkStatus();
