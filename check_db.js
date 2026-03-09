require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env variables for Supabase.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Starting check for student", "b25677eb-146c-4a4a-a153-44a7bc58a624");

    const { data, error } = await supabase
        .from("enrollments")
        .select(`
            id, class_id, status, enrolled_at,
            class:classes (
                id, name, room, schedule,
                course:courses (name, description),
                teacher:users!classes_teacher_id_fkey (full_name)
            )
        `)
        .eq("student_id", "b25677eb-146c-4a4a-a153-44a7bc58a624")
        .eq("status", "active")
        .order("enrolled_at", { ascending: false });

    console.log('Query result:', JSON.stringify({ data, error }, null, 2));
}

checkData();
