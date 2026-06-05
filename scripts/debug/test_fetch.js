require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: item, error } = await supabase
        .from("course_items")
        .select(`
            *,
            content:item_contents(*)
        `)
        .neq("type", "folder")
        .limit(1)
        .single();

    console.log("Error:", error);
    console.log("Returned item:", JSON.stringify(item, null, 2));
}
main();
