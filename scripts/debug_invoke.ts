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

async function debugInvoke() {
    console.log("Attempting to invoke batch-send-notifications and capture detailed error...");

    const { data, error } = await supabase.functions.invoke('batch-send-notifications', {
        body: {}
    });

    if (error) {
        console.error("Invoke Error Details:");
        console.error("Message:", error.message);
        console.error("Status:", (error as any).status);
        // Try to see if there's a body in the error
        if ((error as any).context) {
            console.error("Context:", (error as any).context);
        }
    } else {
        console.log("Success Response Payload:", JSON.stringify(data, null, 2));
    }
}

debugInvoke();
