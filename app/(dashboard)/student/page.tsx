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
    Star,
    Check,
    Rocket
} from "lucide-react";
import LottieAnimation from "@/components/shared/LottieAnimation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchStudentEnrolledClasses, fetchStudentDashboardStats, fetchSuggestedLessons, fetchStudentAnnouncements } from "@/lib/actions/student";
import { getOwnStudentSchedule } from "@/lib/actions/schedule";
import { fetchStudentHabits, fetchStudentGoals } from "@/lib/actions/goals-habits";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import UpcomingSessionsWidget from "@/components/shared/UpcomingSessionsWidget";
import FeedbackSuggestionCard from "@/components/student/FeedbackSuggestionCard";
import ExpandableContentClient from "@/components/shared/ExpandableContentClient";

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const [
        { data: myClasses },
        { data: statsData },
        { data: suggestions },
        { data: upcomingSessions },
        { data: announcements },
        { data: habits },
        { data: goals }
    ] = await Promise.all([
        fetchStudentEnrolledClasses(),
        fetchStudentDashboardStats(),
        fetchSuggestedLessons(),
        getOwnStudentSchedule(),
        fetchStudentAnnouncements(),
        fetchStudentHabits(user?.id || ""),
        fetchStudentGoals(user?.id || "")
    ]);

    const dynamicStats = [
        {
            title: "Mục tiêu",
            value: (goals || []).filter((g: any) => g.status === "in_progress" && g.created_by_role === "parent").length.toString(),
            icon: Target,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            goals: (goals || []).filter((g: any) => g.status === "in_progress" && g.created_by_role === "parent")
        },
        {
            title: "Nhiệm vụ (To-Do)",
            value: habits && habits.length > 0 ? `${habits.filter((h: any) => h.completedToday).length}/${habits.length}` : "0/0",
            icon: CheckSquare,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20",
            habits: habits || []
        },
        {
            title: "Bài đã hoàn thành",
            value: (statsData?.completedCount || 0).toString(),
            icon: Zap,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20"
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
        <div className="space-y-8 pb-24 sm:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto px-4 sm:px-0">
            {/* ===== HERO: COLORFUL & YOUTHFUL ===== */}
            <div className="hidden md:flex bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 rounded-3xl sm:rounded-[2rem] p-6 sm:p-10 shadow-xl shadow-blue-500/30 relative overflow-hidden text-white flex-col md:flex-row md:items-center justify-between gap-8 border-4 sm:border-[6px] border-white/30">
                <div className="absolute -top-10 -right-10 w-64 h-64 md:w-96 md:h-96 opacity-90 pointer-events-none md:translate-x-10 md:-translate-y-10">
                    <LottieAnimation
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

            {/* QUICK STATS - AUTO LAYOUT GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {dynamicStats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <Link href={(stat.goals !== undefined || stat.habits !== undefined) ? "/student/goals" : "#"} key={idx} className={`relative overflow-hidden group ${stat.bg} ${stat.border} border-2 rounded-3xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col min-h-[130px]`}>
                            <div className="flex gap-3 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 opacity-80 leading-none mt-1">{stat.title}</p>
                                    <p className={`text-2xl sm:text-3xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
                                </div>
                            </div>

                            {/* Rendering Goals for index 0 card */}
                            {stat.goals !== undefined && (
                                <div className="mt-4 pt-4 border-t border-blue-500/10 flex flex-col gap-2 relative z-10">
                                    {stat.goals.length > 0 ? (
                                        <>
                                            {stat.goals.slice(0, 2).map((g: any, i: number) => {
                                                const diff = g.target_date ? new Date(g.target_date).getTime() - new Date().getTime() : null;
                                                const daysLeft = diff ? Math.ceil(diff / (1000 * 3600 * 24)) : null;
                                                return (
                                                    <div key={i} className="flex justify-between items-center text-xs bg-white/50 border border-blue-100 rounded-md p-1.5">
                                                        <span className="truncate font-medium text-blue-900 pr-2">{g.title}</span>
                                                        {daysLeft !== null && (
                                                            <Badge variant="outline" className={`shrink-0 text-[9px] px-1.5 py-0 border-none ${daysLeft < 0 ? "bg-red-50 text-red-600" : "bg-blue-100 text-blue-700"}`}>
                                                                {Math.abs(daysLeft)} ngày {daysLeft < 0 ? "trễ" : "tới"}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {stat.goals.length > 2 && (
                                                <p className="text-[10px] text-blue-500 font-bold ml-1">+ {stat.goals.length - 2} mục tiêu khác</p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-xs text-blue-500/60 italic">Chưa có mục tiêu...</div>
                                    )}
                                </div>
                            )}

                            {/* Rendering Todolist tasks for Habits card */}
                            {stat.habits !== undefined && (
                                <div className="mt-4 pt-4 border-t border-indigo-500/10 flex flex-col gap-2 relative z-10">
                                    {stat.habits.length > 0 ? (
                                        <>
                                            {stat.habits.slice(0, 2).map((h: any, i: number) => (
                                                <div key={i} className="flex items-start gap-2 text-xs">
                                                    <div className={`mt-0.5 w-3.5 h-3.5 rounded-[4px] border shrink-0 flex items-center justify-center ${h.completedToday ? "bg-indigo-500 border-indigo-500" : "bg-white border-indigo-300"}`}>
                                                        {h.completedToday && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                                                    </div>
                                                    <span className={`truncate leading-snug font-medium ${h.completedToday ? "text-indigo-600/50 line-through" : "text-indigo-900"}`}>{h.title}</span>
                                                </div>
                                            ))}
                                            {stat.habits.length > 2 && (
                                                <p className="text-[10px] text-indigo-500 font-bold ml-5">+ {stat.habits.length - 2} nhiệm vụ</p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-xs text-indigo-500/60 italic">Chưa có nhiệm vụ...</div>
                                    )}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* LEFT COLUMN - LEARNING PATH (Focus area) */}
                <div className="lg:col-span-8 space-y-10">
                    {/* GỢI Ý HỌC TẬP */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
                                Đề xuất cho bạn
                            </h3>
                        </div>

                        {suggestions && suggestions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {suggestions.slice(0, 4).map((s: any, idx: number) => {
                                    const isHomework = s.type === "homework";
                                    const isExam = s.type === "exam";
                                    const accentColor = isHomework ? "rose" : isExam ? "purple" : "blue";

                                    return (
                                        <Link
                                            href={isHomework ? `/student/classes/${s.classId}/homework/${s.nextItem.id}` : isExam ? `/student/classes/${s.classId}/exams/${s.nextItem.id}` : `/student/classes/${s.classId}/learn/${s.nextItem.id}`}
                                            key={idx}
                                            className="block group"
                                        >
                                            <div className="h-full bg-white rounded-3xl border-2 border-slate-100 p-6 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="secondary" className={`bg-${accentColor}-50 text-${accentColor}-600 border-none font-bold text-[10px] uppercase px-3 py-1 ring-1 ring-${accentColor}-100`}>
                                                            {s.courseName}
                                                        </Badge>
                                                        {s.dueDate && (
                                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span className="text-[11px] font-bold">{new Date(s.dueDate).toLocaleDateString('vi-VN')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                                                        {s.nextItem.title}
                                                    </h4>
                                                </div>
                                                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg bg-${accentColor}-50 flex items-center justify-center`}>
                                                            <PlayCircle className={`w-4 h-4 text-${accentColor}-500`} />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                            {isHomework ? "Bài tập" : isExam ? "Kiểm tra" : "Bài học"}
                                                        </span>
                                                    </div>
                                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center">
                                <p className="text-slate-400 font-bold">Mọi thứ đã hoàn thành! Hãy nghỉ ngơi nhé.</p>
                            </div>
                        )}
                    </div>

                    {/* AI FEEDBACK SECTION */}
                    <div className="px-1">
                        <FeedbackSuggestionCard />
                    </div>

                    {/* MY CLASSES */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-2xl font-black text-slate-900">Lớp học của tôi</h3>
                            <Link href="/student/classes">
                                <Button variant="ghost" className="text-blue-600 font-bold gap-2">Tất cả <ArrowRight className="w-4 h-4" /></Button>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {myClasses?.slice(0, 4).map((enroll: any) => (
                                <Link href={`/student/classes/${enroll.class.id}`} key={enroll.id} className="group">
                                    <div className="bg-white rounded-3xl border-2 border-slate-100 p-2 shadow-sm group-hover:shadow-xl group-hover:border-blue-200 transition-all flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-95 transition-transform">
                                            <BookOpen className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-3">
                                            <h4 className="text-base font-black text-slate-900 truncate">{enroll.class.course?.name}</h4>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Lớp: {enroll.class.name}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - ACTIVITIES & UPDATES */}
                <div className="lg:col-span-4 space-y-10">
                    {/* UPCOMING SESSIONS */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-900 px-1">Lịch học sắp tới</h3>
                        {upcomingSessions && upcomingSessions.length > 0 ? (
                            <UpcomingSessionsWidget sessions={upcomingSessions} limit={3} compact={true} />
                        ) : (
                            <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 text-center">
                                <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Không có lịch học</p>
                            </div>
                        )}
                    </div>

                    {/* ANNOUNCEMENTS */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-900 px-1">Thông báo lớp học</h3>
                        <div className="space-y-4">
                            {announcements?.slice(0, 3).map((ann: any) => (
                                <ExpandableContentClient
                                    key={ann.id}
                                    className="border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white rounded-[2rem] shadow-sm hover:shadow-amber-200 transition-shadow"
                                    icon={<Bell className="w-5 h-5 text-amber-600" />}
                                    title={ann.title}
                                    content={ann.content}
                                    detailUrl={ann.class_id ? `/student/classes/${ann.class_id}?tab=announcements` : undefined}
                                    timestamp={new Date(ann.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
