"use client";

import { useAttendanceLeaderboard } from "@/lib/queries/parent-queries";
import { Trophy, Flame, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AttendanceLeaderboardProps {
    classId: string;
    currentStudentId?: string; // Highlight chính mình
}

const RANK_STYLES = [
    { bg: "bg-gradient-to-r from-amber-50 to-yellow-50", border: "border-amber-200", icon: "🥇", textColor: "text-amber-600" },
    { bg: "bg-gradient-to-r from-slate-50 to-gray-50", border: "border-slate-200", icon: "🥈", textColor: "text-slate-600" },
    { bg: "bg-gradient-to-r from-orange-50 to-amber-50", border: "border-orange-200", icon: "🥉", textColor: "text-orange-600" },
];

export default function AttendanceLeaderboard({
    classId,
    currentStudentId,
}: AttendanceLeaderboardProps) {
    const { data: leaderboard, isLoading } = useAttendanceLeaderboard(classId);

    if (isLoading) {
        return (
            <Card className="shadow-sm animate-pulse">
                <CardContent className="p-6 h-48" />
            </Card>
        );
    }

    const list = leaderboard || [];

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Bảng xếp hạng Chuyên cần
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {list.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Chưa có dữ liệu xếp hạng
                    </div>
                ) : (
                    list.map((student, index) => {
                        const rankStyle = RANK_STYLES[index] || null;
                        const isMe = student.studentId === currentStudentId;

                        return (
                            <div
                                key={student.studentId}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isMe
                                        ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300"
                                        : rankStyle
                                            ? `${rankStyle.bg} ${rankStyle.border}`
                                            : "bg-white border-slate-100 hover:bg-slate-50"
                                    }`}
                            >
                                {/* Rank */}
                                <div className="w-8 text-center shrink-0">
                                    {rankStyle ? (
                                        <span className="text-xl">{rankStyle.icon}</span>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-400">
                                            {index + 1}
                                        </span>
                                    )}
                                </div>

                                {/* Avatar */}
                                <Avatar className="w-9 h-9">
                                    <AvatarFallback className={`text-sm font-bold ${isMe ? "bg-indigo-200 text-indigo-700" : "bg-slate-100 text-slate-500"
                                        }`}>
                                        {student.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Name + badges */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold text-sm truncate ${isMe ? "text-indigo-700" : "text-slate-800"
                                            }`}>
                                            {student.name}
                                        </span>
                                        {isMe && (
                                            <Badge className="bg-indigo-100 text-indigo-600 border-0 text-[10px] py-0">
                                                Bạn
                                            </Badge>
                                        )}
                                    </div>
                                    {student.streakBadges.length > 0 && (
                                        <div className="flex gap-1 mt-0.5">
                                            {student.streakBadges.map((b) => (
                                                <span key={b} className="text-[10px]">
                                                    {b === "streak_3" ? "🥉" : b === "streak_5" ? "🥈" : "🥇"}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Points */}
                                <div className="text-right shrink-0">
                                    <span className={`text-lg font-black ${rankStyle ? rankStyle.textColor : "text-slate-600"
                                        }`}>
                                        {student.totalPoints.toLocaleString()}
                                    </span>
                                    <p className="text-[10px] text-slate-400">điểm</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
