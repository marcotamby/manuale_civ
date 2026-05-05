
import { createClient } from '@supabase/supabase-backend-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    console.log('🔍 Checking profiles...');
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nickname')
        .limit(10);
    
    if (error) {
        console.error('❌ Error fetching profiles:', error);
    } else {
        console.log('✅ Found profiles:', data);
    }
}

checkProfiles();
