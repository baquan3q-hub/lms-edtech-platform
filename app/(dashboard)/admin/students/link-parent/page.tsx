import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLinkParentClient from "./AdminLinkParentClient";
import ImportParentStudentDialog from "./ImportParentStudentDialog";

export const dynamic = "force-dynamic";

export default async function AdminLinkParentPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const adminSupabase = createAdminClient();
    const { data: userData } = await adminSupabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (userData?.role !== "admin") redirect("/login");

    // Fetch students
    const { data: students } = await adminSupabase
        .from("users")
        .select("id, full_name, email, avatar_url, invite_code, invite_code_expires_at")
        .eq("role", "student")
        .order("full_name", { ascending: true });

    // Fetch all links
    const { data: links } = await adminSupabase
        .from("parent_students")
        .select("id, parent_id, student_id, relationship, is_primary, created_at");

    // Fetch enrollments for classes info
    const studentIds = (students || []).map(s => s.id);
    let enrollmentMap: Record<string, string[]> = {};
    if (studentIds.length > 0) {
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id, class:classes(name)")
            .in("student_id", studentIds);
        if (enrollments) {
            enrollments.forEach((e: any) => {
                if (!enrollmentMap[e.student_id]) enrollmentMap[e.student_id] = [];
                if (e.class?.name) enrollmentMap[e.student_id].push(e.class.name);
            });
        }
    }

    const enrichedStudents = (students || []).map(s => ({
        ...s,
        full_name: s.full_name || "",
        email: s.email || "",
        classes: enrollmentMap[s.id] || [],
        parentCount: (links || []).filter(l => l.student_id === s.id).length,
    }));

    // Fetch all classes and courses for filters
    const { data: allClasses } = await adminSupabase
        .from("classes")
        .select("id, name, course_id, course:courses(name)")
        .order("name", { ascending: true });

    const { data: allCourses } = await adminSupabase
        .from("courses")
        .select("id, name")
        .order("name", { ascending: true });

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">👨‍👩‍👧 Liên kết Phụ huynh - Học sinh</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Quản lý liên kết giữa phụ huynh và học sinh. Tạo mã liên kết hoặc ghép thủ công.
                    </p>
                </div>
                <ImportParentStudentDialog />
            </div>
            <AdminLinkParentClient
                students={enrichedStudents as any}
                classes={(allClasses || []) as any}
                courses={allCourses || []}
            />
        </div>
    );
}
