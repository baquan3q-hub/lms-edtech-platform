"use client";

import { useEffect, useState } from "react";
import { fetchStudentDailyActivity } from "@/lib/actions/daily-activity";
import { Clock, PieChart as PieChartIcon } from "lucide-react";

interface ActivityData {
    name: string;
    duration: number; // in seconds
}

export default function StudentDailyActivityWidget({ studentId, studentName }: { studentId: string, studentName?: string }) {
    const [data, setData] = useState<ActivityData[]>([]);
    const [totalDuration, setTotalDuration] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) return;
        setLoading(true);
        fetchStudentDailyActivity(studentId)
            .then(res => {
                setData(res.data || []);
                setTotalDuration(res.total_duration || 0);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [studentId]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s > 0 ? `${m}m ${s}s` : `${m} phút`;
    };

    if (loading) {
        return <div className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse h-48" />;
    }

    if (totalDuration === 0) {
        return (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-700">Thời gian hoạt động hôm nay</h3>
                <p className="text-sm text-slate-400 mt-1">Chưa ghi nhận hoạt động nào trong ngày</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <PieChartIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Hoạt động trong ngày</h3>
                        {studentName && <p className="text-xs text-slate-500">{studentName}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tổng thời gian</p>
                    <p className="text-lg font-extrabold text-indigo-600">{formatTime(totalDuration)}</p>
                </div>
            </div>

            <div className="p-6">
                <div className="space-y-4">
                    {data.map((item, idx) => {
                        const percent = Math.round((item.duration / totalDuration) * 100);
                        return (
                            <div key={idx} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-700">{item.name}</span>
                                    <span className="text-slate-500 font-mono text-xs">
                                        {formatTime(item.duration)} ({percent}%)
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div 
                                        className="h-full rounded-full bg-indigo-500" 
                                        style={{ width: `${percent}%` }} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
