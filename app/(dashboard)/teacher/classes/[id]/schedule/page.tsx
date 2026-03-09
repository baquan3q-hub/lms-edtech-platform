import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeacherClassScheduleClient from "./TeacherClassScheduleClient";
import { getClassSessions } from "@/lib/actions/class-sessions";

export const dynamic = "force-dynamic";

export default async function TeacherClassSchedulePage({
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

    if (userData?.role !== "teacher" && userData?.role !== "admin") {
        redirect(`/${userData?.role || "login"}`);
    }

    // 2. Fetch class data to ensure it exists and teacher has access
    const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name, course_id, status")
        .eq("id", params.id)
        .single();

    if (classError || !classData) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                    Không tìm thấy lớp học hoặc bạn không có quyền truy cập.
                </div>
            </div>
        );
    }

    // 3. Fetch initial class sessions
    const { data: initialSessions } = await getClassSessions(params.id);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lịch Dạy - Lớp {classData.name}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Quản lý nội dung và lịch trình của từng buổi học
                    </p>
                </div>
            </div>

            <TeacherClassScheduleClient
                classId={params.id}
                initialSessions={initialSessions || []}
            />
        </div>
    );
}
