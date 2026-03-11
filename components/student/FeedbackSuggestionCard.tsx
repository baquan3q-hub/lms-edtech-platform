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

    if (!analyses || analyses.length === 0) return null;

    // Lọc chỉ giữ những analysis có bài tập chưa hoàn thành
    const pending = analyses.filter((a: any) => {
        const progress = a.improvement_progress || [];
        return progress.some((p: any) => p.status !== 'completed');
    });

    if (pending.length === 0) return null;

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <h3 className="text-xl font-bold text-slate-900">Bài tập cải thiện</h3>
            </div>
            <div className="space-y-3">
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
                        <div key={analysis.id} className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="px-5 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">📝</span>
                                    <span className="font-bold text-sm text-purple-800">{examObj?.title || 'Bài kiểm tra'}</span>
                                </div>
                                {daysLeft !== null && (
                                    <Badge className={`text-[10px] ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} border-none`}>
                                        <Clock className="w-3 h-3 mr-0.5" /> Còn {daysLeft} ngày
                                    </Badge>
                                )}
                            </div>
                            <div className="p-4">
                                {feedbackText && (
                                    <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                                        💬 &quot;{feedbackText.substring(0, 120)}...&quot;
                                    </p>
                                )}

                                {analysis.knowledge_gaps && analysis.knowledge_gaps.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {analysis.knowledge_gaps.slice(0, 3).map((gap: string, i: number) => (
                                            <Badge key={i} className="bg-red-50 text-red-700 border-none text-[9px]">🔴 {gap}</Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-600">📚 Tiến độ: {completedTasks}/{totalTasks} bài tập</span>
                                    <span className="text-xs font-bold text-indigo-600">{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                                    <div
                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>

                                <Link href={`/student/classes/${classId}/exams/${examId}/feedback`}>
                                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                                        📖 Xem nhận xét & Làm bài <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
