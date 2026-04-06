const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Get the teacher details (from picture, we know teacher@demo.com or Bùi Anh Quân)
    const { data: teacher, error: tdErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'teacher@demo.com')
        .single();
    
    if (!teacher) {
        console.error("Teacher not found", tdErr);
        return;
    }
    console.log("Teacher ID:", teacher.id);

    // 2. Get active classes
    const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacher.id)
        .eq('status', 'active');
    
    console.log("Teacher active classes:", classes);
    if (!classes || classes.length === 0) return;

    const classIds = classes.map(c => c.id);

    // 3. Get class sessions
    const { data: sessions, error: sessErr } = await supabase
        .from('class_sessions')
        .select('*')
        .in('class_id', classIds);
        
    console.log(`Found ${sessions ? sessions.length : 0} sessions for this teacher`);
    if (sessErr) {
        console.error("Session error:", sessErr);
    }
}

main().catch(console.error);
