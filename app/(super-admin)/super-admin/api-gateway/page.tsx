import { Metadata } from "next";
import { getSchoolsWithApiQuotas } from "@/lib/actions/schools";
import {
    Cpu,
    Radio,
    Terminal,
    Key,
    Activity,
    CheckCircle2,
    Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "API Gateway & Quota | Super Admin",
    description: "Giám sát API Gateway, Circuit Breaker và hạn ngạch Token toàn hệ thống.",
};

export default async function ApiGatewayPage() {
    const schools = await getSchoolsWithApiQuotas();

    const totalQuota = schools.reduce((acc, s) => acc + (s.quota?.token_quota || 0), 0);
    const totalUsed = schools.reduce((acc, s) => acc + (s.quota?.tokens_used || 0), 0);
    const totalJobs = schools.reduce((acc, s) => acc + (s.quota?.job_count || 0), 0);

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-blue-600" />
                        API Gateway & Quota Quản Trị
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kiểm soát cổng API, Circuit Breaker và hạn ngạch kết nối AI cho tất cả cơ sở trường học.
                    </p>
                </div>
            </div>

            {/* Gateway Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200/80 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái Gateway</CardTitle>
                        <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Trực tuyến (Online)</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Circuit Breaker: CLOSED (Bình thường)
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/80 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hạn ngạch Token cấp phát</CardTitle>
                        <Zap className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="text-xl font-bold text-slate-900">
                            {(totalQuota / 1000000).toFixed(2)}M Tokens
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Đã dùng: {(totalUsed / 1000).toFixed(1)}k tokens ({totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0}%)
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/80 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tác vụ AI xử lý</CardTitle>
                        <Activity className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="text-xl font-bold text-slate-900">
                            {totalJobs} Jobs
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Phân tích điểm, phát hiện lỗ hổng, sinh bài tập
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* School API Key Directory */}
            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-600" />
                        Danh bạ API Key các trường
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Khóa định danh API kết nối và phân bổ tài nguyên cho từng trường học.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Trường</th>
                                <th className="px-4 py-3">Mã API Key</th>
                                <th className="px-4 py-3">Token Quota Tháng</th>
                                <th className="px-4 py-3">Max Concurrency</th>
                                <th className="px-4 py-3">AI Engine</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {schools.map((school) => (
                                <tr key={school.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-900">{school.name}</div>
                                        <div className="text-[11px] font-mono text-blue-600">{school.code}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-700">
                                        <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[11px]">
                                            {school.apiKey ? `${school.apiKey.prefix}…` : "Chưa tạo"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-700">
                                        {((school.quota?.token_quota || 0) / 1000).toLocaleString()}k tokens
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                        {school.quota?.max_parallel_jobs || 5} luồng
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                school.ai_enabled
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-red-50 text-red-700 border-red-200"
                                            )}
                                        >
                                            {school.ai_enabled ? "Đang bật" : "Tạm dừng"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SDK & Integration Guide Card */}
            <Card className="bg-white border-slate-200/80 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-600" />
                        Tài liệu tích hợp API Gateway
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        Cấu trúc Endpoint và Request Header chuẩn để kết nối vào hệ thống
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-700">1. Endpoint Tra cứu thông tin & Hạn ngạch:</span>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-emerald-700">
                            GET /api/schools/[schoolId]
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-700">2. Request Headers bắt buộc:</span>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 space-y-0.5">
                            <div>Content-Type: application/json</div>
                            <div>x-school-api-key: sch_live_&lt;API_KEY_CUA_TRUONG&gt;</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
