"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart
} from "recharts";
import {
    Loader2, Users, ShieldAlert, AlertTriangle, Eye, Activity, TrendingDown,
    TrendingUp, Minus, ChevronDown, ChevronUp, Send, User, Clock,
    Zap, MonitorSmartphone, Timer, CheckCircle2, FileText, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { fetchTeacherClassBehaviorOverview, fetchStudentBehaviorHistory, notifyParentAboutBehavior } from "@/lib/actions/behavior-analysis";

export default function TeacherBehaviorClient({ classes }: { classes: any[] }) {
    const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [detailHistory, setDetailHistory] = useState<Record<string, any>>({});
    const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

    // Notify parent modal
    const [notifyStudent, setNotifyStudent] = useState<any>(null);
    const [notifyMessage, setNotifyMessage] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!selectedClassId) return;
        const load = async () => {
            setLoading(true);
            setExpandedId(null);
            const res = await fetchTeacherClassBehaviorOverview(selectedClassId);
            setData(res.data);
            setLoading(false);
        };
        load();
    }, [selectedClassId]);

    const handleNotify = async () => {
        if (!notifyStudent || !notifyMessage.trim()) return;
        setSending(true);
        const res = await notifyParentAboutBehavior(notifyStudent.student_id, notifyMessage.trim());
        if (res.error) toast.error(res.error);
        else { toast.success("Đã gửi thông báo cho phụ huynh!"); setNotifyStudent(null); }
        setSending(false);
    };

    const getRiskBadge = (level: string) => {
        const map: Record<string, { bg: string; label: string }> = {
            high_risk: { bg: "bg-red-100 text-red-700 border-red-200", label: "Nguy cơ cao" },
            warning: { bg: "bg-amber-100 text-amber-700 border-amber-200", label: "Cần theo dõi" },
            normal: { bg: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Bình thường" },
        };
        const s = map[level] || { bg: "bg-slate-100 text-slate-500 border-slate-200", label: "Chưa có" };
        return <Badge variant="outline" className={`text-[10px] ${s.bg} border`}>{s.label}</Badge>;
    };

    const getTrendIcon = (trend: string) => {
        if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
        if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
        return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    };

    const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#cbd5e1"];

    return (
        <div className="space-y-6">
            {/* Class Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <span className="font-bold text-slate-700 text-sm">Chọn lớp giám sát:</span>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-[320px] border-slate-200">
                        <SelectValue placeholder="Chọn lớp..." />
                    </SelectTrigger>
                    <SelectContent>
                        {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name || "Lớp"} — {c.course?.name || ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm">Đang tải dữ liệu hành vi...</p>
                </div>
            ) : !data ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Chưa có dữ liệu hành vi cho lớp này.</p>
                    <p className="text-xs text-slate-400 mt-1">Dữ liệu sẽ được thu thập khi học sinh làm bài kiểm tra.</p>
                </div>
            ) : (
                <>
                    {/* ═══ OVERVIEW STATS ═══ */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <Card className="shadow-sm"><CardContent className="p-4 text-center">
                            <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                            <p className="text-2xl font-black text-slate-800">{data.overview.totalStudents}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Tổng học sinh</p>
                        </CardContent></Card>
                        <Card className="shadow-sm border-red-100"><CardContent className="p-4 text-center">
                            <ShieldAlert className="w-5 h-5 text-red-500 mx-auto mb-1" />
                            <p className="text-2xl font-black text-red-600">{data.overview.highRiskCount}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Nguy cơ cao</p>
                        </CardContent></Card>
                        <Card className="shadow-sm border-amber-100"><CardContent className="p-4 text-center">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                            <p className="text-2xl font-black text-amber-600">{data.overview.warningCount}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Cần theo dõi</p>
                        </CardContent></Card>
                        <Card className="shadow-sm border-emerald-100"><CardContent className="p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                            <p className="text-2xl font-black text-emerald-600">{data.overview.normalCount}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Bình thường</p>
                        </CardContent></Card>
                        <Card className="shadow-sm border-violet-100"><CardContent className="p-4 text-center">
                            <Activity className="w-5 h-5 text-violet-500 mx-auto mb-1" />
                            <p className="text-2xl font-black text-violet-600">{data.overview.unresolvedAlertCount}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Cảnh báo chưa xử lý</p>
                        </CardContent></Card>
                    </div>

                    {/* ═══ CHARTS ═══ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pie Chart */}
                        <Card className="shadow-sm">
                            <CardContent className="p-5">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-indigo-500" /> Phân bổ mức độ rủi ro
                                </h3>
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                        <PieChart>
                                            <Pie data={data.riskDistribution} dataKey="value" nameKey="name"
                                                cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                                                paddingAngle={3} strokeWidth={2}>
                                                {data.riskDistribution.map((entry: any, i: number) => (
                                                    <Cell key={i} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => [`${value} HS`, ""]} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bar Chart */}
                        <Card className="shadow-sm">
                            <CardContent className="p-5">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-purple-500" /> Điểm rủi ro theo HS (%)
                                </h3>
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                        <BarChart data={data.barChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                            <Tooltip content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
                                                        <p className="font-bold text-slate-800 mb-1">{d.fullName}</p>
                                                        <p>Rủi ro: <span className="font-bold text-red-600">{d.gaming}%</span></p>
                                                        <p>Tab switch: {d.tabSwitch} | Đoán bừa: {d.rapidGuess}</p>
                                                        <p>Điểm TB: {d.avgScore}%</p>
                                                    </div>
                                                );
                                            }} />
                                            <Bar dataKey="gaming" name="Rủi ro %" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={35}>
                                                {(data.barChartData || []).map((_: any, i: number) => (
                                                    <Cell key={i} fill={
                                                        data.barChartData[i].gaming >= 70 ? "#ef4444"
                                                            : data.barChartData[i].gaming >= 30 ? "#f59e0b" : "#10b981"
                                                    } />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══ CẢNH BÁO TỨC THÌ ═══ */}
                    {data.immediateAlerts.length > 0 && (
                        <Card className="shadow-sm border-red-200 bg-red-50/30">
                            <CardContent className="p-5">
                                <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" /> Cảnh báo tức thì ({data.immediateAlerts.length})
                                </h3>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {data.immediateAlerts.map((alert: any, i: number) => (
                                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                                            alert.severity === "high" ? "bg-red-50 border-red-200"
                                                : alert.severity === "medium" ? "bg-amber-50 border-amber-200"
                                                    : "bg-yellow-50 border-yellow-200"
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{alert.icon}</span>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{alert.student_name}</p>
                                                    <p className="text-[10px] text-slate-600">{alert.message}</p>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="h-7 text-[10px] shrink-0"
                                                onClick={() => setExpandedId(expandedId === alert.student_id ? null : alert.student_id)}>
                                                <Eye className="w-3 h-3 mr-1" /> Chi tiết
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ═══ METRICS TRUNG BÌNH LỚP ═══ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                            <Timer className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                            <p className="text-lg font-black text-slate-800">{(data.overview.avgAnswerSpeedMs / 1000).toFixed(1)}s</p>
                            <p className="text-[10px] text-slate-500">TB tốc độ/câu</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                            <MonitorSmartphone className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                            <p className="text-lg font-black text-slate-800">{data.overview.avgTabSwitch}</p>
                            <p className="text-[10px] text-slate-500">TB chuyển tab</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                            <Zap className="w-4 h-4 text-red-500 mx-auto mb-1" />
                            <p className="text-lg font-black text-slate-800">{data.overview.avgRapidGuess}</p>
                            <p className="text-[10px] text-slate-500">TB đoán bừa</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                            <ShieldAlert className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                            <p className="text-lg font-black text-slate-800">{(data.overview.avgGamingScore * 100).toFixed(0)}%</p>
                            <p className="text-[10px] text-slate-500">TB rủi ro lớp</p>
                        </div>
                    </div>

                    {/* ═══ CHI TIẾT TỪNG HỌC SINH ═══ */}
                    <Card className="shadow-sm">
                        <CardContent className="p-5">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-500" /> Chi tiết hành vi từng học sinh ({data.students.length})
                            </h3>
                            <div className="space-y-2">
                                {data.students.map((st: any, idx: number) => {
                                    const isExpanded = expandedId === st.student_id;
                                    const risk = st.behavior?.risk_level || "none";

                                    return (
                                        <div key={st.student_id} className={`border rounded-xl overflow-hidden transition-all ${
                                            risk === "high_risk" ? "border-red-200 bg-red-50/20"
                                                : risk === "warning" ? "border-amber-200 bg-amber-50/10"
                                                    : "border-slate-200"
                                        }`}>
                                            {/* Row header */}
                                            <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                onClick={() => setExpandedId(isExpanded ? null : st.student_id)}>
                                                <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                                                    {st.avatar_url ? (
                                                        <img src={st.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-sm text-slate-800 truncate">{st.student_name}</p>
                                                        {getRiskBadge(risk)}
                                                    </div>
                                                </div>
                                                {/* Quick stats */}
                                                <div className="hidden sm:flex items-center gap-4 text-[10px] text-slate-500 shrink-0">
                                                    <span title="Rủi ro">🎯 {st.behavior ? `${(st.behavior.gaming_score * 100).toFixed(0)}%` : "—"}</span>
                                                    <span title="Tab switch">📱 {st.behavior?.tab_switch_count ?? "—"}</span>
                                                    <span title="Đoán bừa">⚡ {st.behavior?.rapid_guess_count ?? "—"}</span>
                                                    <span title="Xu hướng điểm" className="flex items-center gap-0.5">
                                                        {getTrendIcon(st.behavior?.score_trend || "stable")}
                                                        {st.behavior?.avg_score_recent ? `${st.behavior.avg_score_recent}%` : "—"}
                                                    </span>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                                            </div>

                                            {/* Expanded detail — Phase 2 */}
                                            {isExpanded && (
                                                <StudentExpandedDetail
                                                    student={st}
                                                    classId={selectedClassId}
                                                    detailHistory={detailHistory}
                                                    setDetailHistory={setDetailHistory}
                                                    loadingHistory={loadingHistory}
                                                    setLoadingHistory={setLoadingHistory}
                                                    onNotify={() => { setNotifyStudent(st); setNotifyMessage(""); }}
                                                    getRiskBadge={getRiskBadge}
                                                />
                                            )}

                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Notify Parent Dialog */}
            <Dialog open={!!notifyStudent} onOpenChange={(open) => { if (!open) setNotifyStudent(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Send className="w-4 h-4 text-violet-500" /> Gửi nhắc nhở phụ huynh
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-slate-600">
                            Học sinh: <span className="font-bold text-slate-800">{notifyStudent?.student_name}</span>
                        </p>
                        <Textarea placeholder="Nhập nội dung nhắc nhở (VD: Em có dấu hiệu chuyển tab nhiều lần khi làm bài kiểm tra...)"
                            rows={4} value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} className="text-sm" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNotifyStudent(null)}>Hủy</Button>
                        <Button className="bg-violet-600 hover:bg-violet-700 text-white"
                            disabled={sending || !notifyMessage.trim()} onClick={handleNotify}>
                            {sending ? "Đang gửi..." : "Gửi phụ huynh"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// Phase 2: Component chi tiết từng HS (lazy-load)
// ═══════════════════════════════════════════════════

function StudentExpandedDetail({
    student, classId, detailHistory, setDetailHistory,
    loadingHistory, setLoadingHistory, onNotify, getRiskBadge
}: {
    student: any; classId: string;
    detailHistory: Record<string, any>;
    setDetailHistory: (v: Record<string, any>) => void;
    loadingHistory: string | null;
    setLoadingHistory: (v: string | null) => void;
    onNotify: () => void;
    getRiskBadge: (level: string) => React.ReactNode;
}) {
    const st = student;
    const historyKey = `${st.student_id}_${classId}`;
    const history = detailHistory[historyKey];
    const isLoadingThis = loadingHistory === historyKey;

    // Lazy-load detailed history when component mounts
    useEffect(() => {
        if (!history && !isLoadingThis) {
            setLoadingHistory(historyKey);
            fetchStudentBehaviorHistory(st.student_id, classId).then(res => {
                if (res.data) {
                    setDetailHistory({ ...detailHistory, [historyKey]: res.data });
                }
                setLoadingHistory(null);
            });
        }
    }, []);

    return (
        <div className="border-t border-slate-100 bg-slate-50/30 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Metrics tổng hợp (từ behavior score) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Tốc độ/câu</p>
                    <p className="text-base font-black text-slate-800">
                        {st.behavior?.avg_answer_speed_ms ? `${(st.behavior.avg_answer_speed_ms / 1000).toFixed(1)}s` : "—"}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Chuyển tab</p>
                    <p className="text-base font-black text-slate-800">{st.behavior?.tab_switch_count ?? "—"}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Đoán bừa</p>
                    <p className="text-base font-black text-slate-800">{st.behavior?.rapid_guess_count ?? "—"}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Idle</p>
                    <p className="text-base font-black text-slate-800">
                        {st.behavior?.total_idle_time_s ? `${st.behavior.total_idle_time_s}s` : "—"}
                    </p>
                </div>
            </div>

            {/* AI Analysis */}
            {st.behavior?.ai_analysis?.analysis_summary && (
                <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-700 mb-1">🤖 Nhận xét AI:</p>
                    <p className="text-xs text-slate-700">{st.behavior.ai_analysis.analysis_summary}</p>
                    {st.behavior.ai_analysis.recommendation && (
                        <p className="text-[10px] text-indigo-600 mt-1">💡 {st.behavior.ai_analysis.recommendation}</p>
                    )}
                </div>
            )}

            {/* Phase 2: Loading state */}
            {isLoadingThis && (
                <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Đang tải lịch sử chi tiết...</span>
                </div>
            )}

            {/* Phase 2: Detailed History */}
            {history && (
                <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-blue-50/50 rounded-lg p-2.5 border border-blue-100 text-center">
                            <p className="text-[8px] text-blue-500 font-bold uppercase">Tổng bài làm</p>
                            <p className="text-sm font-black text-blue-700">{history.summary.totalSubmissions}</p>
                        </div>
                        <div className="bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-100 text-center">
                            <p className="text-[8px] text-emerald-500 font-bold uppercase">Điểm TB</p>
                            <p className="text-sm font-black text-emerald-700">{history.summary.avgPercentage}%</p>
                        </div>
                        <div className="bg-orange-50/50 rounded-lg p-2.5 border border-orange-100 text-center">
                            <p className="text-[8px] text-orange-500 font-bold uppercase">Tổng tab switch</p>
                            <p className="text-sm font-black text-orange-700">{history.summary.totalTabSwitches}</p>
                        </div>
                        <div className="bg-red-50/50 rounded-lg p-2.5 border border-red-100 text-center">
                            <p className="text-[8px] text-red-500 font-bold uppercase">Tổng đoán bừa</p>
                            <p className="text-sm font-black text-red-700">{history.summary.totalRapidGuesses}</p>
                        </div>
                    </div>

                    {/* Trend Chart */}
                    {history.trendData.length > 1 && (
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <h4 className="text-[10px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                                <BarChart3 className="w-3 h-3 text-indigo-500" /> Xu hướng điểm số
                            </h4>
                            <div className="h-[120px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={80}>
                                    <AreaChart data={history.trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id={`grad_${st.student_id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                        <Tooltip content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-[10px]">
                                                    <p className="font-bold text-slate-800">{d.title}</p>
                                                    <p>Điểm: <span className="font-bold text-indigo-600">{d.score}%</span></p>
                                                    <p className="text-slate-400">{d.date}</p>
                                                </div>
                                            );
                                        }} />
                                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
                                            fill={`url(#grad_${st.student_id})`} dot={{ r: 3, fill: "#6366f1" }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Detailed submissions with behavior per submission */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-500" /> Lịch sử chi tiết ({history.submissions.length} bài)
                        </h4>
                        {history.submissions.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic p-3 bg-slate-50 rounded-lg">Chưa có bài nộp.</p>
                        ) : (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                                {history.submissions.map((sub: any) => (
                                    <div key={sub.id} className={`bg-white rounded-lg border p-3 hover:shadow-sm transition-all ${
                                        sub.behavior.warnings > 0 ? "border-red-200" 
                                            : sub.behavior.tab_switches >= 5 ? "border-amber-200"
                                                : "border-slate-100"
                                    }`}>
                                        {/* Header row */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Badge className={`text-[8px] border-none shrink-0 ${
                                                    sub.type === "exam" ? "bg-purple-100 text-purple-700"
                                                        : sub.type === "quiz" ? "bg-blue-100 text-blue-700"
                                                            : "bg-slate-100 text-slate-600"
                                                }`}>{sub.type === "exam" ? "Kiểm tra" : sub.type === "quiz" ? "Quiz" : "Bài tập"}</Badge>
                                                <p className="text-xs font-semibold text-slate-800 truncate">{sub.title}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-sm font-black ${
                                                    sub.percentage >= 80 ? "text-emerald-600"
                                                        : sub.percentage >= 50 ? "text-amber-600" : "text-red-600"
                                                }`}>{sub.score}/{sub.total}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(sub.submitted_at).toLocaleDateString("vi-VN")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Behavior metrics per submission */}
                                        {sub.behavior.has_data && (
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                                    sub.behavior.tab_switches >= 8 ? "bg-red-100 text-red-700"
                                                        : sub.behavior.tab_switches >= 3 ? "bg-amber-100 text-amber-700"
                                                            : "bg-slate-100 text-slate-500"
                                                }`}>
                                                    <MonitorSmartphone className="w-2.5 h-2.5" />
                                                    Tab: {sub.behavior.tab_switches}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                                    sub.behavior.rapid_guesses >= 5 ? "bg-red-100 text-red-700"
                                                        : sub.behavior.rapid_guesses >= 2 ? "bg-amber-100 text-amber-700"
                                                            : "bg-slate-100 text-slate-500"
                                                }`}>
                                                    <Zap className="w-2.5 h-2.5" />
                                                    Đoán bừa: {sub.behavior.rapid_guesses}
                                                </span>
                                                {sub.behavior.avg_speed_ms > 0 && (
                                                    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                                        sub.behavior.avg_speed_ms < 2000 ? "bg-red-100 text-red-700"
                                                            : sub.behavior.avg_speed_ms < 5000 ? "bg-amber-100 text-amber-700"
                                                                : "bg-slate-100 text-slate-500"
                                                    }`}>
                                                        <Timer className="w-2.5 h-2.5" />
                                                        {(sub.behavior.avg_speed_ms / 1000).toFixed(1)}s/câu
                                                    </span>
                                                )}
                                                {sub.behavior.total_idle_s > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        Idle: {sub.behavior.total_idle_s}s
                                                    </span>
                                                )}
                                                {sub.behavior.warnings > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        {sub.behavior.warnings} cảnh báo
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-[10px] h-7 border-violet-200 text-violet-700"
                    onClick={(e) => { e.stopPropagation(); onNotify(); }}>
                    <Send className="w-3 h-3 mr-1" /> Nhắc nhở phụ huynh
                </Button>
            </div>
        </div>
    );
}
