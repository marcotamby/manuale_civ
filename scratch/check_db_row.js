import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");

async function check() {
  const { data, error } = await client
    .from('stream_overlays')
    .select('*')
    .eq('id', 'draft-matching')
    .single();

  if (error) {
    console.error("DB SELECT ERROR:", error);
    return;
  }

  console.log("Row ID:", data.id);
  console.log("Background URL length:", data.background_url ? data.background_url.length : 0);
  if (data.background_url && data.background_url.startsWith('data:')) {
    console.log("Background URL is indeed base64! Starts with:", data.background_url.slice(0, 50));
  } else {
    console.log("Background URL is:", data.background_url);
  }
  console.log("State size (JSON):", JSON.stringify(data.state).length);
  console.log("State content:", JSON.stringify(data.state, null, 2));
}

check();
