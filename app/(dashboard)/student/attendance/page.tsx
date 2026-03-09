import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AttendanceHistory from "@/components/student/AttendanceHistory";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function StudentAttendancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link
                href="/student"
                className="flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors w-fit"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại Dashboard
            </Link>

            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 rounded-2xl text-white">
                <h2 className="text-2xl font-extrabold">📅 Lịch sử Điểm danh</h2>
                <p className="text-slate-300 text-sm mt-1">Xem tình trạng chuyên cần của bạn</p>
            </div>

            <AttendanceHistory studentId={user.id} />
        </div>
    );
}
