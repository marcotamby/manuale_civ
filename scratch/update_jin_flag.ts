import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function update() {
    const { data, error } = await supabase
        .from('civilizations')
        .update({ flag: '/civs/Jin Dynasty.webp' })
        .eq('id', 'jin-dynasty');
    
    if (error) {
        console.error('Error updating flag:', error);
    } else {
        console.log('Flag updated successfully for jin-dynasty');
    }
}

update();
