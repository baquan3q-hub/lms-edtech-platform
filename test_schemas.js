require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking public schema:");
    const res1 = await supabase.schema('public').from('announcements').select('id').limit(1);
    console.log("Public schema:", res1.error ? res1.error.message : "Success");

    console.log("Checking default schema:");
    const res2 = await supabase.from('announcements').select('id').limit(1);
    console.log("Default schema:", res2.error ? res2.error.message : "Success");
}
check();
