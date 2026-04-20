"use client";

import { useState, useMemo } from "react";
import {
    Activity, AlertTriangle, ShieldAlert, ShieldCheck,
    Users, Search, Filter, ChevronDown, ArrowUpDown,
    TrendingUp, TrendingDown, Minus, Eye, Clock,
    Zap, MonitorOff, MousePointerClick, User, Send,
    HelpCircle, Info, ChevronUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { fetchStudentActivityDetail, notifyParentAboutBehavior } from "@/lib/actions/behavior-analysis";

interface AdminBehaviorDashboardProps {
    data: any;
}

export default function AdminBehaviorDashboard({ data }: AdminBehaviorDashboardProps) {
    const [selectedCourse, setSelectedCourse] = useState<string>("all");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"risk" | "gaming" | "name">("risk");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    // Student detail modal
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailStudent, setDetailStudent] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState<{ logs: any[]; alerts: any[] } | null>(null);
    const [parentMsg, setParentMsg] = useState("");
    const [sending, setSending] = useState(false);
    const [glossaryOpen, setGlossaryOpen] = useState(false);

    if (!data) {
        return (
            <div className="text-center py-20">
                <Activity className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Không tải được dữ liệu</h3>
                <p className="text-sm text-slate-500">Vui lòng thử lại sau.</p>
            </div>
        );
    }

    const { overviewCards, riskDistribution, alertTrend, classComparison, studentDetails, courses, classes } = data;

    // Filter classes by course
    const filteredClassOptions = useMemo(() => {
        if (selectedCourse === "all") return classes || [];
        return (classes || []).filter((c: any) => c.courseId === selectedCourse);
    }, [selectedCourse, classes]);

    // Filter + sort students
    const filteredStudents = useMemo(() => {
        let students = studentDetails || [];
        if (selectedCourse !== "all") {
            students = students.filter((s: any) => {
                const cls = (classes || []).find((c: any) => c.id === s.classId);
                return cls?.courseId === selectedCourse;
            });
        }
        if (selectedClass !== "all") {
            students = students.filter((s: any) => s.classId === selectedClass);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            students = students.filter((s: any) =>
                s.studentName?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q) ||
                s.className?.toLowerCase().includes(q)
            );
        }
        // Sort
        students = [...students].sort((a: any, b: any) => {
            if (sortBy === "name") {
                return sortDir === "asc"
                    ? (a.studentName || "").localeCompare(b.studentName || "")
                    : (b.studentName || "").localeCompare(a.studentName || "");
            }
            if (sortBy === "gaming") {
                return sortDir === "asc" ? a.gamingScore - b.gamingScore : b.gamingScore - a.gamingScore;
            }
            // risk
            const riskOrder: Record<string, number> = { high_risk: 0, warning: 1, normal: 2 };
            const diff = (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
            if (diff !== 0) return sortDir === "asc" ? -diff : diff;
            return b.gamingScore - a.gamingScore;
        });
        return students;
    }, [studentDetails, classes, selectedCourse, selectedClass, searchQuery, sortBy, sortDir]);

    const toggleSort = (field: "risk" | "gaming" | "name") => {
        if (sortBy === field) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortDir(field === "name" ? "asc" : "desc");
        }
    };

    // Open student detail
    const openDetail = async (student: any) => {
        setDetailStudent(student);
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailData(null);
        setParentMsg("");
        const res = await fetchStudentActivityDetail(student.studentId, student.classId);
        setDetailData({ logs: res.logs || [], alerts: res.alerts || [] });
        setDetailLoading(false);
    };

    const handleNotifyParent = async () => {
        if (!detailStudent || !parentMsg.trim()) return;
        setSending(true);
        const res = await notifyParentAboutBehavior(detailStudent.studentId, parentMsg.trim());
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Đã gửi thông báo cho phụ huynh!");
            setDetailOpen(false);
        }
        setSending(false);
    };

    // Risk helpers
    const getRiskColor = (level: string) => {
        if (level === "high_risk") return "bg-red-100 text-red-700 border-red-200";
        if (level === "warning") return "bg-amber-100 text-amber-700 border-amber-200";
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    };
    const getRiskLabel = (level: string) => {
        if (level === "high_risk") return "Nguy cơ cao";
        if (level === "warning") return "Cần theo dõi";
        return "Bình thường";
    };
    const getTrendIcon = (trend: string) => {
        if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
        if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
        if (trend === "volatile") return <Zap className="w-3.5 h-3.5 text-amber-500" />;
        return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    Hành vi Học tập
                </h1>
                <p className="text-slate-500 mt-1 font-medium">
                    Theo dõi toàn diện hành vi, rủi ro gian lận và hiệu quả hoạt động theo lớp
                </p>
            </div>

            {/* Chú thích — Giải nghĩa ký hiệu */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                    onClick={() => setGlossaryOpen(prev => !prev)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                >
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <HelpCircle className="w-4 h-4 text-violet-500" />
                        Chú thích — Giải nghĩa các chỉ số & ký hiệu
                    </span>
                    {glossaryOpen
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                </button>
                {glossaryOpen && (
                    <div className="px-5 pb-5 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            {/* Gaming Score */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldAlert className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Gaming Score (ĐTB Gaming)</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Điểm đánh giá mức độ <strong>nghi ngờ gian lận</strong> của học sinh, thang từ <strong>0.0 → 1.0</strong>. Score càng cao = càng nhiều hành vi bất thường.</p>
                                    <p className="text-xs text-slate-400 mt-1 italic">Cách tính: AI phân tích kết hợp tốc độ trả lời, số lần chuyển tab, thời gian idle, tỷ lệ đoán nhanh, và xu hướng điểm số bất thường.</p>
                                </div>
                            </div>

                            {/* Risk Level */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Mức rủi ro (Risk Level)</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Phân loại dựa trên Gaming Score:</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] border bg-emerald-100 text-emerald-700 border-emerald-200">Bình thường: &lt; 0.3</Badge>
                                        <Badge variant="outline" className="text-[10px] border bg-amber-100 text-amber-700 border-amber-200">Cần theo dõi: 0.3 – 0.69</Badge>
                                        <Badge variant="outline" className="text-[10px] border bg-red-100 text-red-700 border-red-200">Nguy cơ cao: ≥ 0.7</Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Switch */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <MonitorOff className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Tab Switch (Chuyển tab)</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Số lần học sinh <strong>rời khỏi tab làm bài</strong> (chuyển sang cửa sổ khác). Nhiều lần chuyển tab (&gt; 5) có thể là dấu hiệu tra cứu đáp án bên ngoài.</p>
                                </div>
                            </div>

                            {/* Đoán nhanh */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <Zap className="w-4 h-4 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Đoán nhanh (Rapid Guess)</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Số câu trả lời <strong>dưới 3 giây</strong> — cho thấy học sinh chọn đáp án ngẫu nhiên mà không suy nghĩ. Tỷ lệ &gt; 40% sẽ cộng thêm điểm Gaming Score.</p>
                                </div>
                            </div>

                            {/* Tốc độ / Câu */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <Clock className="w-4 h-4 text-sky-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Tốc độ / Câu</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Thời gian trung bình để trả lời <strong>mỗi câu hỏi</strong> (tính bằng giây). Tốc độ quá nhanh (&lt; 3s) hoặc quá chậm có thể là dấu hiệu bất thường.</p>
                                </div>
                            </div>

                            {/* Xu hướng */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Xu hướng điểm (Score Trend)</p>
                                    <p className="text-xs text-slate-500 mt-0.5">So sánh điểm TB 5 bài gần nhất với 5 bài trước đó:</p>
                                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
                                        <span className="inline-flex items-center gap-1 text-emerald-600"><TrendingUp className="w-3 h-3" /> Tiến bộ</span>
                                        <span className="inline-flex items-center gap-1 text-slate-500"><Minus className="w-3 h-3" /> Ổn định</span>
                                        <span className="inline-flex items-center gap-1 text-red-500"><TrendingDown className="w-3 h-3" /> Giảm sút</span>
                                        <span className="inline-flex items-center gap-1 text-amber-500"><Zap className="w-3 h-3" /> Dao động bất thường</span>
                                    </div>
                                </div>
                            </div>

                            {/* Active / Idle */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <Activity className="w-4 h-4 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Active / Idle Time</p>
                                    <p className="text-xs text-slate-500 mt-0.5"><strong>Active</strong> = thời gian thực sự tương tác (click, gõ phím). <strong>Idle</strong> = thời gian không thao tác (idle &gt; 40% thời gian làm bài sẽ cộng Gaming Score). Tính bằng phút.</p>
                                </div>
                            </div>

                            {/* Biểu đồ so sánh lớp */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <Info className="w-4 h-4 text-violet-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">So sánh Lớp & Đánh giá Giáo viên</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Biểu đồ cột so sánh các lớp: Gaming Score TB cao = lớp có nhiều hành vi bất thường hơn → có thể đánh giá gián tiếp hiệu quả quản lý lớp của giáo viên.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-violet-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-violet-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">HS được theo dõi</p>
                    </div>
                    <p className="text-3xl font-black text-violet-700">{overviewCards.totalStudentsTracked}</p>
                </div>
                <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Nguy cơ cao</p>
                    </div>
                    <p className="text-3xl font-black text-red-700">{overviewCards.highRiskCount}</p>
                </div>
                <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Cảnh báo chưa xử lý</p>
                    </div>
                    <p className="text-3xl font-black text-amber-700">{overviewCards.unresolvedAlerts}<span className="text-sm font-medium text-slate-400 ml-1">/ {overviewCards.totalAlerts}</span></p>
                </div>
                <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">ĐTB Gaming Score</p>
                    </div>
                    <p className="text-3xl font-black text-indigo-700">{overviewCards.avgGamingScore}<span className="text-sm font-medium text-slate-400 ml-1">/ 1.0</span></p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-slate-200 p-4">
                <Filter className="w-4 h-4 text-slate-400" />
                <div className="relative">
                    <select
                        className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        value={selectedCourse}
                        onChange={e => { setSelectedCourse(e.target.value); setSelectedClass("all"); }}
                    >
                        <option value="all">Tất cả khóa học</option>
                        {(courses || []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                    <select
                        className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                    >
                        <option value="all">Tất cả lớp</option>
                        {filteredClassOptions.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Tìm học sinh, email, lớp..."
                        className="pl-9 bg-slate-50 border-slate-200"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart — Risk Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" /> Phân bổ Mức rủi ro
                    </h3>
                    {riskDistribution && riskDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={riskDistribution}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={45}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {riskDistribution.map((entry: any, index: number) => (
                                        <Cell key={entry.name} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => [`${value} HS`, ""]} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>

                {/* Line Chart — Alert Trend */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Xu hướng Cảnh báo (14 ngày)
                    </h3>
                    {alertTrend && alertTrend.some((t: any) => t.alerts > 0) ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={alertTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                    formatter={(value: any) => [`${value} cảnh báo`, ""]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="alerts"
                                    stroke="#ef4444"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: "#ef4444" }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">
                            <ShieldCheck className="w-5 h-5 mr-2 text-emerald-400" /> Không có cảnh báo trong 14 ngày qua
                        </div>
                    )}
                </div>
            </div>

            {/* Bar Chart — Class Comparison */}
            {classComparison && classComparison.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-violet-500" /> So sánh Lớp — Hành vi & Hiệu suất
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">Gaming score cao = nhiều hành vi bất thường hơn. Active/Idle tính trung bình theo phút.</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={classComparison} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="className"
                                tick={{ fontSize: 10, fill: "#64748b" }}
                                interval={0}
                                angle={-15}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                formatter={((value: any, name: any) => {
                                    if (name === "Gaming Score") return [`${value}`, "Gaming Score"];
                                    return [`${value} phút`, name];
                                }) as any}
                                labelFormatter={((label: any) => {
                                    const cls = classComparison.find((c: any) => c.className === label);
                                    return cls ? `${cls.className} — GV: ${cls.teacherName}` : label;
                                }) as any}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="avgGamingScore" name="Gaming Score" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="avgActiveTimeMin" name="Active (phút)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="avgIdleTimeMin" name="Idle (phút)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Class summary table */}
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50">
                                    <th className="py-2 px-3 text-left font-bold text-slate-600">Lớp</th>
                                    <th className="py-2 px-3 text-left font-bold text-slate-600">Giáo viên</th>
                                    <th className="py-2 px-3 text-center font-bold text-slate-600">Sĩ số</th>
                                    <th className="py-2 px-3 text-center font-bold text-slate-600">Nguy cơ</th>
                                    <th className="py-2 px-3 text-center font-bold text-slate-600">Cần TD</th>
                                    <th className="py-2 px-3 text-center font-bold text-slate-600">Gaming TB</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classComparison.map((cls: any) => (
                                    <tr key={cls.classId} className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors">
                                        <td className="py-2 px-3 font-semibold text-slate-800">{cls.className}</td>
                                        <td className="py-2 px-3 text-slate-600">{cls.teacherName}</td>
                                        <td className="py-2 px-3 text-center text-slate-700">{cls.studentCount}</td>
                                        <td className="py-2 px-3 text-center">
                                            {cls.highRiskCount > 0 ? (
                                                <span className="font-bold text-red-600">{cls.highRiskCount}</span>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            {cls.warningCount > 0 ? (
                                                <span className="font-bold text-amber-600">{cls.warningCount}</span>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            <span className={`font-bold ${cls.avgGamingScore >= 0.7 ? "text-red-600" : cls.avgGamingScore >= 0.3 ? "text-amber-600" : "text-emerald-600"}`}>
                                                {cls.avgGamingScore}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Student Details Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-500" /> Chi tiết Hành vi Học sinh
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{filteredStudents.length} kết quả</p>
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50">
                                    <th className="py-3 px-4 text-left font-bold text-slate-600 w-12">#</th>
                                    <th
                                        className="py-3 px-4 text-left font-bold text-slate-600 cursor-pointer hover:text-violet-600"
                                        onClick={() => toggleSort("name")}
                                    >
                                        <span className="flex items-center gap-1">Học sinh <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="py-3 px-4 text-left font-bold text-slate-600">Lớp</th>
                                    <th
                                        className="py-3 px-4 text-center font-bold text-slate-600 cursor-pointer hover:text-violet-600"
                                        onClick={() => toggleSort("risk")}
                                    >
                                        <span className="flex items-center justify-center gap-1">Rủi ro <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-center font-bold text-slate-600 cursor-pointer hover:text-violet-600"
                                        onClick={() => toggleSort("gaming")}
                                    >
                                        <span className="flex items-center justify-center gap-1">Gaming <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600">Tab Switch</th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600">Đoán nhanh</th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600">Tốc độ/Câu</th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600">Xu hướng</th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.slice(0, 60).map((s: any, idx: number) => (
                                    <tr
                                        key={`${s.studentId}-${s.classId}-${idx}`}
                                        className={`border-b border-slate-50 hover:bg-violet-50/30 transition-colors ${s.riskLevel === "high_risk" ? "bg-red-50/30" : s.riskLevel === "warning" ? "bg-amber-50/20" : ""
                                            }`}
                                    >
                                        <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                    {s.studentName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{s.studentName}</p>
                                                    <p className="text-[10px] text-slate-400">{s.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 text-xs">{s.className}</td>
                                        <td className="py-3 px-4 text-center">
                                            <Badge variant="outline" className={`text-[10px] border ${getRiskColor(s.riskLevel)} px-1.5 py-0`}>
                                                {getRiskLabel(s.riskLevel)}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`font-black text-base ${s.gamingScore >= 0.7 ? "text-red-600" : s.gamingScore >= 0.3 ? "text-amber-600" : "text-emerald-600"}`}>
                                                {s.gamingScore}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-semibold text-slate-700">{s.tabSwitchCount}</td>
                                        <td className="py-3 px-4 text-center font-semibold text-slate-700">{s.rapidGuessCount}</td>
                                        <td className="py-3 px-4 text-center text-slate-600 text-xs whitespace-nowrap">
                                            {(s.avgAnswerSpeedMs / 1000).toFixed(1)}s
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center gap-1">
                                                {getTrendIcon(s.scoreTrend)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <Button variant="ghost" size="sm" onClick={() => openDetail(s)} className="h-7 w-7 p-0">
                                                <Eye className="w-4 h-4 text-violet-500" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length > 60 && (
                            <div className="p-4 text-center border-t border-slate-100">
                                <p className="text-xs text-slate-400">Hiển thị 60/{filteredStudents.length} kết quả. Sử dụng bộ lọc để thu hẹp.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có dữ liệu hành vi.</p>
                        <p className="text-sm text-slate-400 mt-1">Dữ liệu sẽ tự động xuất hiện khi học sinh hoàn thành bài kiểm tra.</p>
                    </div>
                )}
            </div>

            {/* Student Detail Modal */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0">
                    <DialogHeader className="p-5 border-b bg-slate-50 shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-violet-500" />
                            Chi tiết Hành vi — {detailStudent?.studentName}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-5 flex-1 overflow-y-auto space-y-5">
                        {detailLoading ? (
                            <div className="py-10 text-center animate-pulse text-slate-400">Đang tải dữ liệu chi tiết...</div>
                        ) : (
                            <>
                                {/* Student info + stats */}
                                <div className="flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm">
                                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                                        {detailStudent?.studentName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 text-base">{detailStudent?.studentName}</p>
                                        <p className="text-xs text-slate-500">{detailStudent?.className} • {detailStudent?.courseName}</p>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] border ${getRiskColor(detailStudent?.riskLevel)} px-2 py-0.5`}>
                                        {getRiskLabel(detailStudent?.riskLevel)}
                                    </Badge>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Gaming Score</p>
                                        <p className={`text-xl font-black ${detailStudent?.gamingScore >= 0.7 ? "text-red-600" : detailStudent?.gamingScore >= 0.3 ? "text-amber-600" : "text-emerald-600"}`}>
                                            {detailStudent?.gamingScore}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Active</p>
                                        <p className="text-base font-black text-slate-800">{Math.round((detailStudent?.activeTimeS || 0) / 60)}p</p>
                                    </div>
                                    <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Idle</p>
                                        <p className="text-base font-black text-slate-800">{Math.round((detailStudent?.idleTimeS || 0) / 60)}p</p>
                                    </div>
                                    <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tab Switch</p>
                                        <p className="text-base font-black text-slate-800">{detailStudent?.tabSwitchCount}</p>
                                    </div>
                                    <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Đoán nhanh</p>
                                        <p className="text-base font-black text-slate-800">{detailStudent?.rapidGuessCount}</p>
                                    </div>
                                    <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tốc độ/Câu</p>
                                        <p className="text-base font-black text-slate-800">{((detailStudent?.avgAnswerSpeedMs || 0) / 1000).toFixed(1)}s</p>
                                    </div>
                                </div>

                                {/* AI Analysis */}
                                {detailStudent?.aiAnalysis && (
                                    <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4">
                                        <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                            <Zap className="w-4 h-4 text-violet-500" /> Phân tích AI
                                        </h4>
                                        <p className="text-xs text-slate-700 mb-1">{detailStudent.aiAnalysis.analysis_summary}</p>
                                        <p className="text-xs text-slate-500 italic">{detailStudent.aiAnalysis.recommendation}</p>
                                    </div>
                                )}

                                {/* Activity Logs */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-indigo-500" /> Hoạt động gần nhất
                                    </h4>
                                    {detailData?.logs && detailData.logs.length > 0 ? (
                                        <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                                            {detailData.logs.slice(0, 30).map((log: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded-lg border">
                                                    <MousePointerClick className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="font-semibold text-slate-700 min-w-[100px]">{log.activity_type}</span>
                                                    <span className="text-slate-500 truncate flex-1">{log.context_type}{log.metadata?.answer_speed_ms ? ` — ${(log.metadata.answer_speed_ms / 1000).toFixed(1)}s` : ""}</span>
                                                    <span className="text-slate-400 shrink-0 text-[10px]">{log.created_at ? new Date(log.created_at).toLocaleTimeString("vi-VN") : ""}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg italic">Chưa có activity logs.</p>
                                    )}
                                </div>

                                {/* Alerts */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-red-500" /> Cảnh báo ({detailData?.alerts?.length || 0})
                                    </h4>
                                    {detailData?.alerts && detailData.alerts.length > 0 ? (
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {detailData.alerts.map((alert: any) => (
                                                <div key={alert.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                                    <p className="text-xs font-semibold text-slate-800 mb-1">{alert.description}</p>
                                                    <p className="text-[10px] text-slate-400 text-right">{alert.created_at ? new Date(alert.created_at).toLocaleString("vi-VN") : ""}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg italic">Không có cảnh báo.</p>
                                    )}
                                </div>

                                {/* Notify parent */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <Send className="w-4 h-4 text-violet-500" /> Nhắc nhở Phụ huynh
                                    </h4>
                                    <div className="bg-violet-50/50 p-4 border border-violet-100 rounded-xl space-y-3">
                                        <p className="text-xs text-slate-600">Gửi thông báo trực tiếp đến phụ huynh của học sinh.</p>
                                        <Textarea
                                            placeholder="Nhập nội dung nhắc nhở..."
                                            className="bg-white text-sm"
                                            rows={3}
                                            value={parentMsg}
                                            onChange={e => setParentMsg(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t bg-white shrink-0">
                        <Button variant="outline" onClick={() => setDetailOpen(false)}>Đóng</Button>
                        <Button
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                            disabled={sending || parentMsg.trim().length === 0}
                            onClick={handleNotifyParent}
                        >
                            {sending ? "Đang gửi..." : "Gửi Phụ huynh"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
