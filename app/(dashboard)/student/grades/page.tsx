import { fetchStudentGrades } from "@/lib/actions/student";
import Link from "next/link";
import { TrendingUp, Award, CheckCircle, XCircle } from "lucide-react";

export default async function StudentGradesPage() {
    const { data: grades } = await fetchStudentGrades();

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kết quả học tập</h1>
                <p className="text-slate-500 mt-2 font-medium">Lịch sử điểm số và các bài kiểm tra bạn đã thực hiện.</p>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-indigo-500" />
                        Bảng điểm chi tiết
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
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa có kết quả</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Bạn chưa hoàn thành bài kiểm tra nào. Kết quả sẽ được cập nhật tại đây sau khi bạn nộp bài.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
