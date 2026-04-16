const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const insertData = {
        title: "Test System Announcement",
        content: "Test output",
        scope: "system",
        created_by_role: "admin",
        teacher_id: "c1b33936-5b63-4304-9e9e-05d2e79b372c",
        attachments: [],
        video_url: null,
        link_url: null,
        target_roles: ["student", "parent", "teacher", "admin"],
        is_pinned: false,
    };
    
    // We omit course_id and class_id because scope is system
    
    console.log("Inserting...");
    const res = await adminSupabase.from("announcements").insert(insertData).select().single();
    console.log(JSON.stringify(res, null, 2));
}

test();
