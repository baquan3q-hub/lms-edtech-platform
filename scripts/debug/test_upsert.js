require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. insert a course item
    const { data: item, error: err1 } = await supabase.from('course_items').insert({
        class_id: '1fb9fb75-b6d8-4f11-9a4c-811c76addcd7', // we need a valid class id... 
        title: 'Test',
        type: 'video'
    }).select().single();

    if (err1) {
        console.log("Error inserting course_item:", err1.message);
        // let's just query an existing leaf node
        const { data: items } = await supabase.from('course_items').select('*').neq('type', 'folder').limit(1);
        if (!items || items.length === 0) return console.log("No items found");
        const testItemId = items[0].id;
        console.log("Using existing item:", testItemId);

        // Check its content
        const { data: content1 } = await supabase.from('item_contents').select('*').eq('item_id', testItemId).single();
        console.log("Before upsert:", content1);

        // upsert
        console.log("Upserting video_url...");
        const { error: upsertErr } = await supabase.from('item_contents').upsert(
            { item_id: testItemId, video_url: 'http://test.com/video.mp4' },
            { onConflict: 'item_id' }
        );
        console.log("Upsert Error:", upsertErr);

        // check again
        const { data: content2 } = await supabase.from('item_contents').select('*').eq('item_id', testItemId).single();
        console.log("After upsert:", content2);
        return;
    }
}
main();
