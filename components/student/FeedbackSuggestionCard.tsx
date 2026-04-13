import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, AlertTriangle, ArrowRight } from "lucide-react";

export default async function FeedbackSuggestionCard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const adminSupabase = createAdminClient();

    // Lấy nhận xét đã gửi, chưa hoàn thành tất cả bài tập
    const { data: analyses } = await adminSupabase
        .from("quiz_individual_analysis")
        .select("*, improvement_progress(*), exam:exams!exam_id(id, title, class_id)")
        .eq("student_id", user.id)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(3);

    // Lọc chỉ giữ những analysis có bài tập chưa hoàn thành toàn bộ
    const pending = (analyses || []).filter((a: any) => {
        const tasks = a.teacher_edited_tasks || a.improvement_tasks || [];
        const progress = a.improvement_progress || [];
        const completedCount = progress.filter((p: any) => p.status === 'completed').length;
        
        // Cần làm: Có giao task và số lượng hoàn thành chưa đủ
        return tasks.length > 0 && completedCount < tasks.length;
    });

    if (!pending || pending.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Không có mục tiêu cần cải thiện!</h3>
                <p className="text-slate-500 max-w-md">Bạn đang làm rất tốt và chưa có bài tập nào yêu cầu ôn tập lại. Tiếp tục phát huy nhé!</p>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Cần cải thiện</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">Hoàn thành để nâng cao điểm số của bạn</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
                {pending.map((analysis: any) => {
                    const examObj = Array.isArray(analysis.exam) ? analysis.exam[0] : analysis.exam;
                    const progress = analysis.improvement_progress || [];
                    const totalTasks = progress.length;
                    const completedTasks = progress.filter((p: any) => p.status === 'completed').length;
                    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    const deadline = analysis.deadline ? new Date(analysis.deadline) : null;
                    const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

                    const feedbackText = analysis.teacher_edited_feedback || analysis.ai_feedback || "";
                    const classId = examObj?.class_id || '';
                    const examId = examObj?.id || analysis.exam_id || '';

                    return (
                        <div key={analysis.id} className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row group">
                            {/* Left column (Title + Stats) */}
                            <div className="p-6 md:w-1/3 xl:w-1/4 bg-gradient-to-br from-rose-50 to-orange-50 border-b md:border-b-0 md:border-r border-rose-100 flex flex-col justify-between shrink-0">
                                <div>
                                    <div className="flex items-center justify-between mb-3 gap-2">
                                         <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none px-2 py-0.5 text-[10px] font-bold tracking-wider">
                                            CẦN ƯU TIÊN
                                         </Badge>
                                         {daysLeft !== null && (
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-white/60 px-2 py-1 rounded-lg border border-red-100 shrink-0">
                                                <Clock className="w-3 h-3" />
                                                <span>Còn {daysLeft} ngày</span>
                                            </div>
                                         )}
                                    </div>
                                    <h4 className="font-extrabold text-slate-800 text-lg mb-2 line-clamp-3 leading-tight group-hover:text-rose-600 transition-colors">
                                        {examObj?.title || 'Bài kiểm tra'}
                                    </h4>
                                </div>
                                <div className="mt-6">
                                     <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiến độ</span>
                                        <span className="text-sm font-black text-rose-600">{completedTasks}/{totalTasks} ({progressPercent}%)</span>
                                    </div>
                                    <div className="w-full bg-rose-200/50 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-rose-500 to-orange-400 h-2.5 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Right column (Feedback, Gaps, Action) */}
                            <div className="p-6 md:w-2/3 xl:w-3/4 flex flex-col relative">
                                {feedbackText && (
                                    <div className="bg-slate-50/80 rounded-2xl p-5 mb-5 border border-slate-100 relative">
                                        <div className="absolute top-6 -left-2 w-4 h-4 bg-slate-50/80 border-b border-l border-slate-100 rotate-45 transform origin-center hidden md:block"></div>
                                        <p className="text-sm text-slate-700 italic relative z-10 leading-relaxed font-medium">
                                            &quot;{feedbackText}&quot;
                                        </p>
                                    </div>
                                )}

                                {analysis.knowledge_gaps && analysis.knowledge_gaps.length > 0 && (
                                    <div className="mb-6 flex-1">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                            Điểm kiến thức cần khắc phục:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.knowledge_gaps.map((gap: string, i: number) => (
                                                <span key={i} className="inline-flex items-center gap-1.5 bg-white text-slate-700 text-xs px-3 py-1.5 rounded-full font-medium border border-slate-200 shadow-sm hover:border-rose-300 hover:text-rose-700 transition-colors cursor-default">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                                    {gap}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto sm:self-end pt-2 w-full sm:w-auto">
                                    <Link href={`/student/classes/${classId}/exams/${examId}/feedback`}>
                                        <Button className="w-full sm:w-auto h-11 px-8 bg-slate-900 hover:bg-rose-600 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] transition-all">
                                            Vào học cải thiện ngay <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
