"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, CalendarDays, ClipboardCheck, BookOpen, ChevronDown, ChevronUp, AlertCircle, UserCheck, Calendar } from "lucide-react";
import EnrollStudentCombobox from "@/components/admin/EnrollStudentCombobox";
import ImportStudentsDialog from "@/components/admin/ImportStudentsDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScheduleManagerClient from "@/app/(dashboard)/teacher/classes/[id]/ScheduleManagerClient";
import SessionContentManagerClient from "@/components/teacher/SessionContentManagerClient";
import { assignSubstituteTeacher } from "@/lib/actions/schedule";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

// Mapping từ day_of_week số → tên tiếng Việt
const DAY_NAMES: Record<number, string> = {
    0: "CN", 1: "T.2", 2: "T.3", 3: "T.4", 4: "T.5", 5: "T.6", 6: "T.7"
};

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AdminClassTabsClient({
    classId,
    activeCount,
    allStudents,
    enrolledIds,
    enrollments,
    schedules,
    allRooms,
    attendanceData,
    absenceRequests = [],
    generatedSessions = [],
    allTeachers = [],
}: {
    classId: string;
    activeCount: number;
    allStudents: any[];
    enrolledIds: string[];
    enrollments: any[];
    schedules: any[];
    allRooms: any[];
    attendanceData: any;
    absenceRequests?: any[];
    generatedSessions?: any[];
    allTeachers?: any[];
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    
    // Xem thêm / thu gọn session columns
    const INITIAL_SESSION_COLS = 5;
    const [visibleSessionCount, setVisibleSessionCount] = useState(INITIAL_SESSION_COLS);

    // Build a set of valid day_of_week from schedules (e.g. [1, 4] for Thứ 2 & Thứ 5)
    const validDays = new Set<number>(schedules.map((s: any) => s.day_of_week));

    // Filter attendance sessions to those matching schedule days
    const allSessions = (attendanceData?.sessions || []);
    const filteredSessions = allSessions.filter((sess: any) => {
        const date = new Date(sess.session_date);
        // getDay() returns 0=Sun,1=Mon,...,6=Sat (matches day_of_week in DB)
        return validDays.size === 0 || validDays.has(date.getDay());
    });

    const visibleSessions = filteredSessions.slice(0, visibleSessionCount);
    const hasMoreSessions = filteredSessions.length > visibleSessionCount;
    const isExpanded = visibleSessionCount > INITIAL_SESSION_COLS;

    return (
        <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-slate-100 p-1 rounded-xl mb-6">
                <TabsTrigger value="students" className="rounded-lg font-medium">
                    <Users className="w-4 h-4 mr-2" />
                    Học sinh ({activeCount})
                </TabsTrigger>
                <TabsTrigger value="schedule" className="rounded-lg font-medium">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Quản lý Lịch
                </TabsTrigger>
                <TabsTrigger value="attendance" className="rounded-lg font-medium">
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Điểm danh
                </TabsTrigger>
            </TabsList>

            {/* TAB HỌC SINH */}
            <TabsContent value="students" className="space-y-6">
                {/* Enroll student section */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Thêm học sinh vào lớp
                            </h3>
                        </div>
                        <ImportStudentsDialog classId={classId} />
                    </div>
                    <EnrollStudentCombobox
                        classId={classId}
                        students={allStudents}
                        enrolledIds={enrolledIds}
                    />
                </div>

                {/* Enrolled students table */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Danh sách Học sinh ({activeCount})
                            </h3>
                        </div>
                    </div>

                    {enrollments.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">
                                Chưa có học sinh nào trong lớp
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                Sử dụng ô tìm kiếm bên trên để thêm học sinh.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-100 hover:bg-transparent">
                                    <TableHead className="text-gray-500 font-medium">#</TableHead>
                                    <TableHead className="text-gray-500 font-medium">Họ và tên</TableHead>
                                    <TableHead className="text-gray-500 font-medium">Email</TableHead>
                                    <TableHead className="text-gray-500 font-medium">SĐT</TableHead>
                                    <TableHead className="text-gray-500 font-medium">Trạng thái</TableHead>
                                    <TableHead className="text-gray-500 font-medium text-right">Ngày xếp lớp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrollments.map((enrollment: any, index: number) => (
                                    <TableRow key={enrollment.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                                        <TableCell className="text-gray-400">{index + 1}</TableCell>
                                        <TableCell className="font-medium text-gray-900">{enrollment.student?.full_name || "—"}</TableCell>
                                        <TableCell className="text-gray-600">{enrollment.student?.email || "—"}</TableCell>
                                        <TableCell className="text-gray-500">{enrollment.student?.phone || "—"}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    enrollment.status === "active"
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                        : enrollment.status === "dropped"
                                                            ? "bg-red-50 text-red-600 border-red-200"
                                                            : "bg-blue-50 text-blue-600 border-blue-200"
                                                }
                                            >
                                                {enrollment.status === "active"
                                                    ? "Đang học"
                                                    : enrollment.status === "dropped"
                                                        ? "Đã nghỉ"
                                                        : "Hoàn thành"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-right">{formatDate(enrollment.enrolled_at)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </TabsContent>

            {/* TAB LỊCH */}
            <TabsContent value="schedule" className="space-y-6">
                {/* Session Content Manager */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-500 pl-3 mb-1">
                        Giáo án & Nội dung Buổi học
                    </h3>
                    <p className="text-sm text-slate-500 pl-4 mb-6">
                        Xem và chỉnh sửa nội dung, ghi chú và tài liệu đính kèm cho từng buổi học cụ thể.
                    </p>
                    <SessionContentManagerClient 
                        classId={classId} 
                        sessions={generatedSessions || []} 
                        readOnly={true}
                    />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <ScheduleManagerClient
                        classId={classId}
                        initialSchedules={schedules}
                        allRooms={allRooms}
                        readOnly={false}
                    />
                </div>

                {/* Generated Sessions List */}
                {generatedSessions.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-base font-semibold text-gray-900">
                                    Buổi học đã lên lịch ({generatedSessions.length} buổi)
                                </h3>
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-100 hover:bg-transparent">
                                        <TableHead className="text-gray-500 font-medium w-10">#</TableHead>
                                        <TableHead className="text-gray-500 font-medium">Ngày</TableHead>
                                        <TableHead className="text-gray-500 font-medium">Giờ</TableHead>
                                        <TableHead className="text-gray-500 font-medium">Trạng thái</TableHead>
                                        <TableHead className="text-gray-500 font-medium">GV dạy thay</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {generatedSessions.map((sess: any, idx: number) => {
                                        let date: Date;
                                        try { date = parseISO(sess.session_date); } catch { date = new Date(sess.session_date); }
                                        const dayName = DAY_NAMES[date.getDay()] || "";
                                        const dateStr = format(date, "dd/MM/yyyy", { locale: vi });
                                        const isPast = date < new Date(new Date().toDateString());

                                        return (
                                            <TableRow key={sess.id} className={`border-gray-100 hover:bg-gray-50 ${isPast ? "opacity-60" : ""}`}>
                                                <TableCell className="text-gray-400 text-sm">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <span className="font-semibold text-indigo-600 mr-1.5">{dayName}</span>
                                                    <span className="text-gray-800">{dateStr}</span>
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {sess.start_time?.substring(0, 5)} - {sess.end_time?.substring(0, 5)}
                                                </TableCell>
                                                <TableCell>
                                                    {sess.status === "scheduled" && (
                                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-[11px]">Đã lên lịch</Badge>
                                                    )}
                                                    {sess.status === "completed" && (
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[11px]">Hoàn tất</Badge>
                                                    )}
                                                    {sess.status === "cancelled" && (
                                                        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-[11px]">Đã hủy</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {sess.substitute_teacher_id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                                            <span className="text-sm text-amber-700 font-medium">
                                                                {(sess.substitute as any)?.full_name || "GV thay"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-500 hover:border-indigo-300 focus:ring-1 focus:ring-indigo-300 focus:outline-none"
                                                            defaultValue=""
                                                            onChange={async (e) => {
                                                                const teacherId = e.target.value;
                                                                if (!teacherId) return;
                                                                const res = await assignSubstituteTeacher(sess.id, teacherId);
                                                                if (res.error) {
                                                                    toast.error("Lỗi: " + res.error);
                                                                } else {
                                                                    toast.success("Đã gán GV dạy thay");
                                                                    window.location.reload();
                                                                }
                                                            }}
                                                        >
                                                            <option value="">— Gán GV thay —</option>
                                                            {allTeachers.map((t: any) => (
                                                                <option key={t.id} value={t.id}>{t.full_name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </TabsContent>

            {/* TAB ĐIỂM DANH */}
            <TabsContent value="attendance" className="space-y-6">

                {/* Section: Đơn xin nghỉ từ phụ huynh */}
                {absenceRequests.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/30 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <h3 className="text-base font-semibold text-amber-900">
                                Đơn xin nghỉ học ({absenceRequests.length} đơn)
                            </h3>
                        </div>
                        <div className="p-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-amber-100">
                                        <TableHead className="text-amber-700 font-medium">Học sinh</TableHead>
                                        <TableHead className="text-amber-700 font-medium">Ngày nghỉ</TableHead>
                                        <TableHead className="text-amber-700 font-medium">Lý do</TableHead>
                                        <TableHead className="text-amber-700 font-medium">Phụ huynh</TableHead>
                                        <TableHead className="text-amber-700 font-medium text-center">Trạng thái</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {absenceRequests.map((req: any) => (
                                        <TableRow key={req.id} className="border-amber-100 hover:bg-amber-50/50">
                                            <TableCell className="font-medium text-gray-800">
                                                {req.student?.full_name || "—"}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {req.absence_date
                                                    ? (() => {
                                                        try {
                                                            const d = parseISO(req.absence_date);
                                                            return `${DAY_NAMES[d.getDay()] || ""} - ${format(d, "dd/MM/yyyy")}`;
                                                        } catch { return req.absence_date; }
                                                    })()
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-gray-600 max-w-xs truncate">
                                                {req.reason || "—"}
                                            </TableCell>
                                            <TableCell className="text-gray-500 text-sm">
                                                {req.parent?.full_name || "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {req.status === "pending" && (
                                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Chờ duyệt</Badge>
                                                )}
                                                {req.status === "approved" && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Đã duyệt</Badge>
                                                )}
                                                {req.status === "rejected" && (
                                                    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Từ chối</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Section: Lịch sử điểm danh */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Lịch sử Điểm danh ({currentMonth}/{currentYear})
                                </h3>
                                {schedules.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Hiển thị theo đúng lịch học: {schedules.map((s: any) => DAY_NAMES[s.day_of_week]).join(", ")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {filteredSessions.length === 0 ? (
                        <div className="text-center py-10">
                            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">Chưa có dữ liệu điểm danh tháng này.</p>
                            <p className="text-sm text-gray-400 mt-1">Giáo viên cần thực hiện điểm danh ở ứng dụng của họ.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto mb-4">
                                <Table className="min-w-max">
                                    <TableHeader>
                                        <TableRow className="border-gray-100 hover:bg-transparent">
                                            <TableHead className="text-gray-500 font-medium whitespace-nowrap bg-white sticky left-0 z-10 w-48 shadow-[1px_0_0_0_#f3f4f6]">
                                                Học sinh
                                            </TableHead>
                                            {/* Cột cho từng Session (lọc theo lịch) */}
                                            {visibleSessions.map((sess: any) => {
                                                let date: Date;
                                                try { date = parseISO(sess.session_date); } catch { date = new Date(sess.session_date); }
                                                const dayName = DAY_NAMES[date.getDay()] || "";
                                                const dateStr = format(date, "dd/MM", { locale: vi });
                                                return (
                                                    <TableHead key={sess.id} className="text-center min-w-[84px]">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[11px] font-bold text-indigo-600">{dayName}</span>
                                                            <span className="text-sm font-semibold text-gray-700">{dateStr}</span>
                                                            <span className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                                                                {sess.status === "closed" ? "Hoàn tất" : "Mở"}
                                                            </span>
                                                        </div>
                                                    </TableHead>
                                                );
                                            })}
                                            <TableHead className="text-center whitespace-nowrap opacity-75 bg-emerald-50 text-emerald-600">Có mặt</TableHead>
                                            <TableHead className="text-center whitespace-nowrap opacity-75 bg-rose-50 text-rose-600">Vắng</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {enrollments.filter((e: any) => e.status === "active").map((enrollment: any) => {
                                            const studentId = enrollment.student?.id;
                                            let totalPresent = 0;
                                            let totalAbsent = 0;

                                            return (
                                                <TableRow key={enrollment.id} className="border-gray-100 hover:bg-gray-50">
                                                    <TableCell className="font-medium text-gray-900 bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#f3f4f6] whitespace-nowrap">
                                                        {enrollment.student?.full_name || "—"}
                                                    </TableCell>
                                                    {visibleSessions.map((sess: any) => {
                                                        const record = (attendanceData?.records || []).find(
                                                            (r: any) => r.session_id === sess.id && r.student_id === studentId
                                                        );

                                                        let displayBadge = <span className="text-gray-300">–</span>;
                                                        if (record) {
                                                            if (record.status === "present") {
                                                                displayBadge = <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[11px]">Có mặt</Badge>;
                                                                totalPresent++;
                                                            } else if (record.status === "late") {
                                                                displayBadge = <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-[11px]">Đi trễ</Badge>;
                                                                totalAbsent++;
                                                            } else if (record.status === "absent") {
                                                                // Check if there's an absence request for this student on this date
                                                                const hasAbsenceReq = absenceRequests.some(
                                                                    (r: any) => r.student_id === studentId && r.absence_date === sess.session_date && r.status === "approved"
                                                                );
                                                                displayBadge = hasAbsenceReq
                                                                    ? <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 text-[11px]">Có phép</Badge>
                                                                    : <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0 text-[11px]">Vắng</Badge>;
                                                                totalAbsent++;
                                                            } else if (record.status === "excused") {
                                                                displayBadge = <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 text-[11px]">Có phép</Badge>;
                                                            }
                                                        }

                                                        return (
                                                            <TableCell key={sess.id} className="text-center p-2">
                                                                {displayBadge}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="text-center font-bold text-emerald-600 bg-emerald-50/50">{totalPresent}</TableCell>
                                                    <TableCell className="text-center font-bold text-rose-600 bg-rose-50/50">{totalAbsent}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* View more / Collapse buttons */}
                            {(hasMoreSessions || isExpanded) && (
                                <div className="flex items-center justify-center gap-3 border-t border-gray-100 pt-4">
                                    {hasMoreSessions && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
                                            onClick={() => setVisibleSessionCount(prev => prev + 5)}
                                        >
                                            <ChevronDown className="w-3.5 h-3.5 mr-1" />
                                            Xem thêm ({filteredSessions.length - visibleSessionCount} buổi)
                                        </Button>
                                    )}
                                    {isExpanded && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 hover:text-gray-700 text-xs"
                                            onClick={() => setVisibleSessionCount(INITIAL_SESSION_COLS)}
                                        >
                                            <ChevronUp className="w-3.5 h-3.5 mr-1" />
                                            Thu gọn
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
}
