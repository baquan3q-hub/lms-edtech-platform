"use client";
import { useState } from "react";
import { Save, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitAttendance } from "@/app/(dashboard)/teacher/classes/[id]/actions";

interface Student { enrollment_id: string; student_id: string; full_name: string; email: string; }
interface AttendanceRecord { student_id: string; status: "present" | "absent" | "excused"; note: string; }
interface ExistingRecord { student_id: string; status: string; note: string | null; }

const statusConfig = {
    present: { label: "Có mặt", icon: CheckCircle, className: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    absent: { label: "Vắng không phép", icon: XCircle, className: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    excused: { label: "Vắng có phép", icon: AlertCircle, className: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
};

export default function AttendanceForm({ classId, students, existingRecords }: { classId: string; students: Student[]; existingRecords: ExistingRecord[] }) {
    const initialRecords: Record<string, AttendanceRecord> = {};
    students.forEach((s) => {
        const existing = existingRecords.find((r) => r.student_id === s.student_id);
        initialRecords[s.student_id] = { student_id: s.student_id, status: (existing?.status as "present" | "absent" | "excused") || "present", note: existing?.note || "" };
    });

    const [records, setRecords] = useState<Record<string, AttendanceRecord>>(initialRecords);
    const [isLoading, setIsLoading] = useState(false);
    const today = new Date().toISOString().split("T")[0];

    function updateStatus(studentId: string, status: "present" | "absent" | "excused") { setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } })); }
    function updateNote(studentId: string, note: string) { setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], note } })); }

    async function handleSave() {
        setIsLoading(true);
        try {
            const entries = Object.values(records);
            const result = await submitAttendance(classId, entries);
            if (result.error) { toast.error("Lưu thất bại", { description: result.error }); }
            else { toast.success("Điểm danh thành công!", { description: `Đã lưu cho ${entries.length} học sinh.` }); }
        } catch { toast.error("Đã xảy ra lỗi."); } finally { setIsLoading(false); }
    }

    const counts = { present: Object.values(records).filter((r) => r.status === "present").length, absent: Object.values(records).filter((r) => r.status === "absent").length, excused: Object.values(records).filter((r) => r.status === "excused").length };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3">
                    {Object.entries(statusConfig).map(([key, config]) => (
                        <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bg} border ${config.border}`}>
                            <config.icon className={`w-4 h-4 ${config.className}`} />
                            <span className={`text-sm font-medium ${config.className}`}>{counts[key as keyof typeof counts]}</span>
                            <span className="text-xs text-gray-500">{config.label}</span>
                        </div>
                    ))}
                </div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</>) : (<><Save className="w-4 h-4 mr-2" />Lưu điểm danh</>)}
                </Button>
            </div>
            <div className="space-y-2">
                {students.map((student, index) => {
                    const record = records[student.student_id];
                    const cfg = statusConfig[record?.status || "present"];
                    return (
                        <div key={student.student_id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-all`}>
                            <div className="flex items-center gap-3 sm:w-64 shrink-0">
                                <span className="text-xs text-gray-400 w-6 text-right">{index + 1}.</span>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                                    <p className="text-xs text-gray-400">{student.email}</p>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-3">
                                <Select value={record?.status || "present"} onValueChange={(val) => updateStatus(student.student_id, val as "present" | "absent" | "excused")}>
                                    <SelectTrigger className={`w-full sm:w-48 border-gray-200 ${cfg.bg} ${cfg.className}`}><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="present" className="text-emerald-600 focus:bg-emerald-50">✓ Có mặt</SelectItem>
                                        <SelectItem value="absent" className="text-red-600 focus:bg-red-50">✗ Vắng không phép</SelectItem>
                                        <SelectItem value="excused" className="text-amber-600 focus:bg-amber-50">⚠ Vắng có phép</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input placeholder="Ghi chú..." value={record?.note || ""} onChange={(e) => updateNote(student.student_id, e.target.value)} className="flex-1 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
