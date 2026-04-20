import { fetchStudentEnrolledClasses } from "@/lib/actions/student";
import Link from "next/link";
import { PlayCircle, BookOpen, Clock, Calendar, CheckCircle2, ArrowRight, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StudentClassesPage() {
    const { data: myClasses } = await fetchStudentEnrolledClasses();

    const formatAllSchedules = (schedules: any[]) => {
        if (!schedules || schedules.length === 0) return "Chưa có lịch";
        const dayMap: Record<number, string> = {
            1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 7: "CN"
        };
        return schedules.map((s: any) => {
            const dayStr = dayMap[s.day_of_week] || `Ngày ${s.day_of_week}`;
            const start = s.start_time?.slice(0, 5) || "?";
            const end = s.end_time?.slice(0, 5) || "?";
            const room = s.room?.name ? ` (${s.room.name})` : "";
            return `${dayStr} ${start}-${end}${room}`;
        }).join(", ");
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-2 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Lớp học của tôi</h1>
                <p className="text-slate-500 mt-2 text-sm sm:text-base font-medium max-w-2xl">
                    Danh sách các lớp học bạn đang tham gia trên hệ thống. Chọn một lớp để bắt đầu bài học.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {myClasses && myClasses.length > 0 ? (
                    myClasses.map((enrollment: any, idx: number) => {
                        // Handle potential array wrapping from Supabase joins
                        const clsInfo = Array.isArray(enrollment.class) ? enrollment.class[0] : enrollment.class;
                        if (!clsInfo) return null;
                        
                        const courseInfo = Array.isArray(clsInfo.course) ? clsInfo.course[0] : clsInfo.course;
                        const teacherInfo = Array.isArray(clsInfo.teacher) ? clsInfo.teacher[0] : clsInfo.teacher;
                        const schedules = clsInfo.class_schedules || [];
                        const formattedSchedule = formatAllSchedules(schedules);

                        // Alternate abstract images for premium visual feel
                        const courseImages = [
                            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&auto=format&fit=crop&w=2564", // Abstract liquid purple/blue
                            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&auto=format&fit=crop&w=2670", // 3D geometric blue
                            "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&auto=format&fit=crop&w=2574", // Abstract blurred colorful shapes
                            "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&auto=format&fit=crop&w=2670", // 3D geometric colorful waves
                            "https://images.unsplash.com/photo-1619983081563-430fffb1cc3c?q=80&auto=format&fit=crop&w=2670"  // Soft pink and blue abstract
                        ];
                        const coverImage = courseImages[idx % courseImages.length];
                        
                        return (
                            <Link href={`/student/classes/${clsInfo.id}`} key={enrollment.id} className="block group">
                                <div className="h-full rounded-3xl border border-slate-200/60 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative">
                                    {/* Deco Background Blob */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 -z-10 group-hover:scale-110 transition-transform duration-500" />
                                    
                                    {/* Premium Header with Image */}
                                    <div 
                                        className="h-40 relative overflow-hidden shrink-0 p-5 flex flex-col justify-between"
                                    >
                                        <div 
                                            className="absolute inset-0 group-hover:scale-105 transition-transform duration-700 ease-in-out"
                                            style={{
                                                backgroundImage: `url('${coverImage}')`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-500" />
                                        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

                                        <div className="relative z-10 flex justify-between items-start">
                                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md shadow-none font-bold px-2.5 py-0.5">
                                                Lớp: {clsInfo.name || "Ẩn danh"}
                                            </Badge>
                                            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] sm:text-xs font-semibold shadow-sm border border-white/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                                ĐANG HOẠT ĐỘNG
                                            </div>
                                        </div>

                                        <div className="relative z-10 mt-auto">
                                            <h3 className="text-xl font-bold leading-tight text-white drop-shadow-md group-hover:text-indigo-100 transition-colors line-clamp-2">
                                                {courseInfo?.name || "Khóa học chưa đặt tên"}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Body Content */}
                                    <div className="p-5 flex-1 flex flex-col relative z-0">
                                        <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-5 leading-relaxed min-h-[2.5rem]">
                                            {courseInfo?.description || "Không có thông tin mô tả chi tiết cho lớp học này. Cập nhật sau từ giáo viên."}
                                        </p>

                                        <div className="space-y-3.5 mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                            {teacherInfo && (
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-3 shrink-0 text-indigo-600">
                                                        <UserCircle className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-slate-800 line-clamp-1">{teacherInfo.full_name || "Chưa có"}</span>
                                                    <span className="text-xs text-slate-400 ml-2 font-medium">Giáo viên</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-start text-sm text-slate-600">
                                                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center mr-3 mt-0.5 shrink-0 text-amber-600">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-400 font-medium block">Lịch học chi tiết</span>
                                                    <span className="font-semibold text-slate-800 line-clamp-2 mt-0.5">{formattedSchedule}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="px-5 pb-5 pt-2">
                                        <Button asChild className="w-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-100 font-bold transition-all group-hover:shadow-md rounded-xl h-11">
                                            <div className="flex items-center justify-center">
                                                Vào lớp học <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </Button>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 text-center p-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-slate-50/50">
                            <BookOpen className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có lớp học nào</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto">Bạn chưa ghi danh vào bất kỳ lớp học nào trên hệ thống. Hãy đăng ký khóa học để bắt đầu hành trình ngay.</p>
                        <Button className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6">
                            Khám phá khóa học
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
