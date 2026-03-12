import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ParentProgressClient from "./ParentProgressClient";
import { getStudentProgressStats, getStudentFeedbackList, getStudentCompetencyData } from "@/lib/actions/parent-progress";

export const dynamic = "force-dynamic";

export default async function ParentChildProgressPage({
    searchParams,
}: {
    searchParams: { studentId?: string };
}) {
    // 1. Verify user & role
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        redirect("/login");
    }

    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (userData?.role !== "parent" && userData?.role !== "admin") {
        redirect(`/${userData?.role || "login"}`);
    }

    // 2. Fetch all linked children
    const adminSupabase = createAdminClient();
    const { data: parentLinks } = await adminSupabase
        .from("parent_students")
        .select(`
            student_id,
            student:users!student_id(full_name, avatar_url)
        `)
        .eq("parent_id", user.id);

    if (!parentLinks || parentLinks.length === 0) {
        return (
            <div className="p-6">
                <div className="bg-amber-50 text-amber-700 p-4 rounded-lg flex items-center justify-center">
                    Tài khoản của bạn chưa được liên kết với học sinh nào.
                </div>
            </div>
        );
    }

    // Build the students list
    const students = parentLinks.map((link) => {
        const studentObj = Array.isArray(link.student) ? link.student[0] : link.student;
        return {
            id: link.student_id,
            name: studentObj?.full_name || "Học sinh",
            avatar_url: studentObj?.avatar_url
        };
    });

    // 3. Determine active student parameter
    const activeStudentId = searchParams.studentId && students.find(s => s.id === searchParams.studentId)
        ? searchParams.studentId
        : students[0].id;

    const activeStudent = students.find(s => s.id === activeStudentId)!;

    // 4. Fetch progress stats for active student
    const [progressRes, feedbackRes, competencyRes] = await Promise.all([
        getStudentProgressStats(activeStudentId),
        getStudentFeedbackList(activeStudentId),
        getStudentCompetencyData(activeStudentId),
    ]);

    const progressData = progressRes?.data;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Điểm số & Tiến độ</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Theo dõi kết quả học tập và chuyên cần của con tại các lớp học
                    </p>
                </div>
            </div>

            <ParentProgressClient
                students={students}
                activeStudentId={activeStudentId}
                activeStudentName={activeStudent.name}
                stats={progressData?.stats || []}
                history={progressData?.history || []}
                feedbackList={feedbackRes?.data || []}
                competencyData={competencyRes?.data || null}
            />
        </div>
    );
}
