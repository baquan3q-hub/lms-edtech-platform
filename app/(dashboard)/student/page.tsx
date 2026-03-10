import {
    BookOpen,
    Clock,
    Trophy,
    Target,
    ArrowRight,
    PlayCircle,
    Sparkles,
    Video,
    CheckSquare,
    FileText,
    Music,
    Zap,
    TrendingUp,
    CalendarDays,
    MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchStudentEnrolledClasses, fetchStudentDashboardStats, fetchSuggestedLessons } from "@/lib/actions/student";
import { getOwnStudentSchedule } from "@/lib/actions/schedule";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import UpcomingSessionsWidget from "@/components/shared/UpcomingSessionsWidget";

// Color scheme cho các loại bài
const typeMeta: Record<string, { icon: any; label: string; color: string; bg: string }> = {
    video: { icon: Video, label: "Video", color: "text-rose-500", bg: "bg-rose-50" },
    document: { icon: FileText, label: "Tài liệu", color: "text-emerald-500", bg: "bg-emerald-50" },
    quiz: { icon: CheckSquare, label: "Trắc nghiệm", color: "text-indigo-500", bg: "bg-indigo-50" },
    audio: { icon: Music, label: "Audio", color: "text-amber-500", bg: "bg-amber-50" },
    assignment: { icon: FileText, label: "Bài tập", color: "text-orange-500", bg: "bg-orange-50" },
};

