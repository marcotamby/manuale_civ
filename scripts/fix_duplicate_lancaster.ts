import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicateLancasterBO() {
  console.log('📡 Fetching current Lancaster data from Supabase...');
  
  // Fetch ONLY Lancaster
  const { data, error } = await supabase
    .from('civilizations')
    .select('id, build_orders')
    .eq('id', 'lancaster')
    .single();

  if (error || !data) {
    console.error('❌ Error fetching Lancaster:', error);
    process.exit(1);
  }

  const buildOrders = data.build_orders;
  
  if (!buildOrders || buildOrders.length === 0) {
      console.log('ℹ️ No build orders found for Lancaster.');
      return;
  }
  
  console.log(`Found ${buildOrders.length} build orders for Lancaster.`);
  
  // Let's print their titles to see the duplication
  buildOrders.forEach((bo: any, idx: number) => {
      console.log(`[${idx}] Title: ${bo.title}, ID: ${bo.id}`);
  });

  // Filter out duplicates based on title. We keep the first occurrence.
  const uniqueBuildOrders = [];
  const seenTitles = new Set();
  
  for (const bo of buildOrders) {
      if (!seenTitles.has(bo.title)) {
          seenTitles.add(bo.title);
          uniqueBuildOrders.push(bo);
      } else {
          console.log(`🗑️ Identifying duplicate to remove: '${bo.title}' (ID: ${bo.id})`);
      }
  }

  if (uniqueBuildOrders.length === buildOrders.length) {
      console.log('✅ No duplicates found! Nothing to fix.');
      return;
  }

  console.log(`\n📡 Updating Lancaster with ${uniqueBuildOrders.length} deduplicated build orders...`);

  // Update ONLY Lancaster's build_orders field
  const { error: updateError } = await supabase
    .from('civilizations')
    .update({ build_orders: uniqueBuildOrders })
    .eq('id', 'lancaster');

  if (updateError) {
    console.error('❌ Error updating Lancaster:', updateError);
  } else {
    console.log('🎉 Successfully removed the duplicate build order from the live database!');
  }
}

fixDuplicateLancasterBO();
