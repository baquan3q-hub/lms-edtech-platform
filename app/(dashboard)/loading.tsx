import { GraduationCap } from "lucide-react";

export default function DashboardGeneralLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-6 animate-in fade-in duration-300">
            {/* Multi-layer Motion Spinner */}
            <div className="relative flex items-center justify-center">
                {/* Outer pulsing ring */}
                <div className="w-20 h-20 rounded-full bg-indigo-100/60 animate-ping opacity-30" />
                
                {/* Spinning gradient ring */}
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-indigo-600 border-r-blue-500 animate-spin absolute" />
                
                {/* Inner Icon badge */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20 z-10">
                    <GraduationCap className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Typography */}
            <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                    Đang chuẩn bị không gian làm việc...
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                    Đang đồng bộ dữ liệu học vụ, lịch giảng dạy và số liệu hoạt động.
                </p>
            </div>

            {/* Animated small progress track */}
            <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full animate-pulse w-3/4" />
            </div>
        </div>
    );
}
