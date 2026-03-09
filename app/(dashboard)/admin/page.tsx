import {
    Users,
    BookOpen,
    School,
    CreditCard,
    TrendingUp,
} from "lucide-react";
import AdminAttendanceTodayClient from "./AdminAttendanceTodayClient";

const stats = [
    {
        title: "Tổng người dùng",
        value: "—",
        icon: Users,
        color: "text-blue-400",
        bg: "bg-blue-500/10",
    },
    {
        title: "Khóa học",
        value: "—",
        icon: BookOpen,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
    },
    {
        title: "Lớp học",
        value: "—",
        icon: School,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
    },
    {
        title: "Doanh thu",
        value: "—",
        icon: CreditCard,
        color: "text-purple-400",
        bg: "bg-purple-500/10",
    },
];

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Tổng quan hệ thống
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    Theo dõi hoạt động và số liệu của nền tảng
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-5 hover:bg-slate-900/80 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-slate-400">{stat.title}</p>
                            <div
                                className={`flex items-center justify-center w-9 h-9 rounded-lg ${stat.bg}`}
                            >
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Điểm danh hôm nay — Realtime */}
            <AdminAttendanceTodayClient />
        </div>
    );
}

