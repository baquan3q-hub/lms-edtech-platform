import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import ResourceBankClient from "./ResourceBankClient";

export default async function TeacherLessonsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Lấy tất cả tài nguyên của giáo viên
    const adminSupabase = createAdminClient();
    const { data: resources } = await adminSupabase
        .from("teacher_resources")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-emerald-600" />
                    Ngân hàng Tài liệu số
                </h2>
                <p className="text-slate-600 mt-2 font-medium">
                    Quản lý, tạo và upload các tài liệu, bài giảng và kiến thức số nhằm cung cấp hoặc giao bài cho học sinh.
                </p>
            </div>

            {/* Client component */}
            <ResourceBankClient initialResources={resources || []} />
        </div>
    );
}
