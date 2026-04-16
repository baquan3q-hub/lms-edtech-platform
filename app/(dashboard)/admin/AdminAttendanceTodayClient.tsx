"use client";

import { useQuery } from "@tanstack/react-query";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    ClipboardList,
    Loader2,
} from "lucide-react";
import { fetchAdminAttendanceSessionsToday } from "./analytics-actions";

export default function AdminAttendanceTodayClient() {
    const today = new Date().toISOString().split("T")[0];

    const { data, isLoading } = useQuery({
        queryKey: ["admin-attendance-today"],
        queryFn: async () => {
            return await fetchAdminAttendanceSessionsToday(today);
        },
        refetchInterval: 30_000,
    });

    const sessions = data || [];

    const getStatusText = (status: string, hasRecords: boolean) => {
        if (status === "closed" && hasRecords) return "Hoàn tất";
        if (status === "open" && hasRecords) return "Đang cập nhật";
        if (status === "open") return "Đang mở";
        return "Chưa điểm danh";
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Clock className="w-6 h-6 mx-auto mb-2 text-gray-300" strokeWidth={1.5} />
                <p className="text-sm">Chưa có phiên điểm danh nào hôm nay</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 font-semibold text-gray-600">Lớp</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Giáo viên</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-center">Có mặt</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-center">Vắng</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-center">Trễ</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-center">Tỷ lệ</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-right">Trạng thái</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sessions.map((s: any) => (
                        <tr key={s.sessionId} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-medium text-black">{s.className}</td>
                            <td className="py-3 px-4 text-gray-600">{s.teacherName}</td>
                            <td className="py-3 px-4 text-center">
                                <span className="text-black font-medium">{s.presentCount}</span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-gray-500">{s.totalStudents}</span>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-600">
                                {s.absentCount}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-600">
                                {s.lateCount}
                            </td>
                            <td className="py-3 px-4 text-center font-medium text-black">
                                {s.attendanceRate}%
                            </td>
                            <td className="py-3 px-4 text-right text-gray-500 text-sm">
                                {getStatusText(s.status, s.totalStudents > 0)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
