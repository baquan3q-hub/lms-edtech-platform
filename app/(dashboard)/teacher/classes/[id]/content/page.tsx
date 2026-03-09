import { fetchCourseItems } from "@/lib/actions/courseBuilder";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import CourseBuilderClient from "./CourseBuilderClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherCourseContentPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const adminSupabase = createAdminClient();

    // Lấy thông tin lớp
    const { data: classData } = await adminSupabase
        .from('classes')
        .select('name, course:courses(name, description)')
        .eq('id', id)
        .single();

    // Lấy toàn bộ items
    const { data: items, error: itemsError } = await fetchCourseItems(id);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Link
                    href={`/teacher/classes/${id}`}
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại Chi tiết lớp học
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 bg-white px-3 py-1.5 rounded-full border shadow-sm font-medium flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> Lesson Builder (Cấu trúc lồng nhau)
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                        Xây dựng lộ trình bài giảng
                    </h1>
                    <p className="text-indigo-200 text-sm md:text-base max-w-2xl font-medium">
                        Kéo thả để sắp xếp các Chương (Thư mục) và Bài học. Cấu trúc học liệu này sẽ được hiển thị đồng bộ bên tài khoản của học viên. Lớp: <span className="text-white font-bold">{classData?.name}</span>
                    </p>
                </div>

                <div className="p-6 md:p-8 bg-slate-50/50">
                    <CourseBuilderClient classId={id} initialItems={items || []} />
                </div>
            </div>
        </div>
    );
}
