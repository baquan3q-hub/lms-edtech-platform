import {
    LayoutDashboard,
    BookOpen,
    Users,
    TrendingUp,
    ArrowRight,
    Calendar,
    MessageSquare,
    ClipboardList,
    Clock,
    AlertCircle,
    Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fetchTeacherClasses, fetchTeacherStats, fetchTeacherNotifications } from "./actions";
import { fetchTasksStatus } from "./progress-actions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import StudentProgressAlerts from "./StudentProgressAlerts";

export default async function TeacherDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const [
        { data: statsData },
        { data: classesData },
        { data: notifications },
        tasksObj
    ] = await Promise.all([
        fetchTeacherStats(user.id),
        fetchTeacherClasses(user.id),
        fetchTeacherNotifications(user.id),
        fetchTasksStatus(user.id)
    ]);

    const stats = [
        {
            title: "Lớp phụ trách",
            value: statsData?.classesCount?.toString() || "0",
            icon: BookOpen,
            color: "text-blue-500",
            bg: "bg-blue-50",
            border: "border-blue-100"
        },
        {
            title: "Tổng học sinh",
            value: statsData?.totalStudents?.toString() || "0",
            icon: Users,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            border: "border-emerald-100"
        },
        {
            title: "Trung bình điểm",
            value: statsData?.attendanceRate || "—",
            icon: TrendingUp,
            color: "text-violet-500",
            bg: "bg-violet-50",
            border: "border-violet-100"
        },
        {
            title: "Cần chấm điểm",
            value: statsData?.pendingAssignments?.toString() || "0",
            icon: ClipboardList,
            color: "text-rose-500",
            bg: "bg-rose-50",
            border: "border-rose-100"
        },
    ];

    // Map JS `getDay()` (0=Sun, 1=Mon) to our DB schema (1=Mon, ..., 7=Sun)
    const jsDay = new Date().getDay();
    const todayDb = jsDay === 0 ? 7 : jsDay;

    // Lọc ra các lớp đang hoạt động CÓ lịch dạy vào ngày hôm nay
    const todayClasses = classesData?.filter((c: any) => 
        c.status === 'active' && 
        c.schedules && 
        c.schedules.some((s: any) => s.day_of_week === todayDb)
    ) || [];

    // Láy ra Room và Time để hiển thị chuẩn xác
    const formatSchedule = (schedules: any[]) => {
        if (!schedules || schedules.length === 0) return "Chưa xếp lịch";
        const todaySchedules = schedules.filter((s:any) => s.day_of_week === todayDb);
        if (todaySchedules.length > 0) {
            // Định dạng ngắn gọn giờ: hh:mm
            return todaySchedules.map((s:any) => `${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}`).join(" & ");
        }
        return "Lịch ngoài giờ";
    };

    const getRoomName = (schedules: any[]) => {
        if (!schedules || schedules.length === 0) return "—";
        const todaySchedules = schedules.filter((s:any) => s.day_of_week === todayDb);
        if (todaySchedules.length > 0 && todaySchedules[0].room?.name) {
            return todaySchedules[0].room.name;
        }
        return "—";
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in zoom-in-95 duration-500 max-w-7xl mx-auto">


            {/* Stats Grid - Minimalist Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className={`relative overflow-hidden rounded-3xl border ${stat.border} bg-white p-6 shadow-[0_2px_20px_rgb(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}
                    >
                        <div className="flex flex-col gap-4">
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="w-6 h-6" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-4xl font-black text-slate-900 tracking-tight mb-1">{stat.value}</p>
                                <p className="text-sm font-semibold text-slate-500">{stat.title}</p>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${stat.bg} opacity-50 blur-2xl group-hover:blur-3xl transition-all duration-500`}></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cột chính (Rộng 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* KHỐI 1: Lịch dạy */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            Lịch dạy Hôm nay
                        </h3>
                        <Link href="/teacher/classes" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                            Tất cả lớp học
                        </Link>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)] overflow-hidden mb-8">
                        {!todayClasses || todayClasses.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <BookOpen className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-600 font-semibold text-lg">Hôm nay không có lịch dạy.</p>
                                <p className="text-slate-400 mt-1 max-w-sm">Dành thời gian này để chuẩn bị bài giảng hoặc chấm dứt các bài tập còn tồn đọng bạn nhé!</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {todayClasses.map((cls: any, index: number) => {
                                    const roomName = getRoomName(cls.schedules);
                                    const timeStr = formatSchedule(cls.schedules);
                                    const enrolledCount = cls.enrollments?.[0]?.count || 0;

                                    return (
                                        <div key={cls.id} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors hover:bg-slate-50/80 ${index !== todayClasses.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                            <div className="flex items-center gap-5">
                                                <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl font-bold border border-blue-100 flex-shrink-0">
                                                    <span className="text-xs uppercase opacity-70 tracking-widest">Phòng</span>
                                                    <span className="text-lg leading-tight text-center">{roomName.replace("Phòng ","")}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                                                            {cls.name ? `${cls.name} - ` : ""}{cls.course?.name || "Lớp học"}
                                                        </h4>
                                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-semibold whitespace-nowrap">
                                                            {timeStr}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 font-medium mt-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <Users className="w-4 h-4 text-slate-400" />
                                                            <span>Sĩ số: {enrolledCount} học sinh</span>
                                                        </div>
                                                        <div className="sm:hidden flex items-center gap-1.5">
                                                            <BookOpen className="w-4 h-4 text-slate-400" />
                                                            <span>Phòng: {roomName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                                <Button variant="outline" className="w-full sm:w-auto rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-semibold" asChild>
                                                    <Link href={`/teacher/classes/${cls.id}`}>
                                                        Chi tiết
                                                    </Link>
                                                </Button>
                                                <Button className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold" asChild>
                                                    <Link href={`/teacher/classes/${cls.id}?tab=attendance`}>
                                                        Điểm danh
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* KHỐI 2: Thông báo Dời vào đây */}
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-8">
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                        Thông báo hệ thống
                    </h3>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)] p-2">
                        <div className="flex flex-col">
                            {(!notifications || notifications.length === 0) ? (
                                <div className="p-8 text-center flex flex-col items-center">
                                    <Bell className="w-8 h-8 text-slate-200 mb-2" />
                                    <p className="text-sm font-medium text-slate-400">Bạn chưa có thông báo nào</p>
                                </div>
                            ) : (
                                notifications.map((noti: any) => (
                                    <div key={noti.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors flex gap-4 cursor-pointer">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${noti.read ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm ${noti.read ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>{noti.title}</h4>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{noti.content || noti.message}</p>
                                            <p className="text-xs font-medium text-slate-400 mt-1">
                                                {formatDistanceToNow(new Date(noti.created_at), { addSuffix: true, locale: vi })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Cột Phụ (Rộng 1/3) */}
                <div className="space-y-6">
                    {/* Tiến độ lớp học Alerts + Pie Chart */}
                    <StudentProgressAlerts 
                        tasks={tasksObj.tasks || []} 
                    />
                </div>
            </div>
        </div>
    );
}

