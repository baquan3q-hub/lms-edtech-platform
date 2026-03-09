require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    // get a parent student
    const { data: enrollments } = await supabase.from('enrollments').select('student_id, class_id').limit(1);
    if (!enrollments || enrollments.length === 0) {
        console.log("No enrollments found");
        return;
    }
    const studentId = enrollments[0].student_id;
    const classId = enrollments[0].class_id;

    console.log("Testing with student:", studentId, "class:", classId);

    const { data, error } = await supabase
        .from("class_sessions")
        .select("id, class_id, session_date, start_time, end_time, topic, status, class:classes!class_id(name, course:courses(name), teacher:users!classes_teacher_id_fkey(full_name))")
        .in("class_id", [classId])
        .order("session_date", { ascending: false })
        .limit(10);

    console.log("Error:", error);
    console.log("Data:", data);
}

test();
