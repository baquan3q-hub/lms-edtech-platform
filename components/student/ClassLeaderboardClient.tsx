"use client";

import { useState, useEffect } from "react";
import { Trophy, Award, Star, Medal, Users, User, ArrowUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getClassPointsLeaderboard } from "@/lib/actions/point";
import { getClassScoreLeaderboard } from "@/lib/actions/student";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ClassLeaderboardClientProps {
    enrolledClasses: {
        class_id: string;
        name: string;
        course_name: string;
    }[];
    currentUserId: string;
}

export default function ClassLeaderboardClient({ enrolledClasses, currentUserId }: ClassLeaderboardClientProps) {
    const [selectedClass, setSelectedClass] = useState<string>(
        enrolledClasses.length > 0 ? enrolledClasses[0].class_id : ""
    );
    const [loading, setLoading] = useState(false);
    
    // Leaderboard State
    const [pointsLeaderboard, setPointsLeaderboard] = useState<any[]>([]);
    const [scoreLeaderboard, setScoreLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        if (!selectedClass) return;

        const fetchLeaderboards = async () => {
            setLoading(true);
            try {
                const [pointsRes, scoresRes] = await Promise.all([
                    getClassPointsLeaderboard(selectedClass),
                    getClassScoreLeaderboard(selectedClass)
                ]);

                if (pointsRes.data) setPointsLeaderboard(pointsRes.data);
                if (scoresRes.data) setScoreLeaderboard(scoresRes.data);
            } catch (error) {
                console.error("Failed to fetch leaderboards:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboards();
    }, [selectedClass]);

    if (enrolledClasses.length === 0) {
        return null;
    }

    // Function to render a podium for top 3
    const renderPodium = (data: any[], valueKey: string, valueSuffix: string, colorScheme: "amber" | "indigo") => {
        if (data.length === 0) return <div className="text-center text-slate-400 py-8 text-sm">Chưa có dữ liệu</div>;

        // Ensure we only show top 3 on the podium
        const top3 = data.slice(0, 3);
        
        // Re-order for podium layout: [2nd, 1st, 3rd]
        const podiumItems = [
            top3[1] || null, // Silver
            top3[0] || null, // Gold
            top3[2] || null  // Bronze
        ];

        return (
            <div className="flex flex-col items-center">
                <div className="flex items-end justify-center gap-2 sm:gap-6 w-full h-[220px] mb-8 pb-4 border-b border-slate-100">
                    {podiumItems.map((item, index) => {
                        if (!item) return <div key={index} className="w-24 sm:w-28 flex-shrink-0" />;

                        // index 0 -> Rank 2
                        // index 1 -> Rank 1
                        // index 2 -> Rank 3
                        let rank = index === 0 ? 2 : index === 1 ? 1 : 3;
                        const isCurrentUsers = item.student_id === currentUserId;
                        
                        const heights = { 1: "h-32", 2: "h-24", 3: "h-20" };
                        const colors = {
                            1: colorScheme === "amber" ? "bg-gradient-to-t from-amber-500 to-yellow-300" : "bg-gradient-to-t from-indigo-500 to-blue-400",
                            2: "bg-gradient-to-t from-slate-300 to-slate-200",
                            3: "bg-gradient-to-t from-orange-400 to-orange-300"
                        };
                        const badges = {
                            1: "text-amber-500 bg-amber-50",
                            2: "text-slate-500 bg-slate-50",
                            3: "text-orange-500 bg-orange-50"
                        };

                        return (
                            <div key={item.student_id} className="flex flex-col items-center justify-end relative flex-shrink-0 w-[30%] max-w-[120px]">
                                {isCurrentUsers && (
                                    <Badge className="absolute -top-14 bg-emerald-500 text-white border-0 py-0.5 px-2 font-bold mb-2 z-10 animate-pulse whitespace-nowrap">
                                        Bạn!
                                    </Badge>
                                )}
                                <div className="relative z-10 flex flex-col items-center mb-1">
                                    <Avatar className={`w-12 h-12 sm:w-16 sm:h-16 border-4 ${rank === 1 ? (colorScheme === 'amber' ? 'border-amber-400' : 'border-indigo-400') : 'border-white'} shadow-md mb-2`}>
                                        <AvatarImage src={item.avatar_url || ""} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                                            {item.full_name?.charAt(0) || "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-800 line-clamp-1 max-w-[80px] text-center w-full truncate">
                                        {item.full_name}
                                    </p>
                                    <p className={`text-[11px] sm:text-sm font-black mt-0.5 ${colorScheme === 'amber' ? 'text-amber-600' : 'text-indigo-600'}`}>
                                        {item[valueKey]} {valueSuffix}
                                    </p>
                                </div>
                                <div className={`w-full ${heights[rank as keyof typeof heights]} ${colors[rank as keyof typeof colors]} rounded-t-xl shadow-inner relative flex justify-center`}>
                                    <div className="absolute top-2 w-8 h-8 rounded-full bg-white/40 flex items-center justify-center font-black text-white mix-blend-overlay">
                                        {rank}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Find current user's rank
    const findMyRank = (leaderboard: any[]) => {
        const index = leaderboard.findIndex(u => u.student_id === currentUserId);
        if (index === -1) return null;
        return {
            rank: index + 1,
            data: leaderboard[index]
        };
    };

    const myPointsRank = findMyRank(pointsLeaderboard);
    const myScoreRank = findMyRank(scoreLeaderboard);

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Bảng Xếp Hạng Lớp / Top 3</h2>
                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Thành tích & Khen thưởng</p>
                    </div>
                </div>
                
                <div className="w-full sm:w-64">
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-10 rounded-xl font-medium focus:ring-slate-300">
                            <SelectValue placeholder="Chọn lớp học..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100">
                            {enrolledClasses.map(cls => (
                                <SelectItem key={cls.class_id} value={cls.class_id} className="font-medium">
                                    <span className="truncate">{cls.name || "Lớp học"}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                    <div className="h-80 bg-slate-100 rounded-2xl"></div>
                    <div className="h-80 bg-slate-100 rounded-2xl"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bảng Đặc Quyền Điểm Chuyên Cần */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-amber-50 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                                <Star className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-amber-900">Điểm Chuyên Cần</h3>
                                <p className="text-[11px] text-amber-600 font-medium">Chuyên cần & Thái độ</p>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            {renderPodium(pointsLeaderboard, "total_points", "điểm", "amber")}
                            
                            {/* Note about current student */}
                            {myPointsRank && myPointsRank.rank > 3 && (
                                <div className="mt-auto bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-300 border-0 h-8 w-8 flex items-center justify-center rounded-lg shadow-sm text-sm p-0">
                                            #{myPointsRank.rank}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6 border-2 border-white shadow-sm">
                                                <AvatarImage src={myPointsRank.data.avatar_url || ""} />
                                            </Avatar>
                                            <span className="font-semibold text-sm text-slate-700">Bạn</span>
                                        </div>
                                    </div>
                                    <span className="font-extrabold text-amber-600">
                                        {myPointsRank.data.total_points} điểm
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bảng Xếp Hạng Điểm Trung Bình */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                                <Award className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-indigo-900">Điểm Học Lực (Trung bình)</h3>
                                <p className="text-[11px] text-indigo-600 font-medium">Bài tập & Bài thi</p>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            {renderPodium(scoreLeaderboard, "avg_score", "", "indigo")}
                            
                             {/* Note about current student */}
                             {myScoreRank && myScoreRank.rank > 3 && (
                                <div className="mt-auto bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-300 border-0 h-8 w-8 flex items-center justify-center rounded-lg shadow-sm text-sm p-0">
                                            #{myScoreRank.rank}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6 border-2 border-white shadow-sm">
                                                <AvatarImage src={myScoreRank.data.avatar_url || ""} />
                                            </Avatar>
                                            <span className="font-semibold text-sm text-slate-700">Bạn</span>
                                        </div>
                                    </div>
                                    <span className="font-extrabold text-indigo-600">
                                        {myScoreRank.data.avg_score} <span className="text-xs font-medium text-slate-400 ml-0.5">/100</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
