"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    ClipboardList,
    Users,
    Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttendanceSummary {
    sessionId: string;
    classId: string;
    className: string;
    teacherName: string;
    sessionDate: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: string;
    updatedAt: string;
}

export default function AdminAttendanceTodayClient() {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, isLoading } = useQuery({
        queryKey: ["admin-attendance-today"],
        queryFn: async () => {
            // Lấy sessions hôm nay
            const { data: sessions } = await supabase
                .from("attendance_sessions")
                .select(`
                    id, class_id, session_date, status, start_time, end_time,
                    class:classes!class_id(name, teacher_id,
                        teacher:users!teacher_id(full_name)
                    )
                `)
                .eq("session_date", today)
                .order("start_time", { ascending: true });

            if (!sessions || sessions.length === 0) return [];

            const sessionIds = sessions.map((s: any) => s.id);

            // Lấy records
            const { data: records } = await supabase
                .from("attendance_records")
                .select("session_id, status")
                .in("session_id", sessionIds);

            const allRecords = records || [];

            return sessions.map((session: any) => {
                const classObj = Array.isArray(session.class) ? session.class[0] : session.class;
                const teacherObj = classObj?.teacher;
                const teacherName = Array.isArray(teacherObj) ? teacherObj[0]?.full_name : teacherObj?.full_name;

                const sessRecords = allRecords.filter((r: any) => r.session_id === session.id);
                const presentCount = sessRecords.filter((r: any) => r.status === "present").length;
                const absentCount = sessRecords.filter((r: any) => r.status === "absent").length;
                const lateCount = sessRecords.filter((r: any) => r.status === "late").length;
                const totalStudents = sessRecords.length;
                const rate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : "—";

                return {
                    sessionId: session.id,
                    classId: session.class_id,
                    className: classObj?.name || "—",
                    teacherName: teacherName || "—",
                    sessionStatus: session.status,
                    startTime: session.start_time,
                    totalStudents,
                    presentCount,
                    absentCount,
                    lateCount,
                    attendanceRate: rate,
                };
            });
        },
        refetchInterval: 30_000, // Tự refetch mỗi 30s backup (Realtime sync là chính)
    });

    const sessions = data || [];

    const getStatusBadge = (status: string, hasRecords: boolean) => {
        if (status === "closed" && hasRecords) {
            return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Đã điểm danh</Badge>;
        }
        if (status === "open" && hasRecords) {
            return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">Vừa cập nhật</Badge>;
        }
        if (status === "open") {
            return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Đang mở</Badge>;
        }
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Chưa điểm danh</Badge>;
    };

    return (
        <Card className="border-slate-800/50 bg-slate-900/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                    📋 Điểm danh hôm nay
                    <span className="text-xs text-slate-500 font-normal ml-auto">
                        {today}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có phiên điểm danh nào hôm nay</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">Lớp</th>
                                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">Giáo viên</th>
                                    <th className="text-center py-2 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                                        <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-500" /> Có mặt
                                    </th>
                                    <th className="text-center py-2 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                                        <XCircle className="w-3.5 h-3.5 inline text-red-500" /> Vắng
                                    </th>
                                    <th className="text-center py-2 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                                        <AlertTriangle className="w-3.5 h-3.5 inline text-amber-500" /> Trễ
                                    </th>
                                    <th className="text-center py-2 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">%</th>
                                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {sessions.map((s: any) => (
                                    <tr
                                        key={s.sessionId}
                                        className="hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="py-3 px-3">
                                            <span className="font-medium text-slate-200">{s.className}</span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-400">{s.teacherName}</td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="text-emerald-400 font-semibold">{s.presentCount}</span>
                                            <span className="text-slate-600 mx-1">/</span>
                                            <span className="text-slate-400">{s.totalStudents}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`font-semibold ${s.absentCount > 0 ? "text-red-400" : "text-slate-600"}`}>
                                                {s.absentCount}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`font-semibold ${s.lateCount > 0 ? "text-amber-400" : "text-slate-600"}`}>
                                                {s.lateCount}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`font-bold ${Number(s.attendanceRate) >= 80 ? "text-emerald-400" :
                                                    Number(s.attendanceRate) >= 60 ? "text-amber-400" :
                                                        "text-red-400"
                                                }`}>
                                                {s.attendanceRate}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            {getStatusBadge(s.sessionStatus, s.totalStudents > 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
