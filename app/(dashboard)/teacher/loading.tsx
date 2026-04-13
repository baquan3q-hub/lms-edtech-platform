import { Loader2 } from "lucide-react";

export default function TeacherDashboardLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Đang tải dữ liệu giảng dạy...</h3>
            <p className="text-sm text-slate-500">Hệ thống đang tổng hợp tiến độ các lớp học và lịch giảng</p>
        </div>
    );
}
