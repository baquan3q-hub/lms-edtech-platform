import { fetchStudentEnrolledClasses } from "@/lib/actions/student";
import Link from "next/link";
import { PlayCircle, BookOpen, Clock, Calendar } from "lucide-react";

export default async function StudentClassesPage() {
    const { data: myClasses } = await fetchStudentEnrolledClasses();

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lớp học của tôi</h1>
                <p className="text-slate-500 mt-2 font-medium">Danh sách tất cả các lớp học bạn đang tham gia trên hệ thống.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myClasses && myClasses.length > 0 ? (
                    myClasses.map((enrollment: any) => {
                        const cls = enrollment.class;
                        return (
                            <Link href={`/student/classes/${cls.id}`} key={enrollment.id} className="block group">
                                <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                                    <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden shrink-0">
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />

                                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-xs font-semibold flex items-center shadow-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                                            Đang diễn ra
                                        </div>

                                        <div className="absolute bottom-3 left-4 right-4 text-white">
                                            <h3 className="text-lg font-bold leading-tight group-hover:text-indigo-100 transition-colors line-clamp-1">
                                                {cls.course?.name || "Khóa học"}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold ring-1 ring-inset ring-indigo-700/10">
                                                Lớp: {cls.name || "Ẩn danh"}
                                            </span>
                                            {cls.room && (
                                                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                                                    Phòng: {cls.room}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 mt-auto">
                                            {cls.teacher && (
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <BookOpen className="w-4 h-4 mr-2 text-slate-400" />
                                                    GV: <span className="font-medium ml-1">{cls.teacher?.full_name || "Chưa có"}</span>
                                                </div>
                                            )}
                                            {cls.schedule && (
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                                    Lịch: <span className="font-medium ml-1 line-clamp-1">{cls.schedule}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center text-sm text-slate-600">
                                                <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                                Trạng thái: <span className="text-emerald-600 font-semibold ml-1">Đang học</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between group-hover:bg-indigo-50 transition-colors">
                                        <span className="text-sm font-semibold text-slate-500 group-hover:text-indigo-700">Vào lớp học</span>
                                        <PlayCircle className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center p-12 bg-white border border-dashed border-slate-300 rounded-2xl shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa có lớp học nào</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Bạn chưa ghi danh vào bất kỳ lớp học nào trên hệ thống. Hãy liên hệ với trung tâm để được xếp lớp nhé.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
