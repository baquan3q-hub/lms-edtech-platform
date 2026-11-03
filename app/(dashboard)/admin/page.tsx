import {
    Users,
    BookOpen,
    School,
    LayoutDashboard,
    MousePointer2,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { 
    fetchDailyActiveUsers,
    fetchDailyStudentPresenceAndAttendance,
    fetchHomeworkCompletionByGradeAndClass,
    fetchGradeOverviewByGradeAndClass,
    fetchDailyAttendanceData,
    fetchGradesDistribution,
    fetchSubmissionStatus
} from "./analytics-actions";
import { AdminTimeFilter } from "./AdminTimeFilter";
import { AdminAiInsights } from "./AdminAiInsights";
import DailyStudentPresenceWidget from "@/components/admin/DailyStudentPresenceWidget";
import HomeworkCompletionByGradeWidget from "@/components/admin/HomeworkCompletionByGradeWidget";
import GradeOverviewByGradeWidget from "@/components/admin/GradeOverviewByGradeWidget";
import { Suspense } from "react";

export const revalidate = 0; // Đảm bảo luôn fetch data mới (Realtime)

interface PageProps {
    searchParams: Promise<{
        range?: string;
    }>;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
    const supabase = createAdminClient();
    const resolvedSearchParams = await searchParams;
    const range = resolvedSearchParams?.range || 'all';

    // Tải song song tất cả các dữ liệu cần thiết cho bảng điều khiển vận hành
    const [
        { count: totalUsers },
        { count: totalCourses },
        { count: activeClasses },
        dailyPresenceData,
        homeworkGradeData,
        gradeOverviewData,
        attendanceData,
        gradesData,
        submissionData,
    ] = await Promise.all([
        supabase.from("users").select("*", { count: 'exact', head: true }),
        supabase.from("courses").select("*", { count: 'exact', head: true }),
        supabase.from("classes").select("*", { count: 'exact', head: true }).eq('status', 'active'),
        fetchDailyStudentPresenceAndAttendance(),
        fetchHomeworkCompletionByGradeAndClass(),
        fetchGradeOverviewByGradeAndClass(),
        fetchDailyAttendanceData(range),
        fetchGradesDistribution(range),
        fetchSubmissionStatus(range),
    ]);

    const stats = [
        {
            title: "Tổng người dùng",
            value: totalUsers || 0,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100"
        },
        {
            title: "Khối & Chương trình",
            value: totalCourses || 0,
            icon: BookOpen,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100"
        },
        {
            title: "Lớp học đang mở",
            value: activeClasses || 0,
            icon: School,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100"
        },
    ];

    return (
        <div className="space-y-8 pb-14 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            {/* 1. Header Bảng điều khiển */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Hệ Thống Vận Hành Trường Học & LMS</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Tổng Quan Vận Hành Hằng Ngày
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium max-w-2xl">
                        Giám sát chuyên cần, mốc giờ điểm danh, thời gian truy cập LMS và trực quan hóa tiến độ học vụ toàn trường.
                    </p>
                </div>
                {/* Bộ lọc thời gian */}
                <div className="self-start sm:self-auto">
                    <AdminTimeFilter />
                </div>
            </div>

            {/* 2. Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className={`bg-white rounded-3xl border ${stat.border} p-5 flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-11 h-11 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={2} />
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                            <p className="text-gray-500 text-xs mt-1 font-semibold">{stat.title}</p>
                        </div>
                    </div>
                ))}
                <Suspense fallback={<ActiveUsersCard value="…" />}>
                    <ActiveUsersToday />
                </Suspense>
            </div>

            {/* 3. Hoạt Động & Điểm Danh Học Sinh Kèm Mốc Giờ Ra/Vào LMS */}
            <DailyStudentPresenceWidget initialData={dailyPresenceData} />

            {/* 4. Trực Quan Hóa Tiến Độ Bài Tập Theo Khối & Lớp (Dạng Biểu Đồ & Bảng) */}
            <HomeworkCompletionByGradeWidget initialData={homeworkGradeData} />

            {/* 5. Trực Quan Hóa Phổ Điểm Theo Khối & Lớp (Dạng Biểu Đồ & Bảng) */}
            <GradeOverviewByGradeWidget initialData={gradeOverviewData} />

            {/* 6. Khuyến nghị Chiến lược AI Tổng thể */}
            <AdminAiInsights 
                attendanceData={attendanceData} 
                gradesData={gradesData} 
                submissionData={submissionData} 
            />
        </div>
    );
}

async function ActiveUsersToday() {
    const count = await fetchDailyActiveUsers();
    return <ActiveUsersCard value={count} />;
}

function ActiveUsersCard({ value }: { value: number | string }) {
    return (
        <div className="bg-white rounded-3xl border border-sky-100 p-5 flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center">
                    <MousePointer2 className="w-5 h-5 text-sky-600" strokeWidth={2} />
                </div>
            </div>
            <div>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
                <p className="text-gray-500 text-xs mt-1 font-semibold">Đăng nhập hôm nay</p>
            </div>
        </div>
    );
}
