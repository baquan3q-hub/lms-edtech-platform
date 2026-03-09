import { createClient } from "@/lib/supabase/server";
import { fetchTeacherClasses } from "@/app/(dashboard)/teacher/actions";
import { BookOpen, Users, ArrowRight, Calendar, Search, Monitor, Building2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function TeacherClassesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: classesData, error } = await fetchTeacherClasses(user.id);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Lớp học của tôi
                </h2>
                <p className="text-slate-600 mt-2 font-medium max-w-2xl">
                    Danh sách các lớp học giảng dạy được phân công. Chọn một lớp để quản lý điểm danh và bài tập.
                </p>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
                    <p>Lỗi tải danh sách lớp: {error}</p>
                </div>
            ) : !classesData || classesData.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có lớp học</h3>
                    <p className="text-gray-500">Bạn chưa được phân công giảng dạy lớp nào. Vui lòng liên hệ Quản trị viên.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {classesData.map((cls: any) => (
                        <div key={cls.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                            {/* Card Header (Subject style pattern) */}
                            <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-700 relative p-5 flex flex-col justify-between overflow-hidden">
                                {/* Decorative circle */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-none font-medium">
                                        {cls.status === 'active' ? 'Đang hoạt động' : cls.status === 'completed' ? 'Đã kết thúc' : 'Đã hủy'}
                                    </Badge>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold text-white mb-1 drop-shadow-sm line-clamp-1">
                                        {cls.name ? `${cls.name} - ` : ""}{cls.course?.name || "Lớp học chưa đặt tên"}
                                    </h3>
                                    <p className="text-emerald-100 text-sm font-medium drop-shadow-sm line-clamp-1">
                                        {cls.course?.description || "Không có mô tả khóa học"}
                                    </p>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="space-y-4 mb-6 flex-1">
                                    <div className="flex items-center text-sm">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3 shrink-0">
                                            <Calendar className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Lịch dạy</p>
                                            <p className="text-gray-900 font-medium">{cls.schedule ? JSON.stringify(cls.schedule) : "Đang cập nhật lịch"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center text-sm">
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center mr-3 shrink-0">
                                            {cls.course?.mode === "online" ? (
                                                <Monitor className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <Building2 className="w-4 h-4 text-blue-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Hình thức</p>
                                            <p className="text-gray-900 font-medium">
                                                {cls.course?.mode === "online" ? "Online — Học trực tuyến" : "Offline — Học tại phòng"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center text-sm">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3 shrink-0">
                                            <Users className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Sĩ số (Đang học / Tối đa)</p>
                                            <p className="text-gray-900 font-medium">0 / {cls.max_students}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px w-full bg-gray-100 mb-4"></div>

                                {/* Actions */}
                                <Button className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm transition-all group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                                    <Link href={`/teacher/classes/${cls.id}`} className="flex w-full items-center justify-center">
                                        Vào lớp
                                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
