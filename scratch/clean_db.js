import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");

async function clean() {
  const { data, error } = await client
    .from('stream_overlays')
    .update({ background_url: '' })
    .eq('id', 'draft-matching')
    .select();

  if (error) {
    console.error("DB CLEAN ERROR:", error);
  } else {
    console.log("Successfully cleaned background_url in database. New length:", data[0]?.background_url?.length || 0);
  }
}

clean();
