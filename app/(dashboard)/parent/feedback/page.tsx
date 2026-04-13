import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ParentFeedbackClient from "./ParentFeedbackClient";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ParentFeedbackPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const adminSupabase = createAdminClient();

    // Lấy danh sách con và các lớp học của con để có thể chọn giáo viên
    const { data: childrenData } = await adminSupabase
        .from("parent_students")
        .select("student_id, student:users!parent_students_student_id_fkey(id, full_name)")
        .eq("parent_id", user.id);

    const children = childrenData?.map((c: any) => c.student) || [];
    
    // Lấy thông tin lớp học và giáo viên của các con
    let classesWithTeachers: any[] = [];
    if (children.length > 0) {
        const studentIds = children.map((c: any) => c.id);
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id, class_id, class:classes(id, name, teacher:users!classes_teacher_id_fkey(id, full_name))")
            .in("student_id", studentIds);
            
        classesWithTeachers = enrollments || [];
    }

    return <ParentFeedbackClient childrenList={children} enrollments={classesWithTeachers} />;
}
