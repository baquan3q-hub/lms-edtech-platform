"use client";

import { useState, useEffect } from "react";
import BehaviorTrackerClient from "@/components/shared/BehaviorTrackerClient";
import { fetchClassBehaviorScores } from "@/lib/actions/behavior-analysis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function TeacherBehaviorClient({ classes }: { classes: any[] }) {
    const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedClassId) return;

        const loadBehavior = async () => {
            setLoading(true);
            const res = await fetchClassBehaviorScores(selectedClassId);
            if (res.data) {
                // Thêm trường class_id vào từng student để truyền xuống BehaviorTrackerClient
                // BehaviorTrackerClient cần class_id để fetch activity detail
                const mappedData = res.data
                    .map((s: any) => ({
                        ...s,
                        class_id: selectedClassId,
                        risk_level: s.behavior?.risk_level || 'normal'
                    }));
                    
                setStudents(mappedData);
            }
            setLoading(false);
        };

        loadBehavior();
    }, [selectedClassId]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <span className="font-bold text-slate-700">Chọn lớp học cần giám sát:</span>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-[300px] border-slate-200">
                        <SelectValue placeholder="Chọn lớp..." />
                    </SelectTrigger>
                    <SelectContent>
                        {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name || "Lớp"} - {c.course?.name || ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)] p-6">
                {loading ? (
                    <div className="py-20 flex justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">Danh sách Cảnh báo</h2>
                            <p className="text-sm text-slate-500">Các học sinh có dấu hiệu bất thường trong các bài kiểm tra của lớp này</p>
                        </div>
                        <BehaviorTrackerClient students={students} />
                    </>
                )}
            </div>
        </div>
    );
}
