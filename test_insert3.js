require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: annData, error } = await supabase.from('announcements').select('*').limit(1);
    console.log("Check existence:", error || "Exists! Fetched " + annData.length);
}
check();
