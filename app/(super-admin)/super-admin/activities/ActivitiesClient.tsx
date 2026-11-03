"use client";

import { useState } from "react";
import { AuditLogItem } from "@/lib/actions/super-admin-accounts";
import {
    History,
    Search,
    Building2,
    Clock,
    User,
    Shield,
    ChevronDown,
    ChevronUp,
    FileJson,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActivitiesClientProps {
    initialLogs: AuditLogItem[];
    schools: Array<{ id: string; name: string; code: string }>;
}

export default function ActivitiesClient({
    initialLogs,
    schools,
}: ActivitiesClientProps) {
    const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
    const [search, setSearch] = useState("");
    const [schoolFilter, setSchoolFilter] = useState("all");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const filteredLogs = logs.filter((item) => {
        const matchesSearch =
            search.trim() === "" ||
            item.action.toLowerCase().includes(search.toLowerCase()) ||
            (item.actor_name && item.actor_name.toLowerCase().includes(search.toLowerCase())) ||
            (item.actor_email && item.actor_email.toLowerCase().includes(search.toLowerCase())) ||
            item.entity_type.toLowerCase().includes(search.toLowerCase());

        const matchesSchool = schoolFilter === "all" || item.school_id === schoolFilter;

        return matchesSearch && matchesSchool;
    });

    function formatActionName(action: string): string {
        switch (action) {
            case "super_admin_direct_password_override":
                return "Can thiệp đổi mật khẩu";
            case "super_admin_activate_account":
                return "Kích hoạt tài khoản";
            case "super_admin_suspend_account":
                return "Khóa tài khoản";
            case "reset_password_default":
                return "Reset mật khẩu về mặc định";
            case "grade_submission":
                return "Chấm điểm bài nộp";
            case "create_homework":
                return "Tạo bài tập";
            case "update_score":
                return "Điều chỉnh điểm số";
            case "ai_review_approved":
                return "Phê duyệt nội dung AI";
            case "ai_review_rejected":
                return "Bác bỏ nội dung AI";
            default:
                return action.replace(/_/g, " ");
        }
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        Lịch sử hoạt động & Kiểm toán (Audit Trail)
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Theo dõi nhật ký chi tiết các thao tác quan trọng, can thiệp tài khoản và biến động dữ liệu tại các trường học.
                    </p>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Hiển thị: <strong className="text-slate-900">{filteredLogs.length}</strong> sự kiện
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Tìm kiếm hành động, người thực hiện, đối tượng..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
                        />
                    </div>

                    {/* School Filter */}
                    <div>
                        <select
                            value={schoolFilter}
                            onChange={(e) => setSchoolFilter(e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">Tất cả cơ sở trường</option>
                            {schools.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Activities Table */}
            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Cơ sở trường</th>
                                <th className="px-4 py-3">Người thực hiện</th>
                                <th className="px-4 py-3">Hành động</th>
                                <th className="px-4 py-3">Đối tượng tác động</th>
                                <th className="px-4 py-3 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                                        Chưa có bản ghi nhật ký hoạt động nào.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const isExpanded = expandedLogId === log.id;
                                    const isIntervention = log.action.includes("super_admin") || log.action.includes("reset_password");

                                    return (
                                        <tr
                                            key={log.id}
                                            className={cn(
                                                "transition-colors",
                                                isExpanded ? "bg-blue-50/30" : "hover:bg-slate-50/60"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-xs">
                                                <span className="font-medium text-slate-800">{log.school_name}</span>
                                                {log.school_code && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                                                        {log.school_code}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div>
                                                    <span className="font-semibold text-slate-900 block text-xs">
                                                        {log.actor_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 font-mono">
                                                        {log.actor_email}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                                                        isIntervention
                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                    )}
                                                >
                                                    {formatActionName(log.action)}
                                                </span>
                                                {log.reason && (
                                                    <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                                        "{log.reason}"
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                                                <span className="capitalize text-slate-800 font-medium">{log.entity_type}</span>
                                                <span className="text-slate-400 ml-1">({log.entity_id?.slice(0, 8)}...)</span>
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                    className="h-7 text-xs px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    )}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Expanded Detail Viewer */}
                {expandedLogId && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                        {(() => {
                            const item = filteredLogs.find((l) => l.id === expandedLogId);
                            if (!item) return null;

                            return (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                        <FileJson className="w-4 h-4 text-blue-600" />
                                        <span>Dữ liệu kiểm toán chi tiết (Payload State)</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs font-mono">
                                            <div className="text-[11px] font-bold text-slate-500 mb-1">Trạng thái trước (Before State):</div>
                                            <pre className="overflow-x-auto text-[11px] text-slate-700">
                                                {item.before_state ? JSON.stringify(item.before_state, null, 2) : "None"}
                                            </pre>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs font-mono">
                                            <div className="text-[11px] font-bold text-slate-500 mb-1">Trạng thái sau (After State):</div>
                                            <pre className="overflow-x-auto text-[11px] text-slate-700">
                                                {item.after_state ? JSON.stringify(item.after_state, null, 2) : "None"}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
