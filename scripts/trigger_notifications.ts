import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const functionUrl = `${supabaseUrl}/functions/v1/batch-send-notifications`;

async function triggerFunction() {
    console.log(`Triggering Edge Function at: ${functionUrl}`);

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({})
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Body:", JSON.stringify(data, null, 2));

        if (data.success) {
            console.log(`Success! Sent ${data.count} notification groups.`);
        } else {
            console.log("Function executed but returned success=false or no data.");
        }
    } catch (error) {
        console.error("Error triggering function:", error);
    }
}

triggerFunction();
