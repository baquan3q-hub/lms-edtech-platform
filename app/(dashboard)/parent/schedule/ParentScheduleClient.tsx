"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2 } from "lucide-react";
import { fetchParentDashboardData } from "@/lib/actions/parentStudent";
import { withdrawAbsenceRequestBySession } from "@/lib/actions/attendance";
import UpcomingSessionsWidget from "@/components/shared/UpcomingSessionsWidget";
import AbsenceRequestModal from "@/components/shared/AbsenceRequestModal";
import { toast } from "sonner";

type StudentInfo = {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    relationship: string;
};

export default function ParentScheduleClient({ students }: { students: StudentInfo[] }) {
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(8);

    // Absence modal
    const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<{ class_id: string; class_name: string; session_date: string } | null>(null);

    useEffect(() => {
        if (selectedStudentId) loadSchedule(selectedStudentId);
    }, [selectedStudentId]);

    const loadSchedule = async (studentId: string) => {
        setLoading(true);
        try {
            const res = await fetchParentDashboardData(studentId);
            setSessions(res.data?.upcomingSessions || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAbsenceModal = (session: any) => {
        setSelectedSession({
            class_id: session.class_id,
            class_name: session.class_name || session.class?.name || "Lớp học",
            session_date: session.session_date
        });
        setIsAbsenceModalOpen(true);
    };

    const handleRecallAbsence = async (session: any) => {
        if (!selectedStudentId) return;
        const confirmed = window.confirm("Bạn có chắc muốn thu hồi đơn xin nghỉ này?");
        if (!confirmed) return;

        const { success, error } = await withdrawAbsenceRequestBySession(
            session.class_id,
            session.session_date,
            selectedStudentId
        );

        if (success) {
            toast.success("Đã thu hồi đơn xin nghỉ thành công");
            loadSchedule(selectedStudentId);
        } else {
            toast.error(error || "Có lỗi xảy ra khi thu hồi đơn");
        }
    };

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <CalendarDays className="w-6 h-6 text-indigo-500" /> Lịch học của con
                </h1>
                <p className="text-sm text-slate-500 mt-1">Xem lịch học, nội dung buổi học và xin nghỉ phép</p>
            </div>

            {/* Student Tabs */}
            {students.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {students.map(s => (
                        <button
                            key={s.id}
                            onClick={() => { setSelectedStudentId(s.id); setVisibleCount(8); }}
                            className={`flex items-center gap-3 px-5 py-3 rounded-xl shrink-0 transition-all font-medium ${selectedStudentId === s.id
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-amber-300"
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedStudentId === s.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
                                }`}>
                                {s.full_name?.charAt(0) || "?"}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold">{s.full_name}</p>
                                <p className={`text-[10px] ${selectedStudentId === s.id ? "text-amber-100" : "text-slate-400"}`}>
                                    {s.relationship}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Single student info */}
            {students.length === 1 && selectedStudent && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow">
                        {selectedStudent.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900">{selectedStudent.full_name}</p>
                        <p className="text-xs text-slate-500">{selectedStudent.relationship}</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            )}

            {/* Schedule */}
            {!loading && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                            <CalendarDays className="w-4 h-4 text-indigo-500" /> Thời khóa biểu
                        </h3>
                        <p className="text-xs text-slate-400">Nhấn vào buổi học để xin nghỉ phép</p>
                    </div>
                    <div className="p-4">
                        <UpcomingSessionsWidget
                            sessions={sessions}
                            limit={visibleCount}
                            onSessionClick={handleOpenAbsenceModal}
                            onRecallAbsence={handleRecallAbsence}
                            compact={true}
                        />

                        <div className="mt-4 flex items-center justify-center gap-3">
                            {sessions.length > visibleCount && (
                                <Button
                                    variant="outline"
                                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 border-dashed text-xs h-8"
                                    onClick={() => setVisibleCount(prev => prev + 5)}
                                >
                                    Xem thêm lịch học
                                </Button>
                            )}
                            {visibleCount > 8 && (
                                <Button
                                    variant="ghost"
                                    className="text-slate-500 hover:text-slate-700 text-xs h-8"
                                    onClick={() => setVisibleCount(8)}
                                >
                                    Thu gọn
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <AbsenceRequestModal
                isOpen={isAbsenceModalOpen}
                onClose={() => { setIsAbsenceModalOpen(false); if (selectedStudentId) loadSchedule(selectedStudentId); }}
                session={selectedSession}
                studentId={selectedStudentId || ""}
            />
        </div>
    );
}
