require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: items } = await supabase.from('course_items').select('*').neq('type', 'folder').limit(1);
    if (!items || items.length === 0) return console.log("No items found");
    const testItemId = items[0].id;

    let log = "Using existing item: " + testItemId + "\n";

    const { data: content1 } = await supabase.from('item_contents').select('*').eq('item_id', testItemId).single();
    log += "Before upsert: " + JSON.stringify(content1) + "\n";

    const { error: upsertErr } = await supabase.from('item_contents').upsert(
        { item_id: testItemId, video_url: 'http://test.com/video.mp4' },
        { onConflict: 'item_id' }
    );
    log += "Upsert Error: " + JSON.stringify(upsertErr) + "\n";

    const { data: content2 } = await supabase.from('item_contents').select('*').eq('item_id', testItemId).single();
    log += "After upsert: " + JSON.stringify(content2) + "\n";

    fs.writeFileSync('test_output.txt', log);
    console.log("Done. Check test_output.txt");
}
main();
