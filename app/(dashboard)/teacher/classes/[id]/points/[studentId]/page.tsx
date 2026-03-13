import { ArrowLeft, Clock, PlusCircle, MinusCircle, Calendar as CalendarIcon, History, Filter } from "lucide-react";
import Link from "next/link";
import { fetchClassDetails } from "../../actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentPointHistory } from "@/lib/actions/point";
import { Badge } from "@/components/ui/badge";

export default async function StudentPointHistoryPage({ params }: { params: Promise<{ id: string, studentId: string }> }) {
    const resolvedParams = await params;
    const classId = resolvedParams.id;
    const studentId = resolvedParams.studentId;

    const adminSupabase = createAdminClient();

    const [
        { data: classInfo },
        { data: history },
        { data: studentInfo }
    ] = await Promise.all([
        fetchClassDetails(classId),
        getStudentPointHistory(studentId, classId),
        adminSupabase.from('users').select('full_name').eq('id', studentId).single()
    ]);

    const totalPoints = history.reduce((acc: number, curr: any) => acc + curr.points, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href={`/teacher/classes/${classId}/points`}
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại Bảng Vinh Danh
                </Link>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-indigo-50">
                            <span className="text-2xl font-black text-indigo-600">
                                {studentInfo?.full_name?.charAt(0).toUpperCase() || "S"}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900">{studentInfo?.full_name || "Học sinh ẩn danh"}</h2>
                            <p className="text-slate-500 font-medium text-sm mt-0.5 mt-1">
                                {classInfo?.name} • {classInfo?.course?.name}
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-100 flex flex-col items-center">
                        <p className="text-sm font-semibold text-slate-500 mb-1">Tổng điểm hiện tại</p>
                        <p className={`text-4xl font-black ${totalPoints > 0 ? 'text-indigo-600' : totalPoints < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                            {totalPoints}
                        </p>
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                        <History className="w-5 h-5 mr-2 text-indigo-500" /> Lịch sử Điểm số
                    </h3>
                </div>

                <div className="p-6">
                    {history && history.length > 0 ? (
                        <div className="relative border-l-2 border-slate-200 ml-3 md:ml-6 space-y-8 pb-4">
                            {history.map((tx: any, idx: number) => {
                                const isPositive = tx.points > 0;
                                const dateObj = new Date(tx.created_at);
                                const dateStr = dateObj.toLocaleDateString('vi-VN');
                                const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={tx.id} className="relative pl-6 md:pl-8 group">
                                        <div className={`absolute -left-[17px] top-1 rounded-full p-1.5 border-4 border-white ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {isPositive ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                                        </div>
                                        <div className="bg-white border text-left border-slate-100 p-4 rounded-xl shadow-sm group-hover:shadow-md group-hover:border-slate-200 transition-all">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-base">{tx.reason}</p>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs px-2 py-0">
                                                            Phân loại: {tx.type === 'attendance' ? 'Chuyên cần' : tx.type === 'participation' ? 'Phát biểu' : tx.type === 'homework' ? 'Bài tập' : tx.type === 'behavior' ? 'Kỷ luật/Thái độ' : 'Khác'}
                                                        </Badge>
                                                        <span className="text-xs font-semibold text-slate-400 flex items-center">
                                                            Giáo viên: {tx.teacher?.full_name || "Hệ thống"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`font-black text-xl shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {isPositive ? `+${tx.points}` : tx.points}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-400 pt-3 border-t border-slate-50">
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                <span>{timeStr} • {dateStr}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-16 text-center">
                            <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Học sinh chưa có lịch sử cộng/trừ điểm.</p>
                            <p className="text-sm text-slate-400 mt-1">Các lượt cộng trừ điểm sẽ hiển thị tại đây dưới dạng dòng thời gian.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
