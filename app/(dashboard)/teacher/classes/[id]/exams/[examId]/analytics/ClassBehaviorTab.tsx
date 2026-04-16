"use client";

import { useEffect, useState } from "react";
import { fetchClassBehaviorScores } from "@/lib/actions/behavior-analysis";
import BehaviorTrackerClient from "@/components/shared/BehaviorTrackerClient";
import { Loader2, ShieldCheck, Info } from "lucide-react";

export default function ClassBehaviorTab({ classId }: { classId: string }) {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadBehavior = async () => {
            setLoading(true);
            const res = await fetchClassBehaviorScores(classId);
            if (res.data) {
                const mappedData = res.data
                    .map((s: any) => ({
                        ...s,
                        class_id: classId,
                        risk_level: s.behavior?.risk_level || 'normal'
                    }));
                    
                setStudents(mappedData);
            }
            setLoading(false);
        };

        if (classId) {
            loadBehavior();
        }
    }, [classId]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-6">
            <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-violet-600" />
                    Hành vi học tập học viên
                </h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Info className="w-4 h-4" /> Các cảnh báo AI về gian lận, mất tập trung trong các bài kiểm tra được tổng hợp tại đây.
                </p>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
                <BehaviorTrackerClient students={students} />
            )}
        </div>
    );
}
