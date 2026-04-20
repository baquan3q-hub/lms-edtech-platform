import { fetchStudentAssignments } from "@/lib/actions/student";
import Link from "next/link";
import { FileText, Clock, AlertCircle, CheckCircle, ClipboardList, PenLine, Home, Zap, History, ChevronRight, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
    const { data: assignments } = await fetchStudentAssignments();

    const allItems = assignments || [];
    // Sử dụng trực tiếp field isDone từ server (đã check submission ở DB)
    const pendingItems = allItems.filter((a: any) => !a.isDone);
    const doneItems = allItems.filter((a: any) => a.isDone);

    // Sort: pending = hạn gần nhất trước, done = mới nhất trước
    pendingItems.sort((a: any, b: any) => {
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
    });
    doneItems.sort((a: any, b: any) => {
        const dateA = a.progress?.completed_at || a.deadline || '';
        const dateB = b.progress?.completed_at || b.deadline || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Badge config theo type
    const typeBadge = (type: string, title: string) => {
        const isImprove = title.startsWith('[Cải thiện]');
        if (isImprove) return { label: 'Cải thiện', color: 'text-amber-600 border-amber-200 bg-amber-50', icon: <Zap className="w-3 h-3 mr-0.5" /> };
        if (type === 'exam') return { label: 'Bài thi', color: 'text-rose-600 border-rose-200 bg-rose-50', icon: <ClipboardList className="w-3 h-3 mr-0.5" /> };
        if (type === 'homework') return { label: 'Bài tập', color: 'text-indigo-600 border-indigo-200 bg-indigo-50', icon: <Home className="w-3 h-3 mr-0.5" /> };
        if (type === 'quiz') return { label: 'Trắc nghiệm', color: 'text-emerald-600 border-emerald-200 bg-emerald-50', icon: <PenLine className="w-3 h-3 mr-0.5" /> };
        return { label: 'Bài tập', color: 'text-slate-600 border-slate-200 bg-slate-50', icon: <FileText className="w-3 h-3 mr-0.5" /> };
    };

    const getLink = (item: any) => {
        if (item.type === 'exam') return `/student/classes/${item.class_id}/exams/${item.id}`;
        if (item.type === 'homework') return `/student/classes/${item.class_id}/homework/${item.id}`;
        return `/student/classes/${item.class_id}/learn/${item.id}`;
    };

    const iconBg = (type: string) => {
        if (type === 'exam') return 'bg-rose-100 text-rose-600';
        if (type === 'homework') return 'bg-indigo-100 text-indigo-600';
        if (type === 'quiz') return 'bg-emerald-100 text-emerald-600';
        return 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bài tập & Kiểm tra</h1>
                <p className="text-slate-500 mt-2 font-medium">Theo dõi và hoàn thành các bài tập, câu hỏi trắc nghiệm từ mọi lớp học.</p>
            </div>

            {/* Summary */}
            {pendingItems.length > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-orange-800">Bạn có <span className="text-orange-600">{pendingItems.length}</span> bài cần hoàn thành</p>
                        <p className="text-xs text-orange-600/70 mt-0.5">Hãy hoàn thành đúng hạn để đạt kết quả tốt nhất!</p>
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-sm font-bold text-emerald-800">Tuyệt vời! Bạn không có bài tập nào đang tồn đọng 🎉</p>
                </div>
            )}

            {/* ===== CẦN HOÀN THÀNH ===== */}
            <section>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Cần hoàn thành ({pendingItems.length})</h2>
                </div>

                {pendingItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingItems.map((item: any) => {
                            const badge = typeBadge(item.type, item.title);
                            return (
                                <div key={`${item.type}-${item.id}`} className="relative group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                                    <div className="flex gap-4 items-start">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${iconBg(item.type)}`}>
                                            {item.type === 'exam' ? <FileText className="w-5 h-5" /> : item.type === 'quiz' ? <ClipboardList className="w-5 h-5" /> : <PenLine className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className="font-bold text-base text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate">
                                                    {item.title.replace('[Cải thiện] ', '')}
                                                </h3>
                                                <Badge variant="outline" className={`${badge.color} whitespace-nowrap text-[10px] shrink-0 flex items-center`}>
                                                    {badge.icon}{badge.label}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 truncate">{item.className} • {item.courseName}</p>

                                            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                                                {item.deadline ? (
                                                    <span className="flex items-center text-orange-600 font-medium">
                                                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                                        Hạn: {new Date(item.deadline).toLocaleDateString('vi-VN')}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> Không giới hạn</span>
                                                )}
                                                {item.maxAttempts && (
                                                    <span>Lần thử: {item.progress?.attempts || 0}/{item.maxAttempts}</span>
                                                )}
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                                <Link href={getLink(item)}>
                                                    <Button className="w-full bg-slate-900 hover:bg-indigo-600 text-white transition-colors font-bold h-9 text-sm">
                                                        Làm bài ngay
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">Tuyệt vời! Bạn không có bài tập nào đang tồn đọng.</p>
                    </div>
                )}
            </section>

            {/* ===== ĐÃ HOÀN THÀNH ===== */}
            {doneItems.length > 0 && (
                <section>
                    <details className="group" open>
                        <summary className="flex items-center gap-3 mb-5 cursor-pointer select-none list-none">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Bài kiểm tra đã làm ({doneItems.length})</h2>
                            <ChevronRight className="w-5 h-5 text-slate-400 ml-auto transition-transform group-open:rotate-90" />
                        </summary>

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {doneItems.map((item: any) => {
                                    const badge = typeBadge(item.type, item.title);
                                    const score = item.progress?.score;
                                    const hasScore = score !== null && score !== undefined;

                                    return (
                                        <Link key={`done-${item.type}-${item.id}`} href={getLink(item)} className="block">
                                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                                                {/* Icon */}
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-500`}>
                                                    <Trophy className="w-5 h-5" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold text-sm text-slate-700 truncate">
                                                            {item.title.replace('[Cải thiện] ', '')}
                                                        </p>
                                                        <Badge variant="outline" className={`${badge.color} text-[9px] shrink-0 flex items-center px-1.5 py-0`}>
                                                            {badge.icon}{badge.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5 truncate">{item.className} • {item.courseName}</p>
                                                </div>

                                                {/* Score / Status */}
                                                <div className="text-right shrink-0">
                                                    {hasScore ? (
                                                        <>
                                                            <p className="text-lg font-black text-emerald-600">{score}</p>
                                                            <span className="text-[10px] text-slate-400 font-medium">điểm</span>
                                                        </>
                                                    ) : item.progress?.status === 'submitted' ? (
                                                        <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]" variant="outline">
                                                            Chờ chấm
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]" variant="outline">
                                                            <CheckCircle className="w-3 h-3 mr-0.5" /> Đã nộp
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </details>
                </section>
            )}
        </div>
    );
}
