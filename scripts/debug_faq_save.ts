import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFAQSave() {
    console.log("Starting FAQ Save Debug...");

    try {
        // 1. Test Intro Upsert
        console.log("Testing Intro Upsert...");
        const { error: introError } = await supabase.from('faq_settings').upsert({
            id: 'intro',
            title: "Test Title " + new Date().toISOString(),
            content: "Test Content"
        });
        if (introError) throw new Error(`Intro Upsert failed: ${introError.message} (${introError.code})`);
        console.log("✅ Intro Upsert success.");

        // 2. Test Deletes (from FAQPage.tsx lines 205-206)
        console.log("Testing Deletes...");
        const { error: itemsDelError } = await supabase.from('faq_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (itemsDelError) console.warn(`Item Delete Warning: ${itemsDelError.message}`);
        
        const { error: sectionsDelError } = await supabase.from('faq_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (sectionsDelError) console.warn(`Section Delete Warning: ${sectionsDelError.message}`);

        // 3. Test Section Insert
        console.log("Testing Section Insert...");
        const { data: newS, error: sErr } = await supabase.from('faq_sections').insert({
            title: "Debug Section",
            icon_name: "Layers",
            display_order: 0
        }).select().single();

        if (sErr) throw new Error(`Section Insert failed: ${sErr.message} (${sErr.code})`);
        console.log(`✅ Section Insert success. ID: ${newS.id}`);

        // 4. Test Item Insert
        console.log("Testing Item Insert...");
        const { error: iErr } = await supabase.from('faq_items').insert({
            section_id: newS.id,
            label: "Debug Item",
            description: "Debug Description",
            icon_name: "Info",
            display_order: 0
        });
        if (iErr) throw new Error(`Item Insert failed: ${iErr.message} (${iErr.code})`);
        console.log("✅ Item Insert success.");

    } catch (err: any) {
        console.error(`❌ DEBUG FAILED: ${err.message}`);
    }
}

debugFAQSave();
