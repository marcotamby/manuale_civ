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

async function resetNotifications() {
    console.log("Resetting notified status for the 5 most recent suggestions...");

    // Get the IDs of the most recent suggestions that were notified
    const { data: suggestions, error: fetchError } = await supabase
        .from('suggestions')
        .select('id, user_email, status, civ_name, created_at')
        .eq('notified', true)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10); // Take top 10 to be safe

    if (fetchError) {
        console.error("Error fetching suggestions:", fetchError);
        return;
    }

    if (suggestions.length === 0) {
        console.log("No suggestions found to reset.");
        return;
    }

    const ids = suggestions.map(s => s.id);
    console.log(`Resetting notified=false for IDs: ${ids.join(', ')}`);

    const { error: updateError } = await supabase
        .from('suggestions')
        .update({ notified: false })
        .in('id', ids);

    if (updateError) {
        console.error("Error updating suggestions:", updateError);
    } else {
        console.log("Successfully reset notified status! The Edge Function should pick them up on the next run.");
    }
}

resetNotifications();
