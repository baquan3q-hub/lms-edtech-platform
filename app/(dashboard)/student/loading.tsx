import { Loader2 } from "lucide-react";

export default function StudentDashboardLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Đang tải dữ liệu học tập...</h3>
            <p className="text-sm text-slate-500">Hệ thống đang tổng hợp tiến độ và các bài tập của bạn</p>
        </div>
    );
}
