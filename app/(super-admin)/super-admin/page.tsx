import { Metadata } from "next";
import Link from "next/link";
import { getSuperAdminDashboardData } from "@/lib/actions/super-admin";
import {
    Building2,
    Users,
    Cpu,
    BookOpen,
    KeyRound,
    History,
    ArrowUpRight,
    ArrowRight,
    SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "Tổng quan nền tảng | Super Admin",
    description: "Bảng điều khiển quản trị nền tảng và giám sát cơ sở trường học.",
};

export default async function SuperAdminOverviewPage() {
    const data = await getSuperAdminDashboardData();

    return (
        <div className="space-y-6 pb-12">
            {/* Header / Hero Banner with subtle gradient blue */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 p-6 sm:p-7 text-white shadow-sm">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-xs">
                            <span>Quản trị nền tảng</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            Tổng quan hệ thống LMS
                        </h1>
                        <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
                            Giám sát hoạt động các cơ sở trường học, kiểm soát tài khoản, hạn ngạch AI và thực hiện can thiệp hệ thống.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Link href="/super-admin/accounts">
                            <Button className="bg-white text-blue-700 hover:bg-blue-50 font-medium text-xs h-9 px-3.5 shadow-xs gap-1.5">
                                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                                Quản lý Mật khẩu
                            </Button>
                        </Link>
                        <Link href="/super-admin/activities">
                            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 text-xs h-9 px-3.5 gap-1.5 backdrop-blur-xs">
                                <History className="w-3.5 h-3.5" />
                                Lịch sử Hoạt động
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Trường học */}
                <Card className="bg-white border-slate-200/80 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Cơ sở trường học
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{data.totalSchools}</span>
                            <span className="text-xs font-medium text-emerald-600">
                                ({data.activeSchools} hoạt động)
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {data.inactiveSchools} cơ sở tạm dừng
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 2: Người dùng */}
                <Card className="bg-white border-slate-200/80 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Tài khoản người dùng
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <Users className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{data.totalUsers}</span>
                            <span className="text-xs text-slate-500">tổng số</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                            <div><strong className="text-slate-900">{data.userBreakdown.students}</strong> HS</div>
                            <div><strong className="text-slate-900">{data.userBreakdown.teachers}</strong> GV</div>
                            <div><strong className="text-slate-900">{data.userBreakdown.parents}</strong> PH</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 3: Học vụ */}
                <Card className="bg-white border-slate-200/80 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Dữ liệu học vụ
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                            <BookOpen className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{data.totalClasses}</span>
                            <span className="text-xs text-slate-500">lớp học</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                            <span><strong className="text-slate-900">{data.totalExams}</strong> bài thi</span>
                            <span>•</span>
                            <span><strong className="text-slate-900">{data.totalHomework}</strong> bài tập</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 4: AI & API */}
                <Card className="bg-white border-slate-200/80 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            AI Tokens đã dùng
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
                            <Cpu className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-900">
                                {(data.aiTokenStats.totalUsed / 1000).toFixed(1)}k
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                                / {(data.aiTokenStats.totalQuota / 1000).toFixed(0)}k
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    data.aiTokenStats.percentUsed > 90
                                        ? "bg-red-500"
                                        : data.aiTokenStats.percentUsed > 70
                                        ? "bg-amber-500"
                                        : "bg-blue-600"
                                )}
                                style={{ width: `${Math.min(100, data.aiTokenStats.percentUsed)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {data.aiTokenStats.totalJobs} tác vụ AI đã xử lý
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-600">Thao tác can thiệp nhanh:</span>
                <Link href="/super-admin/accounts">
                    <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        Đổi mật khẩu người dùng
                    </Button>
                </Link>
                <Link href="/super-admin/activities">
                    <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 gap-1.5">
                        <History className="w-3.5 h-3.5 text-blue-600" />
                        Nhật ký hoạt động
                    </Button>
                </Link>
                <Link href="/super-admin/api-gateway">
                    <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                        Điều chỉnh Quota AI
                    </Button>
                </Link>
            </div>

            {/* Schools Overview Table */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Danh sách các cơ sở trường học
                        </h2>
                        <p className="text-xs text-slate-500">
                            Theo dõi số liệu học vụ, nhân sự và quản lý từng cơ sở
                        </p>
                    </div>
                    <Link href="/super-admin/schools">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs gap-1">
                            Xem tất cả cơ sở
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </Link>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Mã & Tên trường</th>
                                    <th className="px-4 py-3">Lớp học</th>
                                    <th className="px-4 py-3">Nhân sự (GV / HS / PH)</th>
                                    <th className="px-4 py-3">AI Quota</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.schoolsSummary.map((school) => {
                                    return (
                                        <tr
                                            key={school.id}
                                            className="hover:bg-slate-50/60 transition-colors group"
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                                                        {school.code.slice(0, 3)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                {school.name}
                                                            </span>
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                                                                {school.code}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                                                {school.classCount} lớp
                                            </td>

                                            <td className="px-4 py-3.5 text-xs">
                                                <div className="text-slate-700">
                                                    <span className="font-semibold text-blue-700">{school.teacherCount}</span> GV • <span className="font-semibold text-slate-900">{school.studentCount}</span> HS
                                                    <span className="text-slate-500 ml-1.5">({school.parentCount} PH)</span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5 min-w-[160px]">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs font-mono">
                                                        <span className="text-slate-600">
                                                            {(school.tokensUsed / 1000).toFixed(1)}k / {(school.tokenQuota / 1000).toFixed(0)}k
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "font-semibold text-[11px]",
                                                                school.percentUsed > 90 ? "text-red-600" : school.percentUsed > 70 ? "text-amber-600" : "text-blue-600"
                                                            )}
                                                        >
                                                            {school.percentUsed}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                school.percentUsed > 90 ? "bg-red-500" : school.percentUsed > 70 ? "bg-amber-500" : "bg-blue-600"
                                                            )}
                                                            style={{ width: `${Math.min(100, school.percentUsed)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                                                        school.status === "active"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                                    )}
                                                >
                                                    {school.status === "active" ? "Hoạt động" : "Tạm dừng"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3.5 text-right">
                                                <Link href={`/super-admin/schools/${school.id}`}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-7 px-2.5 border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 gap-1"
                                                    >
                                                        <span>Chi tiết & Can thiệp</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
