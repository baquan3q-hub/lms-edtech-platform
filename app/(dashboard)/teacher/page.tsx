import {
    LayoutDashboard,
    BookOpen,
    Users,
    TrendingUp,
    ArrowRight,
    Calendar,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTeacherClasses, fetchTeacherStats } from "./actions";
import { Badge } from "@/components/ui/badge";

export default async function TeacherDashboardPage() {
    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: statsData } = await fetchTeacherStats(user.id);
    const { data: classesData } = await fetchTeacherClasses(user.id);

    const stats = [
        {
            title: "Lớp phụ trách",
            value: statsData?.classesCount?.toString() || "0",
            icon: BookOpen,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100"
        },
        {
            title: "Tổng học sinh",
            value: statsData?.totalStudents?.toString() || "0",
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100"
        },
        {
            title: "Tỷ lệ chuyên cần",
            value: statsData?.attendanceRate || "—",
            icon: TrendingUp,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100"
        },
        {
            title: "Bài tập cần chấm",
            value: statsData?.pendingAssignments?.toString() || "0",
            icon: LayoutDashboard,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100"
        },
    ];

    return (
        <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Tổng quan giảng dạy
                    </h2>
                    <p className="text-slate-600 mt-2 font-medium max-w-2xl">
                        Chào mừng bạn quay lại! Dưới đây là tóm tắt lịch dạy và các lớp học bạn được phân công.
                    </p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all rounded-full px-6">
                    Tạo bài giảng mới
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className={`rounded-2xl border ${stat.border} bg-white p-6 shadow-sm hover:shadow-md transition-shadow group`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">{stat.title}</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Danh sách lớp học */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Lớp học phụ trách</h3>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {!classesData || classesData.length === 0 ? (
                            <div className="p-12 text-center">
                                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Bạn chưa được phân bổ lớp học nào.</p>
                                <p className="text-sm text-gray-400 mt-1">Lớp học sẽ hiển thị tại đây khi Admin phân công cho bạn.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {classesData.map((cls: any) => (
                                    <div key={cls.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900 text-lg">
                                                    {cls.name ? `${cls.name} - ` : ""}{cls.course?.name || "Lớp học ẩn danh"}
                                                </h4>
                                                {cls.status === 'active' && <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs py-0">Đang học</Badge>}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span>{cls.schedule ? JSON.stringify(cls.schedule) : "Chưa xếp lịch"}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span>0 / {cls.max_students} học sinh</span>
                                                </div>
                                                {cls.room && (
                                                    <div className="flex items-center gap-1.5">
                                                        <BookOpen className="w-4 h-4 text-gray-400" />
                                                        <span>Phòng: {cls.room}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                                            Vào lớp học
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Hoạt động gần đây */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Thông báo</h3>

                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 text-center flex flex-col items-center justify-center min-h-[300px]">
                        <p className="text-slate-500 text-sm">Chưa có thông báo mới.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
