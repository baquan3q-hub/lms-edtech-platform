import { fetchStudentGrades } from "@/lib/actions/student";
import { getMyPoints } from "@/lib/actions/point";
import Link from "next/link";
import { TrendingUp, Award, CheckCircle, XCircle, Trophy, Star, PlusCircle, MinusCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function StudentGradesPage() {
    const [{ data: grades }, { data: pointsData }] = await Promise.all([
        fetchStudentGrades(),
        getMyPoints(),
    ]);

    const totalPoints = pointsData?.totalPoints ?? 0;
    const byClass = pointsData?.byClass ?? [];
    const recentHistory = pointsData?.recentHistory ?? [];

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kết quả học tập & Điểm tích lũy</h1>
                <p className="text-slate-500 mt-2 font-medium">Lịch sử điểm số bài kiểm tra và điểm thái độ/đạo đức tích lũy từ giáo viên.</p>
            </div>

            {/* ===== ĐIỂM TÍCH LŨY ===== */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
                <div className="p-6 border-b border-amber-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-amber-900">Điểm Tích Lũy</h2>
                        <p className="text-xs text-amber-600 font-medium">Điểm thái độ & đạo đức được giáo viên đánh giá</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className={`text-3xl font-black ${totalPoints > 0 ? 'text-emerald-600' : totalPoints < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                            {totalPoints > 0 ? `+${totalPoints}` : totalPoints}
                        </p>
                        <p className="text-xs text-amber-600 font-medium">Tổng điểm</p>
                    </div>
                </div>

                {byClass.length > 0 ? (
                    <div className="p-6">
                        {/* Điểm theo lớp */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                            {byClass.map((cls: any) => (
                                <div key={cls.class_id} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                                    <p className="text-sm font-bold text-slate-800 truncate">{cls.class_name}</p>
                                    <p className="text-xs text-slate-500 truncate">{cls.course_name}</p>
                                    <p className={`text-2xl font-black mt-2 ${cls.total_points > 0 ? 'text-emerald-600' : cls.total_points < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                        {cls.total_points > 0 ? `+${cls.total_points}` : cls.total_points}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Lịch sử gần đây */}
                        {recentHistory.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Hoạt động gần đây
                                </h3>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {recentHistory.map((item: any) => {
                                        const isPositive = item.points > 0;
                                        return (
                                            <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100/80">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                                    {isPositive ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{item.reason}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[11px] text-slate-400">
                                                            {item.class?.name || "Lớp học"} • GV: {item.teacher?.full_name || "Giáo viên"}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">
                                                            {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`font-black text-base shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {isPositive ? `+${item.points}` : item.points}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <Star className="w-10 h-10 text-amber-200 mx-auto mb-2" />
                        <p className="text-sm text-amber-700 font-medium">Chưa có điểm tích lũy nào.</p>
                        <p className="text-xs text-amber-500 mt-1">Giáo viên sẽ cập nhật điểm tích lũy dựa trên thái độ và đạo đức của bạn.</p>
                    </div>
                )}
            </div>

            {/* ===== KẾT QUẢ BÀI KIỂM TRA ===== */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-indigo-500" />
                        Bảng điểm bài kiểm tra
                    </h2>
                </div>

                {grades && grades.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-500">Bài kiểm tra</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-500">Thuộc Lớp học</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-500">Ngày nộp</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-500">Trạng thái</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-500 text-right">Điểm số</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {grades.map((grade: any) => (
                                    <tr key={grade.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-900">{grade.title}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{grade.courseName}</div>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-medium text-slate-600">
                                            {grade.className}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-500">
                                            {grade.submittedAt ? new Date(grade.submittedAt).toLocaleString('vi-VN') : 'N/A'}
                                        </td>
                                        <td className="py-4 px-6">
                                            {grade.passed ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Đạt
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cần cố gắng
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className="text-lg font-black text-indigo-600">
                                                {grade.score ?? '-'}
                                                <span className="text-sm font-medium text-slate-400 ml-1">/100</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa có kết quả bài kiểm tra</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Bạn chưa hoàn thành bài kiểm tra nào. Kết quả sẽ được cập nhật tại đây sau khi bạn nộp bài.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
