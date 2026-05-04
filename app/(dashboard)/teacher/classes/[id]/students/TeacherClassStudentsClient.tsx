"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    Users, Trophy, Download, Search, Eye, Star,
    BarChart3, Target, Award, BookOpen, ClipboardList, AlertTriangle, Sparkles, Loader2,
    PlusCircle, MinusCircle, Clock, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TeacherPointsTab from "./TeacherPointsTab";
import { generateClassAIReport, generateImprovementTasks, sendReminderAction, loadSavedAIReport } from "@/lib/actions/class-students";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface StudentData {
    id: string;
    name: string;
    email: string;
    stats: any;
}

interface TeacherClassStudentsClientProps {
    classId: string;
    className: string;
    students: StudentData[];
    reportData: any;
}

// Parse **bold** text to JSX
function FormatAIText({ text }: { text: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={i} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
}

export default function TeacherClassStudentsClient({ classId, className, students, reportData }: TeacherClassStudentsClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [improvementResult, setImprovementResult] = useState<{ [key: string]: string }>({});
    const [loadingImprovement, setLoadingImprovement] = useState<string | null>(null);
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const searchParams = useSearchParams();

    const report = reportData;
    const reportStudents: any[] = report?.students || [];
    const summary = report?.summary || {};

    useEffect(() => {
        const studentId = searchParams?.get("studentId");
        if (studentId && reportStudents.length > 0) {
            const student = reportStudents.find(s => s.id === studentId);
            if (student) {
                setSelectedStudent(student);
            }
        }
    }, [searchParams, reportStudents]);

    // Auto-load saved AI report from DB on mount
    useEffect(() => {
        if (!classId) return;
        const loadReport = async () => {
            const res = await loadSavedAIReport(classId);
            if (res.data?.report_text) {
                setAiReport(res.data.report_text);
            }
        };
        loadReport();
    }, [classId]);

    const filteredReport = reportStudents.filter((s: any) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSendReminder = async (studentId: string, itemName: string, itemType: "homework" | "exam") => {
        const key = `${studentId}-${itemName}`;
        setSendingReminder(key);
        try {
            await sendReminderAction(studentId, classId, className, itemName, itemType);
            // Optionally show a toast here
        } catch (error) {
            console.error(error);
        } finally {
            setSendingReminder(null);
        }
    };

    const getScore10Color = (score: number) => {
        if (score >= 8) return "text-emerald-600";
        if (score >= 6) return "text-amber-600";
        if (score >= 5) return "text-orange-500";
        return "text-red-500";
    };

    const getScore10Bg = (score: number) => {
        if (score >= 8) return "bg-emerald-50 border-emerald-200 text-emerald-700";
        if (score >= 6) return "bg-amber-50 border-amber-200 text-amber-700";
        return "bg-red-50 border-red-200 text-red-700";
    };

    const exportExcel = (filter: string) => {
        let headers = ["STT", "Họ tên", "Email"];
        let rows: any[][] = [];

        if (filter === "ranking") {
            headers.push("ĐTB (thang 10)", "KT (thang 10)", "BT (thang 10)", "CC%", "Tiến trình%", "Điểm TL");
            rows = filteredReport.map((s: any, i: number) => [
                i + 1, s.name, s.email,
                s.avgScore10, s.exams.avg10, s.homework.avg10,
                s.attendance.rate, s.progress.percent, s.points.total,
            ]);
        } else if (filter === "attendance") {
            headers.push("CC%", "Có mặt", "Đi muộn", "Có phép", "Vắng", "Tổng buổi");
            rows = filteredReport.map((s: any, i: number) => [
                i + 1, s.name, s.email,
                s.attendance.rate, s.attendance.present, s.attendance.late,
                s.attendance.excused, s.attendance.absent, s.attendance.total,
            ]);
        } else if (filter === "exams") {
            headers.push("ĐTB KT (thang 10)", "Số bài nộp", "Tổng bài");
            rows = filteredReport.map((s: any, i: number) => [
                i + 1, s.name, s.email,
                s.exams.avg10, s.exams.completed, s.exams.total,
            ]);
        } else if (filter === "homework") {
            headers.push("ĐTB BT (thang 10)", "Số bài nộp", "Tổng bài");
            rows = filteredReport.map((s: any, i: number) => [
                i + 1, s.name, s.email,
                s.homework.avg10, s.homework.completed, s.homework.total,
            ]);
        }

        const worksheetData = [headers, ...rows];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, `bao_cao_${filter}_${className}.xlsx`);
    };

    const exportAIReport = () => {
        if (!aiReport) return;
        const headers = ["Báo cáo AI - Lớp " + className];
        const rows = aiReport.split("\n").map(line => [line.replace(/\*\*/g, "")]);
        const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `AI_bao_cao_${className}.csv`;
        link.click();
    };

    const handleImprovement = async (student: any) => {
        setLoadingImprovement(student.id);
        try {
            const areas = student.weakAreas?.length > 0 ? student.weakAreas : ["Điểm trung bình thấp"];
            const result = await generateImprovementTasks(student.name, areas, className);
            setImprovementResult(prev => ({ ...prev, [student.id]: result.data || "Không thể tạo bài tập." }));
        } catch {
            setImprovementResult(prev => ({ ...prev, [student.id]: "Đã xảy ra lỗi." }));
        } finally {
            setLoadingImprovement(null);
        }
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border shadow-sm mb-6 flex-wrap h-auto p-1 gap-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        <BarChart3 className="w-4 h-4 mr-2" /> Tổng quan
                    </TabsTrigger>
                    <TabsTrigger value="ranking" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        <Trophy className="w-4 h-4 mr-2" /> Xếp hạng
                    </TabsTrigger>
                    <TabsTrigger value="points" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        <Star className="w-4 h-4 mr-2" /> Điểm tích lũy
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        <Sparkles className="w-4 h-4 mr-2" /> AI Báo cáo
                    </TabsTrigger>
                    <TabsTrigger value="export" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        <Download className="w-4 h-4 mr-2" /> Xuất báo cáo
                    </TabsTrigger>
                </TabsList>

                {/* ===================== TAB 1: TỔNG QUAN ===================== */}
                <TabsContent value="overview" className="space-y-6 outline-none mt-0">
                    {/* 6 KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <Card className="shadow-sm border-indigo-100">
                            <CardContent className="p-4 text-center">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-2"><Target className="w-5 h-5" /></div>
                                <p className="text-xs font-medium text-slate-500">ĐTB Lớp</p>
                                <p className={`text-2xl font-black ${getScore10Color(summary.classAvg10 || 0)}`}>{summary.classAvg10 || 0}<span className="text-sm font-normal text-slate-400">/10</span></p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-emerald-100">
                            <CardContent className="p-4 text-center">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2"><Award className="w-5 h-5" /></div>
                                <p className="text-xs font-medium text-slate-500">Xuất sắc (≥8)</p>
                                <p className="text-2xl font-black text-emerald-600">{summary.excellentCount || 0}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-red-100">
                            <CardContent className="p-4 text-center">
                                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2"><AlertTriangle className="w-5 h-5" /></div>
                                <p className="text-xs font-medium text-slate-500">Yếu (&lt;5)</p>
                                <p className="text-2xl font-black text-red-500">{summary.weakCount || 0}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-amber-100">
                            <CardContent className="p-4 text-center">
                                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2"><Clock className="w-5 h-5" /></div>
                                <p className="text-xs font-medium text-slate-500">CC Trung bình</p>
                                <p className="text-2xl font-black text-amber-600">{summary.avgAttendance || 0}%</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-blue-100">
                            <CardContent className="p-4 text-center">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-2"><ClipboardList className="w-5 h-5" /></div>
                                <p className="text-xs font-medium text-slate-500">Bài đã giao</p>
                                <p className="text-2xl font-black text-blue-600">{(summary.totalExams || 0) + (summary.totalHomework || 0)}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-purple-100">
                            <CardContent className="p-4 text-center">
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-2"><BookOpen className="w-5 h-5" /></div>
                                <p className="text-xs font-medium text-slate-500">Tiến trình TB</p>
                                <p className="text-2xl font-black text-purple-600">{summary.avgProgress || 0}%</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl border shadow-sm">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input placeholder="Tìm kiếm học viên..." className="pl-9 bg-slate-50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">{filteredReport.length} học sinh</Badge>
                    </div>

                    {/* Score Table — thang 10 */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3">
                            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Bảng điểm — Thang điểm 10</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                                        <tr>
                                            <th className="px-3 py-3 font-medium w-10 text-center">#</th>
                                            <th className="px-3 py-3 font-medium text-left">Học sinh</th>
                                            <th className="px-3 py-3 font-medium text-center">ĐTB</th>
                                            <th className="px-3 py-3 font-medium text-center">KT</th>
                                            <th className="px-3 py-3 font-medium text-center">BT</th>
                                            <th className="px-3 py-3 font-medium text-center text-slate-400">CC%</th>
                                            <th className="px-3 py-3 font-medium text-center text-slate-400">TĐ%</th>
                                            <th className="px-3 py-3 font-medium text-center text-slate-400">ĐTL</th>
                                            <th className="px-3 py-3 font-medium text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredReport.map((s: any, i: number) => (
                                            <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${s.avgScore10 < 5 ? 'bg-red-50/20' : ''}`}>
                                                <td className="px-3 py-3 text-center font-bold text-slate-400">{i + 1}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7 border">
                                                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-[10px]">
                                                                {s.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 text-xs">{s.name}</p>
                                                            <p className="text-[10px] text-slate-400">{s.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Badge variant="outline" className={`text-xs font-black border ${getScore10Bg(s.avgScore10)}`}>{s.avgScore10}</Badge>
                                                </td>
                                                <td className={`px-3 py-3 text-center font-semibold ${getScore10Color(s.exams.avg10)}`}>{s.exams.avg10}</td>
                                                <td className={`px-3 py-3 text-center font-semibold ${getScore10Color(s.homework.avg10)}`}>{s.homework.avg10}</td>
                                                <td className="px-3 py-3 text-center text-slate-400 text-xs">{s.attendance.rate}%</td>
                                                <td className="px-3 py-3 text-center text-slate-400 text-xs">{s.progress.percent}%</td>
                                                <td className={`px-3 py-3 text-center text-xs ${s.points.total > 0 ? 'text-emerald-600' : s.points.total < 0 ? 'text-red-500' : 'text-slate-400'}`}>{s.points.total > 0 ? `+${s.points.total}` : s.points.total}</td>
                                                <td className="px-3 py-3 text-right">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedStudent(s)} title="Xem chi tiết">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===================== TAB 2: XẾP HẠNG ===================== */}
                <TabsContent value="ranking" className="space-y-6 outline-none mt-0">
                    {/* Top 3 Podium */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        {reportStudents[1] && (
                            <div className="order-2 md:order-1 mt-0 md:mt-8">
                                <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-300"></div>
                                    <CardContent className="p-6 text-center pt-8">
                                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl border-4 border-slate-200">🥈</div>
                                        <h3 className="font-bold text-lg text-slate-800 truncate">{reportStudents[1].name}</h3>
                                        <p className="text-sm text-slate-500 mb-3">KT {reportStudents[1].exams.avg10} • BT {reportStudents[1].homework.avg10}</p>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-base font-black px-3 py-1">{reportStudents[1].avgScore10}/10</Badge>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        {reportStudents[0] && (
                            <div className="order-1 md:order-2">
                                <Card className="border-amber-200 shadow-md relative overflow-hidden ring-1 ring-amber-100">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500"></div>
                                    <CardContent className="p-6 text-center pt-8">
                                        <div className="w-20 h-20 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-4 text-4xl border-4 border-amber-200 shadow-inner">🥇</div>
                                        <h3 className="font-bold text-xl text-slate-900 truncate">{reportStudents[0].name}</h3>
                                        <p className="text-sm text-amber-600 font-medium mb-3">KT {reportStudents[0].exams.avg10} • BT {reportStudents[0].homework.avg10}</p>
                                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 shadow-sm px-4 py-1.5 text-base font-black">{reportStudents[0].avgScore10}/10</Badge>
                                    </CardContent>
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-400/10 rounded-full blur-xl"></div>
                                </Card>
                            </div>
                        )}
                        {reportStudents[2] && (
                            <div className="order-3 mt-0 md:mt-12">
                                <Card className="border-orange-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-300"></div>
                                    <CardContent className="p-6 text-center pt-8">
                                        <div className="w-14 h-14 mx-auto bg-orange-50 rounded-full flex items-center justify-center mb-4 text-xl border-4 border-orange-200">🥉</div>
                                        <h3 className="font-bold text-base text-slate-800 truncate">{reportStudents[2].name}</h3>
                                        <p className="text-xs text-slate-500 mb-3">KT {reportStudents[2].exams.avg10} • BT {reportStudents[2].homework.avg10}</p>
                                        <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 font-black">{reportStudents[2].avgScore10}/10</Badge>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* Full Ranking Table */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3">
                            <CardTitle className="text-base">Bảng xếp hạng toàn lớp (Thang điểm 10)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 font-medium w-14 text-center">Hạng</th>
                                            <th className="px-4 py-3 font-medium">Học viên</th>
                                            <th className="px-4 py-3 font-medium text-center">ĐTB</th>
                                            <th className="px-4 py-3 font-medium text-center">KT</th>
                                            <th className="px-4 py-3 font-medium text-center">BT</th>
                                            <th className="px-4 py-3 font-medium text-center text-slate-400">CC%</th>
                                            <th className="px-4 py-3 font-medium text-center text-slate-400">TĐ%</th>
                                            <th className="px-4 py-3 font-medium text-center text-slate-400">ĐTL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportStudents.map((s: any, i: number) => (
                                            <tr key={s.id} className={`hover:bg-slate-50/50 ${s.avgScore10 < 5 ? 'bg-red-50/30' : ''} cursor-pointer`} onClick={() => setSelectedStudent(s)}>
                                                <td className="px-4 py-3 text-center font-bold text-slate-500">#{i + 1}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                                                <td className={`px-4 py-3 text-center font-black text-lg ${getScore10Color(s.avgScore10)}`}>{s.avgScore10}</td>
                                                <td className={`px-4 py-3 text-center font-semibold ${getScore10Color(s.exams.avg10)}`}>{s.exams.avg10}</td>
                                                <td className={`px-4 py-3 text-center font-semibold ${getScore10Color(s.homework.avg10)}`}>{s.homework.avg10}</td>
                                                <td className="px-4 py-3 text-center text-slate-400">{s.attendance.rate}%</td>
                                                <td className="px-4 py-3 text-center text-slate-400">{s.progress.percent}%</td>
                                                <td className={`px-4 py-3 text-center ${s.points.total >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{s.points.total > 0 ? `+${s.points.total}` : s.points.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===================== TAB 3: ĐIỂM TÍCH LŨY ===================== */}
                <TabsContent value="points" className="space-y-6 outline-none mt-0">
                    <TeacherPointsTab classId={classId} />
                </TabsContent>

                {/* ===================== TAB 4: AI BÁO CÁO ===================== */}
                <TabsContent value="ai" className="space-y-6 outline-none mt-0">
                    <Card className="shadow-sm overflow-hidden border-violet-200 bg-gradient-to-br from-violet-50/30 to-indigo-50/20">
                        <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-violet-600" /> AI Phân tích Lớp học
                                </CardTitle>
                                <div className="flex gap-2">
                                    {aiReport && (
                                        <Button size="sm" variant="outline" className="border-violet-300 text-violet-700 h-9" onClick={exportAIReport}>
                                            <Download className="w-4 h-4 mr-1" /> Xuất Excel
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-5 h-9 rounded-lg"
                                        disabled={loadingAI}
                                        onClick={async () => {
                                            setLoadingAI(true);
                                            try {
                                                const result = await generateClassAIReport(className, report, classId);
                                                if (result.error) {
                                                    toast.error(result.error);
                                                    setAiReport(null);
                                                } else {
                                                    setAiReport(result.data || "Không thể tạo phân tích.");
                                                    toast.success("Đã phân tích và lưu báo cáo!");
                                                }
                                            } catch { toast.error("Đã xảy ra lỗi khi gọi AI."); setAiReport(null); } finally { setLoadingAI(false); }
                                        }}
                                    >
                                        {loadingAI ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang phân tích...</> : <><Sparkles className="w-4 h-4 mr-2" /> {aiReport ? 'Phân tích lại' : 'Tạo báo cáo AI'}</>}
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>AI đánh giá thang điểm 10, dự báo xu hướng, đề xuất cải thiện</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {aiReport ? (
                                <div className="bg-white rounded-xl p-6 border border-violet-100">
                                    <FormatAIText text={aiReport} />
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Sparkles className="w-16 h-16 text-violet-200 mx-auto mb-4" />
                                    <p className="text-sm text-violet-700 font-medium">Nhấn &quot;Tạo báo cáo AI&quot; để phân tích toàn diện</p>
                                    <p className="text-xs text-violet-500 mt-1">AI đánh giá ĐTB thang 10, phân tích HS yếu, gợi ý cải thiện</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* HS yếu cần cải thiện — với nút tạo bài tập */}
                    {reportStudents.filter((s: any) => s.avgScore10 < 5).length > 0 && (
                        <Card className="shadow-sm border-red-200 bg-red-50/30">
                            <CardHeader className="border-b border-red-100 py-3">
                                <CardTitle className="flex items-center gap-2 text-red-700 text-base">
                                    <AlertTriangle className="w-5 h-5" /> Học sinh cần cải thiện ({reportStudents.filter((s: any) => s.avgScore10 < 5).length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {reportStudents.filter((s: any) => s.avgScore10 < 5).map((s: any) => (
                                    <div key={s.id} className="bg-white rounded-lg border border-red-100">
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-red-200">
                                                    <AvatarFallback className="bg-red-100 text-red-600 text-xs">{s.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                                                        <Badge className="bg-red-50 text-red-600 border-red-200 text-[9px]" variant="outline">ĐTB: {s.avgScore10}/10</Badge>
                                                        {s.weakAreas?.slice(0, 3).map((area: string, idx: number) => (
                                                            <Badge key={idx} className="bg-amber-50 text-amber-600 border-amber-200 text-[9px]" variant="outline">Yếu: {area}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 text-xs h-8"
                                                disabled={loadingImprovement === s.id}
                                                onClick={() => handleImprovement(s)}
                                            >
                                                {loadingImprovement === s.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                                                Tạo bài tập cải thiện
                                            </Button>
                                        </div>
                                        {improvementResult[s.id] && (
                                            <div className="border-t border-red-100 p-4 bg-orange-50/30">
                                                <FormatAIText text={improvementResult[s.id]} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* HS xuất sắc — gợi ý phát huy */}
                    {reportStudents.filter((s: any) => s.avgScore10 >= 8).length > 0 && (
                        <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                            <CardHeader className="border-b border-emerald-100 py-3">
                                <CardTitle className="flex items-center gap-2 text-emerald-700 text-base">
                                    <Award className="w-5 h-5" /> Học sinh xuất sắc — Phát huy ({reportStudents.filter((s: any) => s.avgScore10 >= 8).length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-2">
                                    {reportStudents.filter((s: any) => s.avgScore10 >= 8).map((s: any) => (
                                        <div key={s.id} className="bg-white rounded-lg p-3 border border-emerald-100 flex items-center justify-between cursor-pointer hover:border-emerald-300" onClick={() => setSelectedStudent(s)}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-emerald-200">
                                                    <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xs">{s.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                                    <p className="text-[10px] text-emerald-600">⭐ Gợi ý: bài tập nâng cao, trợ giảng, dự án nghiên cứu</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-sm font-black" variant="outline">{s.avgScore10}/10</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ===================== TAB 5: XUẤT BÁO CÁO ===================== */}
                <TabsContent value="export" className="space-y-6 outline-none mt-0">
                    <Card className="shadow-sm">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-indigo-500" /> Xuất báo cáo dữ liệu</CardTitle>
                            <CardDescription>Chọn loại báo cáo để xuất file Excel (.xlsx)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => exportExcel("ranking")}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Trophy className="w-5 h-5" /></div>
                                        <div><p className="font-bold text-sm">Xếp hạng tổng hợp</p><p className="text-[11px] text-slate-500">ĐTB/10, KT/10, BT/10, CC%, TĐ%, ĐTL</p></div>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-2"><Download className="w-3 h-3 mr-2" /> Tải Excel</Button>
                                </div>
                                <div className="border rounded-xl p-5 hover:border-amber-300 hover:bg-amber-50/30 transition-colors cursor-pointer" onClick={() => exportExcel("attendance")}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
                                        <div><p className="font-bold text-sm">Báo cáo chuyên cần</p><p className="text-[11px] text-slate-500">Có mặt, Đi muộn, Có phép, Vắng</p></div>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-2"><Download className="w-3 h-3 mr-2" /> Tải Excel</Button>
                                </div>
                                <div className="border rounded-xl p-5 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer" onClick={() => exportExcel("exams")}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div>
                                        <div><p className="font-bold text-sm">Báo cáo kiểm tra</p><p className="text-[11px] text-slate-500">ĐTB KT /10, Số bài nộp</p></div>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-2"><Download className="w-3 h-3 mr-2" /> Tải Excel</Button>
                                </div>
                                <div className="border rounded-xl p-5 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => exportExcel("homework")}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
                                        <div><p className="font-bold text-sm">Báo cáo bài tập</p><p className="text-[11px] text-slate-500">ĐTB BT /10, Số bài nộp</p></div>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-2"><Download className="w-3 h-3 mr-2" /> Tải Excel</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ===================== STUDENT DETAIL DIALOG ===================== */}
            {selectedStudent && (
                <Dialog open={!!selectedStudent} onOpenChange={(open) => { if (!open) setSelectedStudent(null); }}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border">
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm">
                                        {selectedStudent.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-lg font-bold">{selectedStudent.name}</p>
                                    <p className="text-xs text-slate-500 font-normal">{selectedStudent.email}</p>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 mt-2">
                            {/* Score overview — thang 10 */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className={`text-center p-3 rounded-xl border ${getScore10Bg(selectedStudent.avgScore10)}`}>
                                    <p className="text-xs font-medium text-slate-500">ĐTB</p>
                                    <p className={`text-2xl font-black ${getScore10Color(selectedStudent.avgScore10)}`}>{selectedStudent.avgScore10}<span className="text-sm font-normal text-slate-400">/10</span></p>
                                </div>
                                <div className="text-center p-3 rounded-xl border bg-slate-50">
                                    <p className="text-xs font-medium text-slate-500">KT</p>
                                    <p className={`text-2xl font-black ${getScore10Color(selectedStudent.exams.avg10)}`}>{selectedStudent.exams.avg10}<span className="text-sm font-normal text-slate-400">/10</span></p>
                                </div>
                                <div className="text-center p-3 rounded-xl border bg-slate-50">
                                    <p className="text-xs font-medium text-slate-500">BT</p>
                                    <p className={`text-2xl font-black ${getScore10Color(selectedStudent.homework.avg10)}`}>{selectedStudent.homework.avg10}<span className="text-sm font-normal text-slate-400">/10</span></p>
                                </div>
                            </div>

                            {/* Exam scores & Missed Exams */}
                            {(() => {
                                const examList = reportData?.examList || [];
                                const missedExams = examList.filter((e: any) => !selectedStudent.exams.scores.find((s: any) => s.examId === e.id));
                                return (
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-indigo-500" /> Bài kiểm tra đã nộp ({selectedStudent.exams.completed}/{selectedStudent.exams.total})</h4>
                                            {selectedStudent.exams.scores.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {selectedStudent.exams.scores.map((e: any) => (
                                                        <div key={e.examId} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                                                            <div className="flex-1">
                                                                <span className="text-xs font-medium text-slate-700">{e.title}</span>
                                                                {e.date && <span className="text-[10px] text-slate-400 ml-2">{new Date(e.date).toLocaleDateString("vi-VN")}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-500">{e.score}/{e.total}</span>
                                                                <Badge className={`text-[10px] ${e.score10 >= 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`} variant="outline">
                                                                    {e.score10}/10
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Chưa nộp bài kiểm tra nào</p>}
                                        </div>
                                        {missedExams.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Bài kiểm tra chưa nộp</h4>
                                                <div className="space-y-1.5">
                                                    {missedExams.map((e: any) => {
                                                        const isSending = sendingReminder === `${selectedStudent.id}-${e.title}`;
                                                        return (
                                                            <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-red-50/50 rounded-lg border border-red-100">
                                                                <span className="text-xs font-medium text-red-700">{e.title}</span>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="h-6 text-[10px] bg-white border-red-200 text-red-600 hover:bg-red-50"
                                                                    disabled={isSending}
                                                                    onClick={() => handleSendReminder(selectedStudent.id, e.title, 'exam')}
                                                                >
                                                                    {isSending ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null}
                                                                    Nhắc nhở
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Homework scores & Missed Homework */}
                            {(() => {
                                const homeworkList = reportData?.homeworkList || [];
                                const missedHomework = homeworkList.filter((h: any) => !selectedStudent.homework.scores.find((s: any) => s.hwId === h.id));
                                return (
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-emerald-500" /> Bài tập đã nộp ({selectedStudent.homework.completed}/{selectedStudent.homework.total})</h4>
                                            {selectedStudent.homework.scores.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {selectedStudent.homework.scores.map((h: any) => (
                                                        <div key={h.hwId} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                                                            <span className="text-xs font-medium text-slate-700 truncate flex-1">{h.title}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-500">{h.score}/{h.total}</span>
                                                                <Badge className={`text-[10px] ${h.score10 >= 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`} variant="outline">
                                                                    {h.score10}/10
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Chưa có bài tập được chấm</p>}
                                        </div>
                                        {missedHomework.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Bài tập chưa nộp</h4>
                                                <div className="space-y-1.5">
                                                    {missedHomework.map((h: any) => {
                                                        const isSending = sendingReminder === `${selectedStudent.id}-${h.title}`;
                                                        return (
                                                            <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-red-50/50 rounded-lg border border-red-100">
                                                                <span className="text-xs font-medium text-red-700 truncate flex-1 pr-2">{h.title}</span>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="h-6 text-[10px] bg-white border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                                                                    disabled={isSending}
                                                                    onClick={() => handleSendReminder(selectedStudent.id, h.title, 'homework')}
                                                                >
                                                                    {isSending ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null}
                                                                    Nhắc nhở
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Quiz History */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-blue-500" /> Lịch sử trắc nghiệm ({selectedStudent.quizHistory?.length || 0} lần)</h4>
                                {selectedStudent.quizHistory?.length > 0 ? (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {selectedStudent.quizHistory.map((q: any) => (
                                            <div key={q.id} className="flex items-center justify-between px-3 py-2 bg-blue-50/50 rounded-lg">
                                                <div className="flex-1">
                                                    <span className="text-xs font-medium text-slate-700">{q.title}</span>
                                                    {q.date && <span className="text-[10px] text-slate-400 ml-2">{new Date(q.date).toLocaleDateString("vi-VN")}</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500">{q.score}%</span>
                                                    <Badge className={`text-[9px] ${q.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`} variant="outline">
                                                        {q.passed ? "Đạt" : "Chưa đạt"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-slate-400 italic">Chưa có lịch sử làm trắc nghiệm</p>}
                            </div>

                            {/* Points history */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" /> Điểm tích lũy: {selectedStudent.points.total > 0 ? `+${selectedStudent.points.total}` : selectedStudent.points.total}</h4>
                                {selectedStudent.points.history.length > 0 ? (
                                    <div className="space-y-1">
                                        {selectedStudent.points.history.map((p: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                                                {p.points > 0 ? <PlusCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <MinusCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                                <span className="text-xs text-slate-600 flex-1 truncate">{p.reason}</span>
                                                <span className={`text-xs font-bold ${p.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{p.points > 0 ? `+${p.points}` : p.points}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-slate-400 italic">Chưa có điểm tích lũy</p>}
                            </div>

                            {/* Attendance detail */}
                            <div className="grid grid-cols-4 gap-2">
                                <div className="text-center bg-emerald-50 rounded-lg p-2">
                                    <p className="text-lg font-black text-emerald-600">{selectedStudent.attendance.present}</p>
                                    <p className="text-[10px] text-emerald-700">Có mặt</p>
                                </div>
                                <div className="text-center bg-amber-50 rounded-lg p-2">
                                    <p className="text-lg font-black text-amber-600">{selectedStudent.attendance.late}</p>
                                    <p className="text-[10px] text-amber-700">Đi muộn</p>
                                </div>
                                <div className="text-center bg-blue-50 rounded-lg p-2">
                                    <p className="text-lg font-black text-blue-600">{selectedStudent.attendance.excused}</p>
                                    <p className="text-[10px] text-blue-700">Có phép</p>
                                </div>
                                <div className="text-center bg-red-50 rounded-lg p-2">
                                    <p className="text-lg font-black text-red-500">{selectedStudent.attendance.absent}</p>
                                    <p className="text-[10px] text-red-700">Vắng</p>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
