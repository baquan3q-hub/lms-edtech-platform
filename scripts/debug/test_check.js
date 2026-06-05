require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: aData, error: aErr } = await supabase.from('table_that_does_not_exist').select('*').limit(1);
    console.log("Error:", aErr);
    
    // Also explicitly list out what was seen inside `data` for announcements
    const { data: annData } = await supabase.from('announcements').select('*').limit(1);
    console.log("Announcements columns:", annData ? Object.keys(annData[0]) : "no data");
}
check();
