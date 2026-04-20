"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Award, Calendar, ChevronDown, ChevronUp, FileCode } from "lucide-react";

interface RecordLine {
    id: string;
    itemId: string;
    title: string;
    type: string;
    className: string;
    courseName: string;
    score: number;
    totalPoints?: number;
    passed: boolean;
    submittedAt: string;
}

interface AcademicHistoryClientProps {
    grades: RecordLine[];
}

export default function AcademicHistoryClient({ grades }: AcademicHistoryClientProps) {
    if (!grades || grades.length === 0) {
        return (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileCode className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa có kết quả bài làm</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                    Bạn chưa hoàn thành bài tập hay bài kiểm tra nào. Lịch sử sẽ được cập nhật tại đây.
                </p>
            </div>
        );
    }

    // Group dates by YYYY-MM-DD
    const groupedByDate: Record<string, RecordLine[]> = {};
    grades.forEach(g => {
        if (!g.submittedAt) return;
        const dateObj = new Date(g.submittedAt);
        const dateStr = dateObj.toLocaleDateString("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });
        
        if (!groupedByDate[dateStr]) {
            groupedByDate[dateStr] = [];
        }
        groupedByDate[dateStr].push(g);
    });

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        // Convert back to comparable dates since a, b are DD/MM/YYYY strings
        const [dA, mA, yA] = a.split('/');
        const [dB, mB, yB] = b.split('/');
        const dateA = new Date(`${yA}-${mA}-${dA}`).getTime();
        const dateB = new Date(`${yB}-${mB}-${dB}`).getTime();
        return dateB - dateA; // Descending
    });

    // To handle toggling expansons
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(
        // Expand the first two dates by default
        sortedDates.reduce((acc, date, idx) => {
            acc[date] = idx < 2;
            return acc;
        }, {} as Record<string, boolean>)
    );

    const toggleDate = (date: string) => {
        setExpandedDates(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-2">
                <Calendar className="w-6 h-6 text-indigo-500" />
                Lịch sử làm bài tập & Bài thi
            </h2>

            <div className="relative border-l-2 border-indigo-100 ml-6 pl-8 space-y-8 pb-4 pointer-events-none">
                {/* Visual timeline line */}
            </div>

            <div className="space-y-4 relative -mt-4">
                {sortedDates.map((dateStr, idx) => {
                    const isExpanded = expandedDates[dateStr];
                    const items = groupedByDate[dateStr];
                    const dailyScoreSum = items.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
                    const avgDailyScore = (dailyScoreSum / items.length).toFixed(1);

                    return (
                        <div key={dateStr} className="relative">
                            {/* Timeline Node */}
                            <div className="absolute -left-[5px] sm:-left-3 top-5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm z-10 hidden sm:block" />

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sm:ml-6 group transition-all">
                                {/* Header (Clickable) */}
                                <button
                                    onClick={() => toggleDate(dateStr)}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50/50 transition-colors cursor-pointer border-b border-slate-100"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-left">
                                        <h3 className="font-bold text-slate-800 text-base">{dateStr === new Date().toLocaleDateString("vi-VN", {day: "2-digit", month: "2-digit", year: "numeric"}) ? "Hôm nay" : dateStr}</h3>
                                        <div className="flex gap-3 text-xs font-semibold text-slate-500">
                                            <span className="bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                                                {items.length} bài
                                            </span>
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                                                ĐTQ: {avgDailyScore}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                    </div>
                                </button>

                                {/* Body (Expandable) */}
                                {isExpanded && (
                                    <div className="divide-y divide-slate-100">
                                        {items.map(item => (
                                            <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-sm">
                                                            {item.type === 'quiz' ? 'Quiz' : item.type === 'exam' ? 'Exam' : 'Assignment'}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            Lúc {new Date(item.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">{item.className} — {item.courseName}</p>
                                                </div>

                                                <div className="flex items-center gap-4 sm:gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        {item.passed ? (
                                                            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Đạt
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                                                <XCircle className="w-3.5 h-3.5 mr-1" /> Cần cố gắng
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right flex items-baseline justify-end gap-0.5">
                                                        <span className="text-xl font-black text-slate-800">
                                                            {item.score ?? '-'}
                                                        </span>
                                                        <span className="text-sm font-medium text-slate-400">/{item.totalPoints ?? 100}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
