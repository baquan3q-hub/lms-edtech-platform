import Link from "next/link";
import { ArrowLeft, School, Users, BookOpen, Monitor, Building2 } from "lucide-react";
import {
    fetchClassDetail,
    fetchEnrollments,
    fetchStudents,
} from "@/lib/actions/academic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import EnrollStudentCombobox from "@/components/admin/EnrollStudentCombobox";
import EditScheduleDialog from "@/components/admin/EditScheduleDialog";
import ImportStudentsDialog from "@/components/admin/ImportStudentsDialog";
import ScheduleManagerClient from "@/app/(dashboard)/teacher/classes/[id]/ScheduleManagerClient";
import { getRooms, getClassSchedules } from "@/lib/actions/schedule";
import { getAttendanceHistory } from "@/lib/actions/attendance";
import AdminClassTabsClient from "./AdminClassTabsClient";

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function ClassDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: classId } = await params;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [classRes, enrollmentsRes, studentsRes, roomsRes, schedulesRes, attendanceRes] = await Promise.all([
        fetchClassDetail(classId),
        fetchEnrollments(classId),
        fetchStudents(),
        getRooms(),
        getClassSchedules(classId),
        getAttendanceHistory(classId, currentMonth, currentYear)
    ]);

    const classData = classRes.data;
    const enrollments = enrollmentsRes.data || [];
    const allStudents = studentsRes.data || [];
    const allRooms = roomsRes.data || [];
    const schedules = schedulesRes.data || [];
    const attendanceData = attendanceRes.data;

    // Danh sách ID học sinh đã enroll (active)
    const enrolledIds = enrollments
        .filter((e: { status: string }) => e.status === "active")
        .map((e: { student: { id: string } }) => e.student?.id)
        .filter(Boolean);

    if (!classData) {
        return (
            <div className="p-12 text-center">
                <p className="text-red-500">
                    Không tìm thấy lớp học hoặc đã xảy ra lỗi.
                </p>
                <Link href="/admin/classes">
                    <Button variant="ghost" className="mt-4 text-blue-600">
                        ← Quay lại
                    </Button>
                </Link>
            </div>
        );
    }

    const schedule = classData.schedule;
    const scheduleText =
        schedule && typeof schedule === "object" && "text" in schedule
            ? (schedule.text as string)
            : schedule
                ? JSON.stringify(schedule)
                : "Chưa xếp lịch";

    const activeCount = enrollments.filter(
        (e: { status: string }) => e.status === "active"
    ).length;

    return (
        <div className="space-y-6">
            {/* Breadcrumb + Back */}
            <Link href="/admin/classes">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-900 -ml-2"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại Quản lý Lớp học
                </Button>
            </Link>

            {/* Class info header */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 shrink-0">
                        <School className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900">
                            {classData.course?.name || "Lớp học"}
                        </h2>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs">Giáo viên</p>
                                <p className="text-gray-900 mt-0.5">
                                    {classData.teacher?.full_name || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Hình thức</p>
                                <div className="mt-1">
                                    {classData.course?.mode === "online" ? (
                                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                            <Monitor className="w-3.5 h-3.5" /> Online
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                            <Building2 className="w-3.5 h-3.5" /> Offline
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs flex items-center">
                                    Lịch học
                                    <EditScheduleDialog classId={classId} currentSchedule={scheduleText} />
                                </p>
                                <p className="text-gray-900 mt-0.5">{scheduleText}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Sĩ số</p>
                                <p className="text-gray-900 mt-0.5">
                                    <span
                                        className={
                                            activeCount >= classData.max_students
                                                ? "text-red-600"
                                                : "text-emerald-600"
                                        }
                                    >
                                        {activeCount}
                                    </span>
                                    <span className="text-gray-400">
                                        /{classData.max_students}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs cho các phân hệ */}
            <AdminClassTabsClient
                classId={classId}
                activeCount={activeCount}
                allStudents={allStudents}
                enrolledIds={enrolledIds}
                enrollments={enrollments}
                schedules={schedules}
                allRooms={allRooms}
                attendanceData={attendanceData}
            />
        </div>
    );
}
