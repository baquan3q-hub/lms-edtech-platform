"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, FileSpreadsheet } from "lucide-react";
import AIInsightModal from "./AIInsightModal";
import * as XLSX from "xlsx";
import ManualGradingModal from "@/components/teacher/ManualGradingModal";

interface SubmissionsTableClientProps {
    submissions: any[];
    exam: any;
    strengths: any[];
    weaknesses: any[];
}

export default function SubmissionsTableClient({ submissions, exam, strengths, weaknesses }: SubmissionsTableClientProps) {
    const [selectedSub, setSelectedSub] = useState<any>(null);
    const [selectedGradingSub, setSelectedGradingSub] = useState<any>(null);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleExportExcel = () => {
        // Sheet 1: Student Scores & Insights
        const studentData = submissions.map((sub, idx) => {
            const studentObj = Array.isArray(sub.student) ? sub.student[0] : sub.student;
            const percent = exam.total_points > 0 ? (Number(sub.score) / exam.total_points) * 100 : 0;
            let rating = "Chưa đạt";
            if (percent >= 80) rating = "Giỏi";
            else if (percent >= 65) rating = "Khá";
            else if (percent >= 50) rating = "Đạt";

            return {
                "STT": idx + 1,
                "Họ và Tên": studentObj?.full_name || "Ẩn danh",
                "Email": studentObj?.email || "",
                "Điểm": `${sub.score}/${exam.total_points}`,
                "Tỷ lệ (%)": percent.toFixed(1),
                "Xếp loại": rating,
                "Thời gian làm bài": formatTime(sub.time_taken_seconds || 0),
                "Ngày nộp": new Date(sub.submitted_at).toLocaleString('vi-VN'),
                "Nhận xét của AI": sub.ai_insight ? sub.ai_insight.replace(/\*\*/g, '').replace(/\*/g, '') : "Chưa có"
            };
        });

        // Sheet 2: Class Analytics
        // Calculate pass rate
        const passCount = submissions.filter(s => {
            const pct = exam.total_points > 0 ? (Number(s.score) / exam.total_points) * 100 : 0;
            return pct >= 50;
        }).length;
        const avgScore = submissions.length > 0 
            ? (submissions.reduce((sum, s) => sum + Number(s.score), 0) / submissions.length).toFixed(1) 
            : 0;

        const classData = [
            { "Chỉ số": "Sĩ số nộp bài", "Giá trị": submissions.length },
            { "Chỉ số": "Điểm Trung bình", "Giá trị": `${avgScore}/${exam.total_points}` },
            { "Chỉ số": "Số lượng Đạt (>=50%)", "Giá trị": passCount },
            { "Chỉ số": "Tỉ lệ Đạt", "Giá trị": submissions.length > 0 ? `${((passCount / submissions.length) * 100).toFixed(1)}%` : "0%" },
            { "Chỉ số": "", "Giá trị": "" },
            { "Chỉ số": "--- PHÂN TÍCH ĐIỂM MẠNH (KỸ NĂNG) ---", "Giá trị": "" },
            ...strengths.map(s => ({
                "Chỉ số": s.type === 'tag' ? `Kỹ năng: ${s.name}` : s.name,
                "Giá trị": `Tỉ lệ đúng: ${s.percent}%`
            })),
            { "Chỉ số": "", "Giá trị": "" },
            { "Chỉ số": "--- PHÂN TÍCH ĐIỂM YẾU (CẦN ÔN) ---", "Giá trị": "" },
            ...weaknesses.map(w => ({
                "Chỉ số": w.type === 'tag' ? `Kỹ năng: ${w.name}` : w.name,
                "Giá trị": `Tỉ lệ đúng: ${w.percent}%`
            }))
        ];

        // Create workbook and add sheets
        const wb = XLSX.utils.book_new();
        
        const wsSubmissions = XLSX.utils.json_to_sheet(studentData);
        // Tự động căn chỉnh độ rộng cột
        wsSubmissions['!cols'] = [
            { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 100 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSubmissions, "Bảng Điểm Học Sinh");

        const wsAnalytics = XLSX.utils.json_to_sheet(classData);
        wsAnalytics['!cols'] = [{ wch: 40 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsAnalytics, "Thống Kê Lớp");

        // Save file
        XLSX.writeFile(wb, `BaoCao_KetQua_${exam.title.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="px-5 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" /> Bảng điểm & AI Đánh giá
                </h2>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-semibold h-8" disabled={submissions.length === 0}>
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Xuất Excel
                </Button>
            </div>
            
            <div className="flex-1 overflow-auto">
                {submissions.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 backdrop-blur z-10 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-4 font-bold text-slate-700">#</th>
                                <th className="text-left py-3 px-4 font-bold text-slate-700">Học viên</th>
                                <th className="text-center py-3 px-4 font-bold text-slate-700">Điểm</th>
                                <th className="text-center py-3 px-4 font-bold text-slate-700">Thời gian</th>
                                <th className="text-center py-3 px-4 font-bold text-slate-700">Kết quả</th>
                                <th className="text-right py-3 px-4 font-bold text-slate-700">Gia sư AI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((sub: any, idx: number) => {
                                const studentObj = Array.isArray(sub.student) ? sub.student[0] : sub.student;
                                const percent = exam.total_points > 0 ? (Number(sub.score) / exam.total_points) * 100 : 0;
                                return (
                                    <tr key={sub.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                        <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-800">{studentObj?.full_name || "Ẩn danh"}</p>
                                            <p className="text-[10px] text-slate-400">{studentObj?.email || ""}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`font-bold ${percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-indigo-600' : 'text-red-500'}`}>
                                                {sub.score}/{exam.total_points}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-500">
                                            {formatTime(sub.time_taken_seconds || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {sub.grading_status === 'pending' ? (
                                                <Badge className="bg-amber-50 text-amber-600 border-none shadow-none text-[10px]">Chờ chấm</Badge>
                                            ) : percent >= 50 ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none text-[10px]">Đạt</Badge>
                                            ) : (
                                                <Badge className="bg-red-50 text-red-600 border-none shadow-none text-[10px]">Chưa đạt</Badge>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 flex items-center justify-end gap-2">
                                            {sub.grading_status === 'pending' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-7 px-2 text-xs font-semibold border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100" 
                                                    onClick={() => setSelectedGradingSub(sub)}
                                                >
                                                    Chấm bài
                                                </Button>
                                            )}
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className={`h-7 px-2 text-xs font-semibold ${sub.ai_insight ? 'border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100' : 'border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200'}`}
                                                onClick={() => setSelectedSub(sub)}
                                            >
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                {sub.ai_insight ? "Xem AI" : "Tạo AI"}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-slate-400 h-full flex items-center justify-center">Chưa có học viên nào nộp bài.</div>
                )}
            </div>

            {selectedSub && (
                <AIInsightModal
                    open={!!selectedSub}
                    onOpenChange={(open) => !open && setSelectedSub(null)}
                    submission={selectedSub}
                    exam={exam}
                    strengths={strengths}
                    weaknesses={weaknesses}
                />
            )}

            {selectedGradingSub && (
                <ManualGradingModal
                    open={!!selectedGradingSub}
                    onOpenChange={(open) => !open && setSelectedGradingSub(null)}
                    submission={selectedGradingSub}
                    exam={exam}
                />
            )}
        </div>
    );
}
