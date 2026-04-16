import { createClient } from "@/lib/supabase/server";
import { fetchTeacherClasses } from "../actions";
import TeacherBehaviorClient from "./TeacherBehaviorClient";
import { Activity } from "lucide-react";
import { redirect } from "next/navigation";

export default async function TeacherBehaviorPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Lấy danh sách lớp của giáo viên
    const { data: classesData } = await fetchTeacherClasses(user.id);
    
    // Chỉ lấy các lớp đang active
    const activeClasses = (classesData || []).filter((c: any) => c.status === 'active');

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                        <Activity className="w-8 h-8 text-violet-600" />
                        Hành vi học tập học viên
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Lọc và giám sát rủi ro gian lận, thao tác bất thường trong lúc kiểm tra theo từng lớp.</p>
                </div>
            </div>

            <TeacherBehaviorClient classes={activeClasses} />
        </div>
    );
}
