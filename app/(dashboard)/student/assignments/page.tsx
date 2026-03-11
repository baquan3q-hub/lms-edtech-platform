import { fetchStudentAssignments } from "@/lib/actions/student";
import Link from "next/link";
import { FileText, Clock, AlertCircle, CheckCircle, Search, ClipboardList, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function StudentAssignmentsPage() {
    const { data: assignments } = await fetchStudentAssignments();

    const categorizedAssignments = assignments ? {
        todo: assignments.filter(a => !a.progress || (a.progress.status !== 'completed' && a.progress.status !== 'submitted')),
        done: assignments.filter(a => a.progress?.status === 'completed' || a.progress?.status === 'submitted')
    } : { todo: [], done: [] };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bài tập & Kiểm tra</h1>
                    <p className="text-slate-500 mt-2 font-medium">Theo dõi và hoàn thành các bài tập, câu hỏi trắc nghiệm từ mọi lớp học.</p>
                </div>
            </div>

            {/* Content Tabs / Sections */}
            <div className="space-y-8">
                {/* TO-DO Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Cần hoàn thành ({categorizedAssignments.todo.length})</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categorizedAssignments.todo.length > 0 ? (
                            categorizedAssignments.todo.map((item: any) => (
                                <div key={item.id} className="relative group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex gap-4 items-start">
                                        <div className={`p-3 rounded-xl shrink-0 ${item.type === 'exam' ? 'bg-rose-100 text-rose-600' : item.type === 'quiz' ? 'bg-indigo-100 text-indigo-600' : item.type === 'homework' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {item.type === 'exam' ? <FileText className="w-6 h-6" /> : item.type === 'quiz' ? <ClipboardList className="w-6 h-6" /> : item.type === 'homework' ? <FileText className="w-6 h-6" /> : <PenTool className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 mt-1">{item.className} • {item.courseName}</p>
                                                </div>
                                                <Badge variant="outline" className={`${item.type === 'exam' ? 'text-rose-600 border-rose-200 bg-rose-50' : item.type === 'quiz' ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : item.type === 'homework' ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'} whitespace-nowrap`}>
                                                    {item.type === 'exam' ? 'Bài thi' : item.type === 'quiz' ? 'Trắc nghiệm' : item.type === 'homework' ? 'Bài tập về nhà' : 'Bài tập'}
                                                </Badge>
                                            </div>

                                            <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                                                {item.deadline ? (
                                                    <span className="flex items-center text-orange-600 font-medium">
                                                        <AlertCircle className="w-4 h-4 mr-1.5" />
                                                        Hạn: {new Date(item.deadline).toLocaleDateString('vi-VN')}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-slate-500">
                                                        <Clock className="w-4 h-4 mr-1.5" />
                                                        Không giới hạn
                                                    </span>
                                                )}
                                                {item.maxAttempts && (
                                                    <span className="flex items-center">
                                                        <FileText className="w-4 h-4 mr-1.5 text-slate-400" />
                                                        Lần thử: {item.progress?.attempts || 0}/{item.maxAttempts}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-100">
                                                <Link href={item.type === 'exam' ? `/student/classes/${item.class_id}/exams/${item.id}` : item.type === 'homework' ? `/student/classes/${item.class_id}/homework/${item.id}` : `/student/classes/${item.class_id}/learn/${item.id}`}>
                                                    <Button className="w-full bg-slate-900 hover:bg-indigo-600 text-white transition-colors">
                                                        Làm bài ngay
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-1 md:col-span-2 text-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                <p className="text-slate-600 font-medium">Tuyệt vời! Bạn không có bài tập nào đang tồn đọng.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* COMPLETED Section */}
                <section className="pt-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Đã nộp gần đây</h2>
                    </div>

                    <div className="bg-white border text-slate-600 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {categorizedAssignments.done.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {categorizedAssignments.done.map((item: any) => (
                                    <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2.5 rounded-lg shrink-0 ${item.type === 'exam' ? 'bg-rose-50 text-rose-500' : item.type === 'quiz' ? 'bg-indigo-50 text-indigo-500' : item.type === 'homework' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                {item.type === 'exam' ? <FileText className="w-5 h-5" /> : item.type === 'quiz' ? <ClipboardList className="w-5 h-5" /> : item.type === 'homework' ? <FileText className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{item.title}</h3>
                                                <p className="text-sm text-slate-500 mt-1">{item.className} • {item.courseName}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs font-medium">
                                                    <span className="text-emerald-600 flex items-center">
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> {item.type === 'homework' && item.progress?.status === 'submitted' ? 'Đã nộp (Chờ chấm)' : 'Đã nộp'}
                                                    </span>
                                                    {item.progress?.completed_at && (
                                                        <span className="text-slate-400">
                                                            {new Date(item.progress.completed_at).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            {item.progress?.score !== null && item.progress?.score !== undefined && (
                                                <div className="text-right flex-1 sm:flex-none">
                                                    <span className="block text-xs text-slate-500 uppercase font-bold tracking-wider">Điểm số</span>
                                                    <span className="text-xl font-black text-slate-900">{item.progress.score}</span>
                                                </div>
                                            )}
                                            <Link href={item.type === 'exam' ? `/student/classes/${item.class_id}/exams/${item.id}` : item.type === 'homework' ? `/student/classes/${item.class_id}/homework/${item.id}` : `/student/classes/${item.class_id}/learn/${item.id}`}>
                                                <Button variant="outline" size="sm" className="hidden sm:flex">Ghi nhận</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-8">
                                <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">Chưa có bài tập nào được hoàn thành.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
