const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    // Find student user
    const { data: student } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .ilike('email', '%student%')
        .limit(5);
    
    console.log('=== STUDENT USERS ===');
    console.log(JSON.stringify(student, null, 2));

    if (!student || student.length === 0) return;

    // Check submissions for first student
    const studentId = student[0].id;
    console.log(`\nChecking submissions for: ${student[0].full_name} (${studentId})`);

    const { data: examSubs } = await supabase
        .from('exam_submissions')
        .select('exam_id, score, total_points')
        .eq('student_id', studentId);
    
    console.log(`\nExam submissions: ${examSubs?.length || 0}`);
    console.log(JSON.stringify(examSubs, null, 2));

    const { data: hwSubs } = await supabase
        .from('homework_submissions')
        .select('homework_id, score, status')
        .eq('student_id', studentId);
    
    console.log(`\nHomework submissions: ${hwSubs?.length || 0}`);
    console.log(JSON.stringify(hwSubs, null, 2));

    // Check enrollments
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id, status')
        .eq('student_id', studentId)
        .eq('status', 'active');
    
    console.log(`\nActive enrollments: ${enrollments?.length || 0}`);
    console.log(JSON.stringify(enrollments, null, 2));

    // Check exams in those classes
    if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map(e => e.class_id);
        const { data: exams } = await supabase
            .from('exams')
            .select('id, title')
            .in('class_id', classIds)
            .eq('is_published', true);
        
        console.log(`\nExams in enrolled classes: ${exams?.length || 0}`);
        exams?.forEach(e => {
            const sub = examSubs?.find(s => s.exam_id === e.id);
            console.log(`  ${e.title} (${e.id}) => ${sub ? `DONE ✅ score=${sub.score}/${sub.total_points}` : 'PENDING ❌'}`);
        });
    }
}

test().catch(console.error);
