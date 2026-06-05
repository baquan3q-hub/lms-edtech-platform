"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
    BarChart3, Download, ChevronDown,
    Users, GraduationCap, School, LayoutGrid, CalendarOff,
} from "lucide-react";
import { getAttendanceOverview } from "@/lib/actions/attendance";
import { exportAttendanceExcel } from "./export/exportAttendanceExcel";
import OverviewTab from "./tabs/OverviewTab";
import TeacherTab from "./tabs/TeacherTab";
import StudentTab from "./tabs/StudentTab";
import ClassDetailTab from "./tabs/ClassDetailTab";
import TeacherLeaveTab from "./tabs/TeacherLeaveTab";

export default function AdminAttendanceClient() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
        overview: true,
        teachers: false,
        students: false,
        classes: false,
        teacherLeave: false,
    });

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const keyMap: Record<string, string> = {
            overview: "overview",
            teachers: "teachers",
            students: "students",
            classes: "classes",
            "teacher-leave": "teacherLeave",
        };
        const key = keyMap[value];
        if (key && !visitedTabs[key]) {
            setVisitedTabs((prev) => ({ ...prev, [key]: true }));
        }
    };

    useEffect(() => {
        loadOverview();
    }, [month, year]);

    const loadOverview = async () => {
        setLoading(true);
        const { data: overview, error } = await getAttendanceOverview(month, year);
        if (error) toast.error("Lỗi tải thống kê");
        setData(overview);
        setLoading(false);
    };

    const handleExport = async () => {
        if (!data) return;
        try {
            await exportAttendanceExcel({
                month,
                year,
                classSummaries: data.classSummaries || [],
                studentsHighAbsence: data.studentsHighAbsence || [],
            });
            toast.success("Đã xuất file Excel thành công!");
        } catch {
            toast.error("Lỗi xuất file Excel");
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-extrabold flex items-center gap-2.5">
                            <BarChart3 className="w-7 h-7" />
                            Quản lý Điểm danh
                        </h2>
                        <p className="text-blue-100 text-sm mt-1">
                            Theo dõi giáo viên, học sinh và xuất báo cáo chuyên cần toàn trường
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters + Export */}
            <div className="flex flex-wrap gap-3 items-end bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tháng</label>
                    <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                        <SelectTrigger className="w-[110px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Năm</label>
                    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[year - 1, year, year + 1].map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="ml-auto">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={!data || data.totalSessions === 0}
                        className="gap-1.5"
                    >
                        <Download className="w-4 h-4" />
                        Xuất Excel
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                </div>
            </div>

            {/* Tab System */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-sm h-auto flex-wrap">
                    <TabsTrigger
                        value="overview"
                        className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-lg gap-1.5 px-4 py-2"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Tổng quan
                    </TabsTrigger>
                    <TabsTrigger
                        value="teachers"
                        className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-lg gap-1.5 px-4 py-2"
                    >
                        <GraduationCap className="w-4 h-4" />
                        Giáo viên
                    </TabsTrigger>
                    <TabsTrigger
                        value="students"
                        className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-lg gap-1.5 px-4 py-2"
                    >
                        <Users className="w-4 h-4" />
                        Học sinh
                    </TabsTrigger>
                    <TabsTrigger
                        value="classes"
                        className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-lg gap-1.5 px-4 py-2"
                    >
                        <School className="w-4 h-4" />
                        Chi tiết Lớp
                    </TabsTrigger>
                    <TabsTrigger
                        value="teacher-leave"
                        className="data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 data-[state=active]:shadow-sm rounded-lg gap-1.5 px-4 py-2"
                    >
                        <CalendarOff className="w-4 h-4" />
                        Đơn GV nghỉ
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Overview */}
                <div className={activeTab === "overview" ? "mt-0 block animate-in fade-in duration-200" : "hidden"}>
                    <OverviewTab month={month} year={year} data={data} loading={loading} />
                </div>

                {/* Tab 2: Teachers */}
                {visitedTabs.teachers && (
                    <div className={activeTab === "teachers" ? "mt-0 block animate-in fade-in duration-200" : "hidden"}>
                        <TeacherTab month={month} year={year} />
                    </div>
                )}

                {/* Tab 3: Students */}
                {visitedTabs.students && (
                    <div className={activeTab === "students" ? "mt-0 block animate-in fade-in duration-200" : "hidden"}>
                        <StudentTab month={month} year={year} />
                    </div>
                )}

                {/* Tab 4: Class Detail */}
                {visitedTabs.classes && (
                    <div className={activeTab === "classes" ? "mt-0 block animate-in fade-in duration-200" : "hidden"}>
                        <ClassDetailTab month={month} year={year} />
                    </div>
                )}

                {/* Tab 5: Teacher Leave Requests */}
                {visitedTabs.teacherLeave && (
                    <div className={activeTab === "teacher-leave" ? "mt-0 block animate-in fade-in duration-200" : "hidden"}>
                        <TeacherLeaveTab month={month} year={year} />
                    </div>
                )}
            </Tabs>
        </div>
    );
}
