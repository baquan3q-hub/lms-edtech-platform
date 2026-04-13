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
    MapPin,
    Bell,
    Star
} from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from "@/components/ui/button";
import { fetchStudentEnrolledClasses, fetchStudentDashboardStats, fetchSuggestedLessons, fetchStudentAnnouncements } from "@/lib/actions/student";
import { getOwnStudentSchedule } from "@/lib/actions/schedule";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import UpcomingSessionsWidget from "@/components/shared/UpcomingSessionsWidget";
import FeedbackSuggestionCard from "@/components/student/FeedbackSuggestionCard";

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
        { data: upcomingSessions },
        { data: announcements }
    ] = await Promise.all([
        fetchStudentEnrolledClasses(),
        fetchStudentDashboardStats(),
        fetchSuggestedLessons(),
        getOwnStudentSchedule(),
        fetchStudentAnnouncements()
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
        <div className="space-y-10 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
            {/* ===== HERO: COLORFUL & YOUTHFUL ===== */}
            <div className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-blue-500/30 relative overflow-hidden text-white flex flex-col md:flex-row md:items-center justify-between gap-8 border-[6px] border-white/30">
                <div className="absolute -top-10 -right-10 w-64 h-64 md:w-96 md:h-96 opacity-90 pointer-events-none md:translate-x-10 md:-translate-y-10">
                    <DotLottieReact
                        src="https://assets3.lottiefiles.com/packages/lf20_w51pcehl.json"
                        loop
                        autoplay
                    />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/25 border border-white/40 text-white text-xs font-bold mb-5 shadow-sm backdrop-blur-sm">
                        <Target className="w-4 h-4 text-yellow-300" />
                        <span>Sẵn sàng chinh phục điểm cao!</span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 drop-shadow-md leading-tight text-white drop-shadow-lg">
                        Have a great day!
                    </h2>
                    <p className="text-blue-50 text-base sm:text-lg font-medium leading-relaxed drop-shadow-sm">
                        Let's do your homework right now!
                    </p>
                </div>
            </div>

            {/* ===== Thống kê (4 cards) ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {dynamicStats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className={`${stat.bg} ${stat.border} border-2 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
                            <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm ${stat.color}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-0.5 tracking-wider">{stat.title}</p>
                                <p className={`text-2xl sm:text-3xl font-black ${stat.color}`}>{stat.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== GỢI Ý HỌC TẬP (Hiển thị tới 4 thẻ) ===== */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Gợi ý học tập & Tác vụ cần làm</h3>
                </div>
                {suggestions && suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestions.slice(0, 4).map((s: any, idx: number) => {
                            const isHomework = s.type === "homework";
                            const isExam = s.type === "exam";
                            
                            const linkHref = isHomework 
                                ? `/student/classes/${s.classId}/homework/${s.nextItem.id}` 
                                : isExam 
                                    ? `/student/classes/${s.classId}/exams/${s.nextItem.id}` 
                                    : `/student/classes/${s.classId}/learn/${s.nextItem.id}`;
                            
                            const isQuiz = s.nextItem.type === "quiz" || isExam;
                            const accentColor = isHomework ? "rose" : isExam ? "purple" : isQuiz ? "violet" : "indigo";
                            return (
                                <Link href={linkHref} key={`${s.classId}-${s.nextItem.id}-${idx}`} className="block">
                                    <div className={`bg-gradient-to-br from-${accentColor}-50 to-white rounded-2xl border-2 border-${accentColor}-100 p-5 hover:border-${accentColor}-400 transition-all duration-300 group h-full flex flex-col justify-between shadow-sm hover:shadow-${accentColor}-500/20 hover:-translate-y-1`}>
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-[10px] font-bold text-${accentColor}-500 uppercase tracking-wider`}>{s.courseName}</span>
                                                {(isHomework || isExam) && s.dueDate && (
                                                    <span className="text-[10px] font-medium text-slate-500">Hạn: {new Date(s.dueDate).toLocaleDateString('vi-VN')}</span>
                                                )}
                                                {!(isHomework || isExam) && (
                                                    <span className={`text-[10px] font-medium text-${accentColor}-600 bg-${accentColor}-100/50 px-2 py-0.5 rounded-full`}>{s.progressPercent}% hoàn thành</span>
                                                )}
                                            </div>
                                            <h4 className={`text-base font-bold text-slate-900 line-clamp-2 min-h-[2.5rem] group-hover:text-${accentColor}-600 transition-colors`}>
                                                {s.nextItem.title}
                                            </h4>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-${accentColor}-100 text-${accentColor}-700 border border-${accentColor}-200 shadow-sm`}>
                                                {isHomework ? "Bài tập về nhà" : isExam ? "Bài kiểm tra" : "Bài học tiếp theo"}
                                            </span>
                                            <div className={`w-8 h-8 rounded-full bg-${accentColor}-100 flex items-center justify-center group-hover:bg-${accentColor}-500 transition-colors`}>
                                                <ArrowRight className={`w-4 h-4 text-${accentColor}-500 group-hover:text-white transition-colors`} />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
                        <p className="text-slate-500 text-sm">Bạn chưa có bài học nào được gợi ý.</p>
                    </div>
                )}
            </div>

            {/* ===== LỊCH HỌC SẮP TỚI TÓM TẮT & TÀI LIỆU ===== */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Lịch học & Thông tin bài giảng</h3>
                    <Link href="/student/schedule">
                        <Button variant="link" className="text-slate-500 hover:text-slate-900 p-0 text-xs font-semibold">Xem toàn bộ lịch trình</Button>
                    </Link>
                </div>
                {upcomingSessions && upcomingSessions.length > 0 ? (
                    <UpcomingSessionsWidget sessions={upcomingSessions} limit={2} compact={false} />
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
                        <p className="text-slate-500 text-sm">Bạn không có lịch học nào sắp tới.</p>
                    </div>
                )}
            </div>

            {/* ===== BÀI TẬP CẢI THIỆN AI ===== */}
            <FeedbackSuggestionCard />

            {/* ===== KHÓA HỌC & THÔNG BÁO ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Thông báo */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Thông báo mới</h3>
                    {announcements && announcements.length > 0 ? (
                        <div className="space-y-3">
                            {announcements.slice(0, 3).map((ann: any) => (
                                <Link key={ann.id} href={`/student/announcements/${ann.id}`} className="block">
                                    <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm hover:border-amber-400 transition-all duration-300 hover:-translate-y-1 hover:shadow-amber-500/20 group">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <Bell className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1 group-hover:text-amber-700 transition-colors">{ann.title}</h4>
                                                <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                                                <p className="text-[10px] text-amber-600/80 mt-2 font-bold flex items-center gap-1">
                                                    <span>{new Date(ann.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-amber-600 group-hover:underline">Nhấn để xem chi tiết</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
                            <p className="text-slate-500 text-sm">Không có thông báo mới.</p>
                        </div>
                    )}
                </div>

                {/* Khóa học của tôi */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Khóa học của tôi</h3>
                        <Link href="/student/classes">
                            <Button variant="link" className="text-slate-500 hover:text-slate-900 p-0 text-xs font-semibold">Xem tất cả</Button>
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {myClasses && myClasses.length > 0 ? (
                            myClasses.slice(0, 3).map((enrollment: any) => {
                                const cls = enrollment.class;
                                const suggestion = suggestions?.find((s: any) => s.classId === cls.id);
                                const progressPercent = suggestion?.progressPercent || 0;

                                return (
                                    <Link href={`/student/classes/${cls.id}`} key={enrollment.id} className="block">
                                        <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-[1.25rem] border-2 border-blue-100 p-3 shadow-sm hover:border-blue-400 transition-all duration-300 group flex flex-col sm:flex-row items-center gap-4 hover:-translate-y-1 hover:shadow-blue-500/20">
                                            {/* Khối hình vuông làm Thumbnail */}
                                            <div className="w-full sm:w-24 h-24 rounded-[1rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center shrink-0 shadow-inner shadow-indigo-900/20 relative overflow-hidden group-hover:scale-[1.03] transition-transform duration-500">
                                                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                                                <BookOpen className="w-8 h-8 text-white mb-1.5 drop-shadow-md" />
                                                <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest drop-shadow-sm">KHÓA HỌC</span>
                                            </div>

                                            {/* Thông tin chi tiết bên ngoài */}
                                            <div className="flex-1 w-full py-1 pr-1">
                                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 mb-1.5 leading-snug">
                                                    {cls.course?.name || "Tên khóa học"}
                                                </h4>
                                                
                                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                                                        Lớp: {cls.name || "Ẩn danh"}
                                                    </span>
                                                    {cls.teacher?.full_name && (
                                                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                                                            GV: {cls.teacher.full_name}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-blue-100/50 rounded-full h-2 overflow-hidden shadow-inner">
                                                        <div
                                                            className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full transition-all duration-700"
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-indigo-600">{progressPercent}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
                                <p className="text-slate-500 text-sm">Bạn chưa ghi danh vào lớp học nào.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
