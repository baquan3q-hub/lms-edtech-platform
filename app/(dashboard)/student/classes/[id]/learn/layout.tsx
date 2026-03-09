import { fetchCourseItems } from "@/lib/actions/courseBuilder";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CourseTreeClient from "./CourseTreeClient";

export default async function StudentLearnLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = await params;
    const { id: classId } = resolvedParams;

    const supabase = createAdminClient();

    // 1. Lấy thông tin lớp
    const { data: classData } = await supabase
        .from("classes")
        .select("name, course:courses(name)")
        .eq("id", classId)
        .single();

    const classInfo = classData as any;

    if (!classInfo) redirect("/student/classes");

    // 2. Lấy toàn bộ cây học liệu (chỉ lấy các item được publish, hoặc lấy hết và filter trên client)
    // Tạm thời lấy hết (có is_published = true)
    const { data: items, error } = await supabase
        .from("course_items")
        .select("*")
        .eq("class_id", classId)
        .eq("is_published", true)
        .order("order_index", { ascending: true });

    // 3. Lấy tiến trình học (Student Progress) của user hiện tại
    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();

    let progressMap: Record<string, any> = {};
    if (user && items && items.length > 0) {
        const itemIds = items.map((i: any) => i.id);

        // Cắt chunk itemIds nếu quá dài (tối đa ~100) để không lỗi URL quá dài
        // Tuy nhiên Supabase PostgREST hỗ trợ body cho queries dài nếu cần
        const { data: progressList } = await supabase
            .from('student_progress')
            .select('*')
            .eq('student_id', user.id)
            .in('item_id', itemIds);

        if (progressList) {
            progressList.forEach((p: any) => {
                progressMap[p.item_id] = p;
            });
        }
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-slate-50">
            {/* SIDEBAR TREE */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <Link
                        href={`/student/classes/${classId}`}
                        className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Thoát Bài học
                    </Link>
                    <h2 className="font-bold text-slate-900 line-clamp-2">{classInfo?.name}</h2>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">Khóa: {classInfo?.course?.name}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <CourseTreeClient items={items || []} classId={classId} progressData={progressMap} />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto relative">
                {children}
            </div>
        </div>
    );
}
