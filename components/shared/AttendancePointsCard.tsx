"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Flame, Star, Medal, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AttendancePointsCardProps {
    studentId: string;
    classId: string;
    className?: string;
}

const ACHIEVEMENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    streak_3: { label: "Streak 3", icon: "🥉", color: "bg-amber-100 text-amber-700" },
    streak_5: { label: "Streak 5", icon: "🥈", color: "bg-slate-100 text-slate-700" },
    streak_10: { label: "Streak 10", icon: "🥇", color: "bg-yellow-100 text-yellow-700" },
    perfect_month: { label: "Tháng hoàn hảo", icon: "⭐", color: "bg-indigo-100 text-indigo-700" },
    top_3: { label: "Top 3", icon: "🏆", color: "bg-emerald-100 text-emerald-700" },
};

export default function AttendancePointsCard({
    studentId,
    classId,
    className,
}: AttendancePointsCardProps) {
    const supabase = createClient();

    const { data, isLoading } = useQuery({
        queryKey: ["attendance-points", studentId, classId],
        enabled: !!studentId && !!classId,
        queryFn: async () => {
            // 1. Tổng điểm
            const { data: points } = await supabase
                .from("attendance_points")
                .select("points_earned, reason")
                .eq("student_id", studentId)
                .eq("class_id", classId);

            const totalPoints = (points || []).reduce(
                (sum, p) => sum + p.points_earned, 0
            );

            // 2. Achievements
            const { data: achievements } = await supabase
                .from("student_achievements")
                .select("achievement_type, earned_at")
                .eq("student_id", studentId)
                .eq("class_id", classId);

            // 3. Tính streak hiện tại
            const { data: recentRecords } = await supabase
                .from("attendance_records")
                .select("status, session:attendance_sessions!session_id(session_date, class_id)")
                .eq("student_id", studentId)
                .order("marked_at", { ascending: false })
                .limit(15);

            // Filter for this class and count consecutive present
            let currentStreak = 0;
            for (const rec of (recentRecords || [])) {
                const session = Array.isArray(rec.session) ? rec.session[0] : rec.session;
                if (session?.class_id !== classId) continue;
                if (rec.status === "present") {
                    currentStreak++;
                } else {
                    break;
                }
            }

            // 4. Xếp hạng trong lớp
            const { data: allPoints } = await supabase
                .from("attendance_points")
                .select("student_id, points_earned")
                .eq("class_id", classId);

            const studentTotals: Record<string, number> = {};
            for (const p of (allPoints || [])) {
                studentTotals[p.student_id] = (studentTotals[p.student_id] || 0) + p.points_earned;
            }
            const sorted = Object.entries(studentTotals).sort(([, a], [, b]) => b - a);
            const rank = sorted.findIndex(([sid]) => sid === studentId) + 1;
            const totalStudents = sorted.length;

            return {
                totalPoints,
                currentStreak,
                rank,
                totalStudents,
                achievements: (achievements || []).map((a) => a.achievement_type),
                nextStreakMilestone: currentStreak < 3 ? 3 : currentStreak < 5 ? 5 : currentStreak < 10 ? 10 : null,
            };
        },
    });

    if (isLoading || !data) {
        return (
            <Card className="shadow-sm animate-pulse">
                <CardContent className="p-6 h-40" />
            </Card>
        );
    }

    const streakProgress = data.nextStreakMilestone
        ? (data.currentStreak / data.nextStreakMilestone) * 100
        : 100;

    const nextBonus = data.nextStreakMilestone === 3 ? 15 : data.nextStreakMilestone === 5 ? 30 : data.nextStreakMilestone === 10 ? 80 : 0;

    return (
        <Card className="shadow-sm border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-purple-50/30 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    Điểm Chuyên Cần
                    {className && (
                        <span className="text-xs font-normal text-slate-500 ml-auto">{className}</span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Points + Rank */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-4xl font-black text-indigo-600">
                            {data.totalPoints.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">điểm tích lũy</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                            <Medal className="w-4 h-4 text-amber-500" />
                            <span className="font-bold text-slate-800">
                                {data.rank}/{data.totalStudents}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">xếp hạng lớp</p>
                    </div>
                </div>

                {/* Streak */}
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                            <Flame className="w-4 h-4 text-orange-500" />
                            Chuỗi: {data.currentStreak} buổi liên tiếp
                        </div>
                        {data.nextStreakMilestone && (
                            <span className="text-xs text-indigo-600 font-medium">
                                +{nextBonus} điểm
                            </span>
                        )}
                    </div>
                    {data.nextStreakMilestone && (
                        <>
                            <Progress value={streakProgress} className="h-2" />
                            <p className="text-xs text-slate-400 mt-1">
                                Còn {data.nextStreakMilestone - data.currentStreak} buổi nữa để đạt streak {data.nextStreakMilestone}
                            </p>
                        </>
                    )}
                    {!data.nextStreakMilestone && data.currentStreak >= 10 && (
                        <p className="text-xs text-emerald-600 font-medium">
                            🏆 Đã đạt streak cao nhất! Tuyệt vời!
                        </p>
                    )}
                </div>

                {/* Achievements */}
                <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                        Thành tựu
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {["streak_3", "streak_5", "streak_10", "perfect_month", "top_3"].map((type) => {
                            const cfg = ACHIEVEMENT_CONFIG[type];
                            const earned = data.achievements.includes(type);
                            return (
                                <Badge
                                    key={type}
                                    className={`${earned ? cfg.color : "bg-slate-50 text-slate-300"} border-0 text-xs py-1`}
                                >
                                    {cfg.icon} {cfg.label}
                                </Badge>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