const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export default async function StudentDashboardPage() {
    const [
        { data: myClasses },
        { data: statsData },
        { data: suggestions },
        { data: upcomingSessions }
    ] = await Promise.all([
        fetchStudentEnrolledClasses(),
        fetchStudentDashboardStats(),
        fetchSuggestedLessons(),
        getOwnStudentSchedule()
    ]);

    const dynamicStats = [
        {
            title: "Khóa học đang học",
            value: statsData?.enrolledCount?.toString() || "0",
            icon: BookOpen,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            title: "Bài đã hoàn thành",
            value: (statsData?.completedCount || 0).toString(),
            icon: Target,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20"
        },
        {
            title: "Bài kiểm tra đã làm",
            value: (statsData?.assignmentsCount || 0).toString(),
            icon: CheckSquare,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20"
        },
        {
            title: "Điểm trung bình",
            value: statsData?.averageScore?.toString() || "—",
            icon: Trophy,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        }
    ];

    return (
        <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Chào mừng trở lại! 👋
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium max-w-2xl">
                        Tiếp tục hành trình học tập của bạn. Dưới đây là tổng quan tiến độ và gợi ý bài học tiếp theo.
                    </p>
                </div>
                {suggestions && suggestions.length > 0 && (
                    <Link href={`/student/classes/${suggestions[0].classId}/learn/${suggestions[0].nextItem.id}`}>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all rounded-full px-6">
                            Tiếp tục học ngay
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dynamicStats.map((stat) => (
                    <div
                        key={stat.title}
                        className={`rounded-2xl border ${stat.border} bg-white p-6 shadow-sm hover:shadow-md transition-shadow group`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* ===== GỢI Ý HỌC TẬP ===== */}
            {suggestions && suggestions.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <h3 className="text-xl font-bold text-slate-900">Gợi ý Học tập</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestions.map((s: any) => {
                            const meta = typeMeta[s.nextItem.type] || typeMeta.document;
                            const IconComp = meta.icon;
                            return (
                                <div key={s.classId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                                    {/* Progress header */}
                                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.courseName}</p>
                                            <p className="text-sm font-semibold text-slate-800">Lớp: {s.className}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-indigo-600">{s.progressPercent}%</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{s.completedItems}/{s.totalItems} bài</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="px-5 pt-3">
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${s.progressPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Suggested item */}
                                    <div className="p-5 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                                            <IconComp className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> Bài tiếp theo
                                            </p>
                                            <p className="text-sm font-bold text-slate-800 truncate">{s.nextItem.title}</p>
                                            <span className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                                        </div>
                                        <Link href={`/student/classes/${s.classId}/learn/${s.nextItem.id}`}>
                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 h-9 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                                                <PlayCircle className="w-4 h-4 mr-1" /> Học
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Recent Courses */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" /> Khóa học của tôi
                        </h3>
                        <Link href="/student/classes">
                            <Button variant="link" className="text-indigo-600 font-semibold p-0">
                                Xem tất cả
                            </Button>
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {myClasses && myClasses.length > 0 ? (
                            myClasses.map((enrollment: any) => {
                                const cls = enrollment.class;
                                // Tìm suggestion cho class này để lấy tiến độ thực
                                const suggestion = suggestions?.find((s: any) => s.classId === cls.id);
                                const progressPercent = suggestion?.progressPercent || 0;
                                const completedItems = suggestion?.completedItems || 0;
                                const totalItems = suggestion?.totalItems || 0;

                                return (
                                    <Link href={`/student/classes/${cls.id}`} key={enrollment.id} className="block">
                                        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                            <div className="w-full sm:w-32 h-32 sm:h-24 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shrink-0 flex items-center justify-center shadow-inner">
                                                <PlayCircle className="w-10 h-10 text-white/80 group-hover:text-white transition-colors" />
                                            </div>

                                            <div className="flex-1 w-full">
                                                <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {cls.course?.name || "Khóa học"}
                                                </h4>
                                                <p className="text-sm text-slate-500 mt-1 mb-4">
                                                    Lớp: <span className="font-medium text-slate-700">{cls.name || "Ẩn danh"}</span>
                                                    {cls.teacher?.full_name && (
                                                        <span className="ml-2 text-slate-400">• GV: {cls.teacher.full_name}</span>
                                                    )}
                                                </p>

                                                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-700"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between">
                                                    <p className="text-xs text-slate-500">
                                                        {completedItems}/{totalItems} bài hoàn thành
                                                    </p>
                                                    <p className="text-xs font-bold text-indigo-600">
                                                        {progressPercent}%
                                                    </p>
                                                </div>

                                                {/* Hiển thị thời khóa biểu (Tương tự như trong lớp học) */}
                                                {(cls.class_schedules && cls.class_schedules.length > 0) && (
                                                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                                        {cls.class_schedules.sort((a: any, b: any) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)).map((schedule: any) => (
                                                            <div key={schedule.id} className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs hover:border-emerald-200 transition-colors">
                                                                <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                                                                    <CalendarDays className="w-3.5 h-3.5" />
                                                                    {dayNames[schedule.day_of_week]}
                                                                </div>
                                                                <div className="text-slate-600 flex items-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {schedule.start_time?.slice(0, 5)} — {schedule.end_time?.slice(0, 5)}
                                                                </div>
                                                                {(schedule.room as any)?.name && (
                                                                    <div className="text-slate-500 flex items-center gap-1.5">
                                                                        <MapPin className="w-3.5 h-3.5" />
                                                                        {(schedule.room as any).name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Bạn chưa ghi danh vào lớp học nào.</p>
                                <p className="text-sm text-slate-400 mt-1">Hãy liên hệ giáo viên để được thêm vào lớp.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Quick Info */}
                <div className="space-y-6">
                    {/* Upcoming Sessions Widget */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden mb-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-bold text-slate-800">Lịch học sắp tới</h3>
                            </div>
                            <Link href="/student/schedule">
                                <Button variant="link" className="text-indigo-600 font-semibold p-0 h-auto text-sm">
                                    Xem tất cả
                                </Button>
                            </Link>
                        </div>
                        <UpcomingSessionsWidget sessions={upcomingSessions || []} limit={2} />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900">Thông tin nhanh</h3>

                    {/* Motivation Card */}
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group hover:shadow-indigo-500/30 transition-shadow">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
                        <Sparkles className="w-8 h-8 text-yellow-300 mb-3" />
                        <h4 className="font-bold text-lg mb-2 relative z-10">Tiếp tục phát huy! 🔥</h4>
                        <p className="text-indigo-100 text-sm mb-4 relative z-10">
                            {statsData?.completedCount && statsData.completedCount > 0
                                ? `Bạn đã hoàn thành ${statsData.completedCount} bài học. Hãy tiếp tục!`
                                : "Hãy bắt đầu bài học đầu tiên để xây dựng thói quen học tập."
                            }
                        </p>
                        {suggestions && suggestions.length > 0 && (
                            <Link href={`/student/classes/${suggestions[0].classId}/learn/${suggestions[0].nextItem.id}`}>
                                <Button className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-bold relative z-10">
                                    <PlayCircle className="w-4 h-4 mr-2" /> Học bài tiếp theo
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Contact Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="font-bold text-slate-900 mb-2">Bạn cần hỗ trợ?</h4>
                        <p className="text-sm text-slate-500 mb-4">
                            Giáo viên sẵn sàng giải đáp thắc mắc của bạn bất cứ lúc nào.
                        </p>
                        <Button variant="outline" className="w-full text-indigo-600 border-indigo-200 font-semibold">
                            Liên hệ Giáo viên
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
