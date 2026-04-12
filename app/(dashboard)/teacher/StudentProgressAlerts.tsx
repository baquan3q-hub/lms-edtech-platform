"use client";

import { AlertCircle, BellRing, BookX, BookOpen, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { sendProgressReminder } from "./progress-actions";
import { toast } from "sonner";

export default function StudentProgressAlerts({ tasks }: { tasks: any[] }) {
    const [sendingTaskId, setSendingTaskId] = useState<string | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const handleRemindAll = async (task: any) => {
        if (!task.missingStudents || task.missingStudents.length === 0) return;
        setSendingTaskId(task.id);
        
        const typeStr = task.type === "exam" ? "Bài kiểm tra" : "Bài tập";
        const msg = `Bạn chưa nộp ${typeStr} "${task.title}" tại môn ${task.className}. Vui lòng kiểm tra và hoàn thành gấp!`;
        
        try {
            let successCount = 0;
            // Gửi từng người (có thể gộp API nếu tối ưu, nhưng Promise.all cũng ổn với file nội bộ)
            await Promise.all(
                task.missingStudents.map(async (student: any) => {
                    const res = await sendProgressReminder(student.id, msg);
                    if (res.success) successCount++;
                })
            );
            toast.success(`Đã gửi nhắc nhở thành công đến ${successCount}/${task.missingStudents.length} học sinh & phụ huynh!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSendingTaskId(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedTaskId(expandedTaskId === id ? null : id);
    };

    return (
        <div className="bg-white rounded-3xl p-6 relative overflow-hidden border border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)]">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <BookOpen className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-lg text-slate-900">
                        Tiến độ Bài Tập & Kiểm Tra
                    </h4>
                    <p className="text-slate-500 text-sm mt-0.5">Theo dõi mức độ hoàn thành nhiệm vụ của lớp</p>
                </div>
            </div>

            {!tasks || tasks.length === 0 ? (
                <div className="py-10 text-center text-slate-500 rounded-2xl bg-slate-50 border border-slate-100 border-dashed">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-60" />
                    <p className="font-semibold text-slate-700">Chưa có dữ liệu bài tập</p>
                    <p className="text-sm mt-1">Các bài tập/kiểm tra được giao sẽ hiển thị tiến độ tại đây.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {tasks.map((task) => {
                        const missingCount = task.totalExpected - task.submitted;
                        const isPerfect = missingCount === 0 && task.totalExpected > 0;
                        const completePercent = task.totalExpected > 0 ? (task.submitted / task.totalExpected) * 100 : 0;
                        
                        let statusColor = "text-emerald-600";
                        let statusBg = "bg-emerald-50";
                        let progressColor = "bg-emerald-500";

                        if (!isPerfect) {
                            if (completePercent < 50) {
                                statusColor = "text-rose-600";
                                statusBg = "bg-rose-50";
                                progressColor = "bg-rose-500";
                            } else if (completePercent < 80) {
                                statusColor = "text-amber-600";
                                statusBg = "bg-amber-50";
                                progressColor = "bg-amber-500";
                            } else {
                                statusColor = "text-blue-600";
                                statusBg = "bg-blue-50";
                                progressColor = "bg-blue-500";
                            }
                        }

                        const isExpanded = expandedTaskId === task.id;

                        return (
                            <div key={task.id} className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all shadow-sm">
                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => toggleExpand(task.id)}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Badge variant="secondary" className={`${statusBg} ${statusColor} border-none font-semibold uppercase text-[10px] tracking-wider px-2`}>
                                                {task.type === 'exam' ? 'Kiểm tra' : 'Bài tập'}
                                            </Badge>
                                            <span className="text-xs font-semibold text-slate-400 px-1 py-0.5 rounded-md bg-slate-50">
                                                {task.className}
                                            </span>
                                        </div>
                                        <h5 className="font-bold text-slate-900 text-base leading-snug">
                                            {task.title}
                                        </h5>
                                        
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="flex-1 max-w-[200px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${progressColor} rounded-full transition-all duration-1000`} 
                                                    style={{ width: `${completePercent}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-medium text-slate-500">
                                                {task.submitted}/{task.totalExpected} Đã nộp
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                        {isPerfect ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-semibold">
                                                <CheckCircle2 className="w-4 h-4" /> Hoàn tất 100%
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg text-sm font-semibold">
                                                <AlertCircle className="w-4 h-4" /> Nợ {missingCount}
                                            </div>
                                        )}
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && !isPerfect && task.missingStudents && task.missingStudents.length > 0 && (
                                    <div className="p-4 sm:p-5 border-t border-slate-50 bg-slate-50/50 rounded-b-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <h6 className="text-sm font-semibold text-slate-700">Học sinh chưa nộp ({task.missingStudents.length}):</h6>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={(e) => { e.stopPropagation(); handleRemindAll(task); }}
                                                disabled={sendingTaskId === task.id}
                                                className="h-8 text-xs font-semibold bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                                            >
                                                {sendingTaskId === task.id ? "Đang gửi..." : (
                                                    <>
                                                        <BellRing className="w-3.5 h-3.5 mr-1.5" />
                                                        Nhắc tất cả
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {task.missingStudents.map((student: any) => (
                                                <div key={student.id} className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <Avatar className="w-7 h-7">
                                                        <AvatarImage src={student.avatar} />
                                                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium text-slate-700 line-clamp-1">{student.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
