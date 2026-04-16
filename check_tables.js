require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // try to fetch from announcements
    const { data: aData, error: aErr } = await supabase.from('announcements').select('id, class_id').limit(1);
    console.log("Fetching announcements:", aErr ? aErr.message : "Success, got rows: " + aData.length);
}
check();
