import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ParentProgressClient from "./ParentProgressClient";
import { getStudentProgressStats } from "@/lib/actions/parent-progress";

export const dynamic = "force-dynamic";

export default async function ParentChildProgressPage({
    params,
}: {
    params: { id: string };
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

    // 2. Fetch student details to ensure parent has link
    const adminSupabase = createAdminClient();
    const { data: parentLink } = await adminSupabase
        .from("parent_students")
        .select(`
            student_id,
            student:users!student_id(full_name, avatar_url)
        `)
        .eq("parent_id", user.id)
        .eq("student_id", params.id)
        .single();

    if (!parentLink) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                    Không tìm thấy thông tin học sinh hoặc bạn không có quyền truy cập.
                </div>
            </div>
        );
    }

    // 3. Fetch progress stats
    const studentInfo = Array.isArray(parentLink.student) ? parentLink.student[0] : parentLink.student;
    const { data: progressData } = await getStudentProgressStats(params.id);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Điểm số & Tiến độ - {studentInfo.full_name}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Theo dõi kết quả học tập và chuyên cần của con tại các lớp học
                    </p>
                </div>
            </div>

            <ParentProgressClient
                studentId={params.id}
                studentName={studentInfo.full_name}
                stats={progressData?.stats || []}
                history={progressData?.history || []}
            />
        </div>
    );
}
