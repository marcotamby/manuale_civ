import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
    const { data, error } = await supabase.from('civilizations').select('id, name, flag').eq('id', 'jin-dynasty');
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}

check();
