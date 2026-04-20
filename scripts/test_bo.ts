import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// TRY BOTH KEYS
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function check(client: any, name: string) {
  const { data, error } = await client.from('build_orders').select('*');
  console.log(`---- ${name} ----`);
  if (error) {
    console.error("Error:", error.message, error.code, error.details);
  } else {
    console.log("Success! Data length:", data?.length);
  }
}

async function run() {
  await check(createClient(supabaseUrl, anonKey), "ANON KEY");
  if (serviceKey) {
    await check(createClient(supabaseUrl, serviceKey), "SERVICE KEY");
  } else {
    console.log("NO SERVICE KEY FOUND");
  }
}

run();
