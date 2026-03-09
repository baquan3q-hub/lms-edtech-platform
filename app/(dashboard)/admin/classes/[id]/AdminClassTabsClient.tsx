"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, CalendarDays, ClipboardCheck, BookOpen } from "lucide-react";
import EnrollStudentCombobox from "@/components/admin/EnrollStudentCombobox";
import ImportStudentsDialog from "@/components/admin/ImportStudentsDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ScheduleManagerClient from "@/app/(dashboard)/teacher/classes/[id]/ScheduleManagerClient";

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
    attendanceData
}: {
    classId: string;
    activeCount: number;
    allStudents: any[];
    enrolledIds: string[];
    enrollments: any[];
    schedules: any[];
    allRooms: any[];
    attendanceData: any;
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <ScheduleManagerClient
                        classId={classId}
                        initialSchedules={schedules}
                        allRooms={allRooms}
                        readOnly={false}
                    />
                </div>
            </TabsContent>

            {/* TAB ĐIỂM DANH */}
            <TabsContent value="attendance" className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Lịch sử Điểm danh ({currentMonth}/{currentYear})
                            </h3>
                        </div>
                        {/* Pagination or Date Picker could go here */}
                    </div>

                    {(!attendanceData?.sessions || attendanceData.sessions.length === 0) ? (
                        <div className="text-center py-10">
                            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">Chưa có dữ liệu điểm danh tháng này.</p>
                            <p className="text-sm text-gray-400 mt-1">Giáo viên cần thực hiện điểm danh ở ứng dụng của họ.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-max">
                                <TableHeader>
                                    <TableRow className="border-gray-100 hover:bg-transparent">
                                        <TableHead className="text-gray-500 font-medium whitespace-nowrap bg-white sticky left-0 z-10 w-48 shadow-[1px_0_0_0_#f3f4f6]">
                                            Học sinh
                                        </TableHead>
                                        {/* Cột cho từng Session */}
                                        {attendanceData.sessions.map((sess: any) => {
                                            const dateObj = new Date(sess.session_date);
                                            const day = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
                                            return (
                                                <TableHead key={sess.id} className="text-center min-w-[80px]">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-semibold text-gray-700">{day}</span>
                                                        <span className="text-[10px] text-gray-400 mt-1 opacity-80 whitespace-nowrap">
                                                            T/T: {sess.status === "closed" ? "Hoàn tất" : "Mở"}
                                                        </span>
                                                    </div>
                                                </TableHead>
                                            );
                                        })}
                                        <TableHead className="text-center whitespace-nowrap opacity-75">Tốt</TableHead>
                                        <TableHead className="text-center whitespace-nowrap opacity-75">Vắng</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Lấy ra danh sách các học sinh (từ enrollments) để map cho khớp */}
                                    {enrollments.filter(e => e.status === "active").map((enrollment: any) => {
                                        const studentId = enrollment.student?.id;
                                        // Tính tổng
                                        let totalPresent = 0;
                                        let totalAbsent = 0;

                                        return (
                                            <TableRow key={enrollment.id} className="border-gray-100 hover:bg-gray-50">
                                                <TableCell className="font-medium text-gray-900 bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#f3f4f6] whitespace-nowrap">
                                                    {enrollment.student?.full_name || "—"}
                                                </TableCell>
                                                {/* Cell tương ứng với từng session */}
                                                {attendanceData.sessions.map((sess: any) => {
                                                    // Tìm record của học sinh này trong session này
                                                    const record = attendanceData.records.find(
                                                        (r: any) => r.session_id === sess.id && r.student_id === studentId
                                                    );

                                                    let displayBadge = <span className="text-gray-300">-</span>;
                                                    if (record) {
                                                        if (record.status === "present") {
                                                            displayBadge = <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Có mặt</Badge>;
                                                            totalPresent++;
                                                        } else if (record.status === "absent" || record.status === "late") {
                                                            displayBadge = <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">{record.status === "late" ? "Đi trễ" : "Vắng"}</Badge>;
                                                            totalAbsent++;
                                                        } else if (record.status === "excused") {
                                                            displayBadge = <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Có phép</Badge>;
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
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
}
