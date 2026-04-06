const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('name', 'K01.02');
    
    if (!classes || classes.length === 0) return;
    const cid = classes[0].id;
    console.log("CID:", cid);

    // Call the same logic that syncAllClassesSessions does by doing a fetch to the API
    // Wait, the API sync-class-sessions needs the dev server
    // I can just fetch it:
    const res = await fetch('http://localhost:3000/api/crontab/sync-class-sessions', {
        method: 'POST'
    });
    const result = await res.json();
    console.log("Result:", result);
}

main().catch(console.error);
