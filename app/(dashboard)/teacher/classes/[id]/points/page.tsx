import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import PointsManagerClient from "./PointsManagerClient";
import { fetchClassDetails } from "../actions";
import { getClassPointsLeaderboard } from "@/lib/actions/point";

export default async function PointsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const classId = resolvedParams.id;

    const [
        { data: classInfo },
        { data: leaderboard }
    ] = await Promise.all([
        fetchClassDetails(classId),
        getClassPointsLeaderboard(classId)
    ]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href={`/teacher/classes/${classId}`}
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại tổng quan lớp
                </Link>

                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Trophy className="w-8 h-8 text-amber-100" />
                            <h2 className="text-2xl font-extrabold">Bảng Vinh Danh & Điểm Tích Lũy</h2>
                        </div>
                        <p className="text-amber-100 font-medium text-sm mt-2 opacity-90">
                            Lớp: {classInfo?.name} • {classInfo?.course?.name}
                        </p>
                    </div>
                </div>
            </div>

            <PointsManagerClient classId={classId} initialLeaderboard={leaderboard} />
        </div>
    );
}
