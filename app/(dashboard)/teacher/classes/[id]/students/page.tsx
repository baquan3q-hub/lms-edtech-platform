import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import TeacherClassStudentsClient from "./TeacherClassStudentsClient";
import { getClassStudentsWithStats, fetchClassScoreReport } from "@/lib/actions/class-students";

export const dynamic = "force-dynamic";

export default async function TeacherClassStudentsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) redirect("/login");

    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (userData?.role !== "teacher" && userData?.role !== "admin") {
        redirect(`/${userData?.role || "login"}`);
    }

    const adminSupabase = createAdminClient();
    const { data: classData, error: classError } = await adminSupabase
        .from("classes")
        .select("id, name, course_id, status")
        .eq("id", id)
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

    const [{ data: studentsData }, { data: reportData }] = await Promise.all([
        getClassStudentsWithStats(id),
        fetchClassScoreReport(id),
    ]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link href={`/teacher/classes/${id}`} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Quản lý Điểm số — Lớp {classData.name}</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Báo cáo toàn diện, xếp hạng, phân tích AI và xuất dữ liệu
                        </p>
                    </div>
                </div>
            </div>

            <TeacherClassStudentsClient
                classId={id}
                className={classData.name}
                students={studentsData || []}
                reportData={reportData}
            />
        </div>
    );
}

