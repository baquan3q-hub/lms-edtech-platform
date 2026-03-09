import { ArrowLeft, BookOpen, Users } from "lucide-react";
import Link from "next/link";
import { fetchClassEnrollments, fetchAvailableStudents } from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";
import StudentsClient from "./StudentsClient";
import ImportStudentsDialog from "@/components/admin/ImportStudentsDialog";
import { Badge } from "@/components/ui/badge";

// Function to fetch class detail directly here for header info
async function fetchClassInfo(classId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("classes")
        .select(`
            *,
            course:courses(name, description)
        `)
        .eq("id", classId)
        .single();
    return data;
}

export default async function AdminClassStudentsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const [classInfo, { data: enrollments }, { data: availableStudents }] = await Promise.all([
        fetchClassInfo(id),
        fetchClassEnrollments(id),
        fetchAvailableStudents(id)
    ]);

    if (!classInfo) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p className="font-medium text-lg">Không thể tải thông tin lớp học.</p>
                <Link href="/admin/classes" className="text-indigo-600 underline mt-4 inline-block">Quay lại danh sách</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Back Navigation */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/admin/classes"
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại danh sách lớp học
                </Link>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                                Quản lý Học viên: {classInfo.name ? `${classInfo.name} - ` : ""}{classInfo.course?.name || "Lớp học ẩn danh"}
                            </h2>
                            <Badge variant="outline" className={`text-xs py-0.5 ${classInfo.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-600'}`}>
                                {classInfo.status === 'active' ? 'Đang hoạt động' : 'Kết thúc'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-slate-600 font-medium">Bạn có thể thêm mới hoặc xóa học sinh khỏi lớp này tại đây.</p>
                            <ImportStudentsDialog classId={id} />
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm text-slate-600 bg-slate-50 py-3 px-5 rounded-xl">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            <span className="font-semibold text-slate-900">{classInfo.room || "Chưa xếp phòng"}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <span className="font-semibold text-slate-900">{enrollments?.length || 0} / {classInfo.max_students} học sinh</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Client View */}
            <StudentsClient
                classId={id}
                enrollments={(enrollments || []).map((e: any) => ({
                    ...e,
                    student: Array.isArray(e.student) ? e.student[0] : e.student
                }))}
                availableStudents={availableStudents || []}
            />
        </div>
    );
}
