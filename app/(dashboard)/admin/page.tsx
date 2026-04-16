import {
    Users,
    BookOpen,
    School,
    LayoutDashboard,
    MousePointer2
} from "lucide-react";
import AdminAttendanceTodayClient from "./AdminAttendanceTodayClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDailyAttendanceData, fetchGradesDistribution, fetchSubmissionStatus, fetchDailyActiveUsers, fetchMonthlyRevenueData } from "./analytics-actions";
import { AdminAnalyticsCharts } from "./AdminAnalyticsCharts";
import { AdminTimeFilter } from "./AdminTimeFilter";
import { AdminRevenueChart } from "./AdminRevenueChart";
import { AdminAiInsights } from "./AdminAiInsights";
import { fetchSystemBehaviorAnalytics } from "@/lib/actions/behavior-analysis";
import BehaviorAnalyticsWidget from "@/components/admin/BehaviorAnalyticsWidget";

export const revalidate = 0; // Đảm bảo luôn fetch data mới (Realtime)

interface PageProps {
    searchParams: {
        range?: string;
    };
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
    const supabase = createAdminClient();
    const range = searchParams?.range || 'all';

    // Lấy dữ liệu thật từ database (Overviews)
    const [
        { count: totalUsers },
        { count: totalCourses },
        { count: activeClasses }
    ] = await Promise.all([
        supabase.from("users").select("*", { count: 'exact', head: true }),
        supabase.from("courses").select("*", { count: 'exact', head: true }),
        supabase.from("classes").select("*", { count: 'exact', head: true }).eq('status', 'active')
    ]);

    // Fetch dữ liệu cho Charts (Có tính timeRange filter)
    const [attendanceData, gradesData, submissionData, activeUsersToday, revenueData, behaviorAnalytics] = await Promise.all([
        fetchDailyAttendanceData(range),
        fetchGradesDistribution(range),
        fetchSubmissionStatus(range),
        fetchDailyActiveUsers(),
        fetchMonthlyRevenueData(),
        fetchSystemBehaviorAnalytics()
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
            title: "Khóa học hiện có",
            value: totalCourses || 0,
            icon: BookOpen,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100"
        },
        {
            title: "Lớp học hoạt động",
            value: activeClasses || 0,
            icon: School,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100"
        },
        {
            title: "Truy cập hôm nay",
            value: activeUsersToday || 0,
            icon: MousePointer2,
            color: "text-violet-600",
            bg: "bg-violet-50",
            border: "border-violet-100"
        },
    ];

    return (
        <div className="space-y-10 pb-12 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            {/* Header - Phong cách Minimalist */}
            <div className="flex items-center justify-between gap-6 pb-2 border-b border-gray-100">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold mb-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Bảng điều khiển
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                        Tổng quan hệ thống
                    </h1>
                    <p className="text-gray-500 text-base font-medium max-w-2xl mb-4">
                        Dữ liệu được đồng bộ trực tiếp (Realtime) từ cơ sở dữ liệu nền tảng.
                    </p>
                </div>
                {/* Bộ lọc thời gian */}
                <div className="mb-4">
                    <AdminTimeFilter />
                </div>
            </div>

            {/* Stats Grid - Minimalist but with soul (Rounded corners, subtle status colors) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className={`bg-white rounded-3xl border ${stat.border} p-6 flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} strokeWidth={2} />
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-4xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                            <p className="text-gray-500 text-sm mt-1 font-semibold hover:text-black transition-colors">{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 1. Tài chính Học phí */}
            <AdminRevenueChart 
                chartData={revenueData.chartData} 
                summary={revenueData.summary} 
            />

            {/* 2. Biểu đồ phân tích (Phổ điểm, Nộp bài, Chuyên cần) */}
            <AdminAnalyticsCharts 
                attendanceData={attendanceData} 
                gradesData={gradesData} 
                submissionData={submissionData} 
            />

            {/* 3. Điểm danh Hôm nay */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Trạng thái điểm danh (Hôm nay)</h2>
                    <p className="text-gray-500 text-sm mt-1">Quan sát hoạt động điểm danh của toàn bộ các lớp đang mở</p>
                </div>
                
                <div className="rounded-2xl overflow-hidden border border-gray-100">
                    <AdminAttendanceTodayClient />
                </div>
            </div>

            {/* 4. AI Advisor Insight */}
            <AdminAiInsights 
                attendanceData={attendanceData} 
                gradesData={gradesData} 
                submissionData={submissionData} 
            />

            {/* 5. Giám sát Hành vi Học sinh (Đã được chuyển hướng sang phục vụ Exams) */}
            <h2 className="text-xl font-bold text-gray-900 tracking-tight mt-10 mb-4">Tổng quan Hành vi Học tập (AI Tracking)</h2>
            <BehaviorAnalyticsWidget data={behaviorAnalytics} />
            
        </div>
    );
}

