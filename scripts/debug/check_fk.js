require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const insertData = {
        title: "Test System Announcement FK",
        content: "Test output",
        scope: "system",
        created_by_role: "admin",
        teacher_id: "c1b33936-5b63-4304-9e9e-05d2e79b372c",
        class_id: "00000000-0000-0000-0000-000000000000" // dummy
    };
    const { data, error } = await supabase.from('announcements').insert(insertData).select();
    console.log("Error:", error);
    if (!error) {
        // cleanup
        await supabase.from('announcements').delete().eq('id', data[0].id);
    }
}
check();
