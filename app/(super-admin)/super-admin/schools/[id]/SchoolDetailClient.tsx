"use client";

import { useState } from "react";
import Link from "next/link";
import { SchoolDeepDiveData } from "@/lib/actions/super-admin";
import {
    updateSchoolQuotaAction,
    toggleSchoolAiAction,
    testSchoolAiApiAction,
} from "@/lib/actions/schools";
import {
    adminDirectResetPassword,
    adminToggleUserStatus,
} from "@/lib/actions/super-admin-accounts";
import {
    Building2,
    Users,
    BookOpen,
    Cpu,
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    Key,
    KeyRound,
    Activity,
    Loader2,
    ExternalLink,
    Zap,
    FileText,
    DollarSign,
    Sparkles,
    UserX,
    UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SchoolApiKeyManager } from "@/components/super-admin/SchoolApiKeyManager";
import { cn } from "@/lib/utils";

interface SchoolDetailClientProps {
    data: SchoolDeepDiveData;
}

export default function SchoolDetailClient({ data: initialData }: SchoolDetailClientProps) {
    const [data, setData] = useState<SchoolDeepDiveData>(initialData);
    const [activeTab, setActiveTab] = useState<"members" | "classes" | "exams" | "ai" | "finance">("members");
    const [roleFilter, setRoleFilter] = useState<string>("all");

    // API key dialog
    const [isKeyOpen, setIsKeyOpen] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [isTestOpen, setIsTestOpen] = useState(false);

    // AI Quota edit state
    const [isUpdatingQuota, setIsUpdatingQuota] = useState(false);
    const [tokenQuotaInput, setTokenQuotaInput] = useState(data.quota.token_quota);
    const [maxParallelInput, setMaxParallelInput] = useState(data.quota.max_parallel_jobs);

    // Member Password Reset Modal
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{ id: string; user_id: string; full_name: string; email: string } | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [resetReason, setResetReason] = useState("Super Admin trực tiếp đổi mật khẩu thành viên");
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Member Status Toggle loading
    const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

    // Toggle AI
    async function handleToggleAi() {
        const nextState = !data.school.ai_enabled;
        setData((prev) => ({
            ...prev,
            school: { ...prev.school, ai_enabled: nextState },
        }));

        const res = await toggleSchoolAiAction(data.school.id, nextState);
        if (res.success) {
            toast.success(nextState ? "Đã bật AI API cho trường!" : "Đã tắt AI API cho trường!");
        } else {
            toast.error("Lỗi cập nhật", { description: res.error });
            setData((prev) => ({
                ...prev,
                school: { ...prev.school, ai_enabled: !nextState },
            }));
        }
    }

    // Update Quota
    async function handleSaveQuota(resetUsage = false) {
        setIsUpdatingQuota(true);
        try {
            const res = await updateSchoolQuotaAction(data.school.id, {
                token_quota: tokenQuotaInput,
                max_parallel_jobs: maxParallelInput,
                resetTokensUsed: resetUsage,
            });

            if (res.success) {
                toast.success(
                    resetUsage
                        ? "Đã lưu hạn ngạch và đặt lại số token đã dùng về 0!"
                        : "Cập nhật hạn ngạch AI thành công!"
                );
                setData((prev) => ({
                    ...prev,
                    quota: {
                        ...prev.quota,
                        token_quota: tokenQuotaInput,
                        max_parallel_jobs: maxParallelInput,
                        tokens_used: resetUsage ? 0 : prev.quota.tokens_used,
                        percentUsed:
                            tokenQuotaInput > 0
                                ? Math.round(((resetUsage ? 0 : prev.quota.tokens_used) / tokenQuotaInput) * 100)
                                : 0,
                    },
                }));
            } else {
                toast.error("Không thể lưu hạn ngạch", { description: res.error });
            }
        } catch (err: any) {
            toast.error("Lỗi", { description: err.message });
        } finally {
            setIsUpdatingQuota(false);
        }
    }

    // Test ping API Gateway
    async function handleTestPing() {
        setIsTesting(true);
        setIsTestOpen(true);
        setTestResult(null);

        try {
            const res = await testSchoolAiApiAction(data.school.id);
            setTestResult(res);
        } catch {
            setTestResult({ success: false, message: "Lỗi kết nối tới Gateway." });
        } finally {
            setIsTesting(false);
        }
    }

    // Direct password reset modal handler
    function openResetPasswordModal(m: { id: string; user_id: string; full_name: string; email: string }) {
        setSelectedMember(m);
        setNewPassword("");
        setResetReason("Super Admin trực tiếp đổi mật khẩu thành viên");
        setIsResetPasswordOpen(true);
    }

    function generateRandomPassword() {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
        let pwd = "";
        for (let i = 0; i < 10; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewPassword(pwd);
    }

    async function handleConfirmResetPassword() {
        if (!selectedMember) return;
        if (!newPassword || newPassword.length < 6) {
            toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự.");
            return;
        }

        setIsSubmittingPassword(true);
        try {
            const res = await adminDirectResetPassword(selectedMember.user_id, newPassword, resetReason);
            if (res.success) {
                toast.success("Đổi mật khẩu thành công!", {
                    description: `Đã cập nhật mật khẩu cho ${selectedMember.email}.`,
                });
                setIsResetPasswordOpen(false);
            } else {
                toast.error("Lỗi", { description: res.message });
            }
        } catch (err: any) {
            toast.error("Lỗi hệ thống", { description: err.message });
        } finally {
            setIsSubmittingPassword(false);
        }
    }

    // Toggle member status
    async function handleToggleMemberStatus(userId: string, currentStatus: string) {
        const nextStatus = currentStatus === "active" ? "suspended" : "active";
        setTogglingUserId(userId);

        try {
            const res = await adminToggleUserStatus(
                userId,
                nextStatus,
                `Super Admin điều chỉnh trạng thái thành viên cơ sở ${data.school.code}`
            );

            if (res.success) {
                setData((prev) => ({
                    ...prev,
                    members: prev.members.map((m) =>
                        m.user_id === userId ? { ...m, status: nextStatus } : m
                    ),
                }));
                toast.success(nextStatus === "active" ? "Đã kích hoạt thành viên!" : "Đã tạm dừng thành viên!");
            } else {
                toast.error("Lỗi", { description: res.message });
            }
        } catch (err: any) {
            toast.error("Lỗi", { description: err.message });
        } finally {
            setTogglingUserId(null);
        }
    }

    // Filter members
    const filteredMembers = data.members.filter((m) => {
        if (roleFilter === "all") return true;
        return m.role === roleFilter;
    });

    return (
        <div className="space-y-6 pb-16">
            {/* Top Navigation Back Link */}
            <div className="flex items-center justify-between">
                <Link
                    href="/super-admin"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại Tổng quan</span>
                </Link>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestPing}
                        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs h-8 gap-1.5 shadow-xs"
                    >
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                        Kiểm tra kết nối API
                    </Button>
                    <Link href="/admin">
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5 shadow-xs"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Giao diện Trường
                        </Button>
                    </Link>
                </div>
            </div>

            {/* School Hero Overview Card with Gradient Blue */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center font-bold text-lg shrink-0 border border-white/30">
                            {data.school.code.slice(0, 3)}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                                    {data.school.name}
                                </h1>
                                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-white/20 border border-white/30">
                                    {data.school.code}
                                </span>
                                <span
                                    className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                                        data.school.status === "active"
                                            ? "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30"
                                            : "bg-amber-500/20 text-amber-100 border border-amber-400/30"
                                    )}
                                >
                                    {data.school.status === "active" ? "Hoạt động" : "Tạm dừng"}
                                </span>
                            </div>

                            <p className="text-xs text-blue-100 mt-1">
                                {data.school.address || "Chưa có địa chỉ"} • {data.school.phone || "Chưa có SĐT"} • {data.school.email || "Chưa có email"}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                <div className="flex items-center gap-1.5 text-xs font-mono bg-white/10 px-2.5 py-1 rounded-lg border border-white/20">
                                    <Key className="w-3 h-3 text-amber-300" />
                                    <span>API Key: {data.school.apiKey ? `${data.school.apiKey.prefix}…` : "chưa tạo"}</span>
                                    <button
                                        onClick={() => setIsKeyOpen(true)}
                                        className="text-white/80 hover:text-white ml-1 cursor-pointer underline-offset-2 hover:underline font-sans"
                                        title="Tạo mới hoặc thu hồi API Key"
                                    >
                                        Quản lý
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-blue-100">AI API:</span>
                                    <button
                                        onClick={handleToggleAi}
                                        className={cn(
                                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                            data.school.ai_enabled ? "bg-emerald-500" : "bg-white/30"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                                                data.school.ai_enabled ? "translate-x-4" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats on the right */}
                    <div className="grid grid-cols-3 gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/20 lg:pl-6 text-center">
                        <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20">
                            <span className="text-xs text-blue-100 block">Thành viên</span>
                            <span className="text-lg font-bold">{data.members.length}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20">
                            <span className="text-xs text-blue-100 block">Lớp học</span>
                            <span className="text-lg font-bold">{data.classes.length}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20">
                            <span className="text-xs text-blue-100 block">Bài thi/KT</span>
                            <span className="text-lg font-bold">{data.exams.length + data.homework.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 space-x-1 sm:space-x-2 overflow-x-auto pb-1 text-sm font-medium">
                <button
                    onClick={() => setActiveTab("members")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors shrink-0 text-xs font-semibold",
                        activeTab === "members"
                            ? "bg-white text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    )}
                >
                    <Users className="w-3.5 h-3.5" />
                    <span>Nhân sự & Người dùng ({data.members.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("classes")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors shrink-0 text-xs font-semibold",
                        activeTab === "classes"
                            ? "bg-white text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    )}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lớp học ({data.classes.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("exams")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors shrink-0 text-xs font-semibold",
                        activeTab === "exams"
                            ? "bg-white text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    )}
                >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Đánh giá & Bài tập ({data.exams.length + data.homework.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("ai")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors shrink-0 text-xs font-semibold",
                        activeTab === "ai"
                            ? "bg-white text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    )}
                >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Hạn ngạch AI & Jobs ({data.recentAiJobs.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("finance")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors shrink-0 text-xs font-semibold",
                        activeTab === "finance"
                            ? "bg-white text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    )}
                >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Hóa đơn thu phí ({data.invoices.length})</span>
                </button>
            </div>

            {/* TAB CONTENT 1: MEMBERS */}
            {activeTab === "members" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span>Lọc vai trò:</span>
                            <div className="flex items-center gap-1">
                                {["all", "teacher", "student", "parent", "admin"].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setRoleFilter(r)}
                                        className={cn(
                                            "px-2.5 py-1 rounded text-xs transition-colors",
                                            roleFilter === r
                                                ? "bg-blue-600 text-white font-medium"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        {r === "all" ? "Tất cả" : r === "teacher" ? "Giáo viên" : r === "student" ? "Học sinh" : r === "parent" ? "Phụ huynh" : "Admin"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <span className="text-xs text-slate-500">
                            {filteredMembers.length} thành viên
                        </span>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Họ và tên</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Vai trò</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Ngày tham gia</th>
                                    <th className="px-4 py-3 text-right">Can thiệp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMembers.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-900 text-xs">
                                            {m.full_name}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                                            {m.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
                                                    m.role === "admin"
                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                        : m.role === "teacher"
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : m.role === "student"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                )}
                                            >
                                                {m.role === "admin" ? "Admin trường" : m.role === "teacher" ? "Giáo viên" : m.role === "student" ? "Học sinh" : "Phụ huynh"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                    m.status === "active"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-red-50 text-red-700 border-red-200"
                                                )}
                                            >
                                                {m.status === "active" ? "Hoạt động" : "Tạm dừng"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                                            {new Date(m.created_at).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Reset Password */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openResetPasswordModal(m)}
                                                    className="h-7 text-xs px-2.5 border-slate-200 text-blue-700 hover:text-blue-800 hover:bg-blue-50 gap-1 font-medium"
                                                >
                                                    <KeyRound className="w-3 h-3 text-blue-600" />
                                                    <span>Đổi mật khẩu</span>
                                                </Button>

                                                {/* Toggle Status */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={togglingUserId === m.user_id}
                                                    onClick={() => handleToggleMemberStatus(m.user_id, m.status)}
                                                    className={cn(
                                                        "h-7 text-xs px-2",
                                                        m.status === "active"
                                                            ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                    )}
                                                    title={m.status === "active" ? "Tạm khóa" : "Mở khóa"}
                                                >
                                                    {m.status === "active" ? (
                                                        <UserX className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 2: CLASSES */}
            {activeTab === "classes" && (
                <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Tên lớp học</th>
                                <th className="px-4 py-3">Lịch học</th>
                                <th className="px-4 py-3">Sĩ số tối đa</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3">Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.classes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                                        Trường chưa thiết lập lớp học nào.
                                    </td>
                                </tr>
                            ) : (
                                data.classes.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-900 text-xs">
                                            {cls.name || "Lớp học chưa đặt tên"}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {cls.schedule || "Chưa có lịch"}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-700 font-medium">
                                            {cls.max_students} học sinh
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {cls.status || "active"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                                            {new Date(cls.created_at).toLocaleDateString("vi-VN")}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB CONTENT 3: EXAMS & HOMEWORK */}
            {activeTab === "exams" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Exams */}
                    <div className="space-y-2.5">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Bài kiểm tra ({data.exams.length})
                        </h3>
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                            <div className="divide-y divide-slate-100">
                                {data.exams.length === 0 ? (
                                    <p className="p-4 text-xs text-slate-500 text-center">Chưa có bài kiểm tra nào.</p>
                                ) : (
                                    data.exams.map((ex) => (
                                        <div key={ex.id} className="p-3.5 hover:bg-slate-50/60 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 text-xs">{ex.title}</h4>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{ex.description || "Không có mô tả"}</p>
                                                </div>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {ex.total_points} điểm
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                                                <span>Thời lượng: {ex.duration_minutes} phút</span>
                                                <span>•</span>
                                                <span>{ex.is_published ? "Đã công bố" : "Bản nháp"}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Homework */}
                    <div className="space-y-2.5">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                            Bài tập về nhà ({data.homework.length})
                        </h3>
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                            <div className="divide-y divide-slate-100">
                                {data.homework.length === 0 ? (
                                    <p className="p-4 text-xs text-slate-500 text-center">Chưa có bài tập nào.</p>
                                ) : (
                                    data.homework.map((hw) => (
                                        <div key={hw.id} className="p-3.5 hover:bg-slate-50/60 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 text-xs">{hw.title}</h4>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        Hạn: {hw.due_date ? new Date(hw.due_date).toLocaleDateString("vi-VN") : "Không thời hạn"}
                                                    </p>
                                                </div>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {hw.total_points} điểm
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                                                <span>{hw.is_published ? "Đang mở" : "Bản nháp"}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 4: AI QUOTA & JOBS */}
            {activeTab === "ai" && (
                <div className="space-y-5">
                    {/* Quota Control Card */}
                    <Card className="bg-white border-slate-200/80 shadow-xs">
                        <CardHeader className="p-4 pb-2 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-blue-600" />
                                Hạn ngạch AI Token & Luồng xử lý
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                Điều chỉnh hạn ngạch Token cấp phát cho trường và số luồng xử lý đồng thời
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600 font-medium">Hạn ngạch Token / Tháng</Label>
                                    <Input
                                        type="number"
                                        value={tokenQuotaInput}
                                        onChange={(e) => setTokenQuotaInput(Number(e.target.value))}
                                        step={100000}
                                        className="bg-slate-50 border-slate-200 font-mono text-xs h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600 font-medium">Số luồng đồng thời (Concurrency)</Label>
                                    <Input
                                        type="number"
                                        value={maxParallelInput}
                                        onChange={(e) => setMaxParallelInput(Number(e.target.value))}
                                        min={1}
                                        max={20}
                                        className="bg-slate-50 border-slate-200 font-mono text-xs h-9"
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button
                                        onClick={() => handleSaveQuota(false)}
                                        disabled={isUpdatingQuota}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 shadow-xs"
                                    >
                                        {isUpdatingQuota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lưu hạn ngạch"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleSaveQuota(true)}
                                        disabled={isUpdatingQuota}
                                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-9"
                                        title="Đặt lại mức sử dụng token về 0"
                                    >
                                        Reset Usage
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent AI Jobs */}
                    <div className="space-y-2.5">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            Nhật ký tác vụ AI gần nhất ({data.recentAiJobs.length})
                        </h3>
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Loại tác vụ</th>
                                        <th className="px-4 py-3">Mô hình AI</th>
                                        <th className="px-4 py-3">Tokens đã dùng</th>
                                        <th className="px-4 py-3">Trạng thái</th>
                                        <th className="px-4 py-3">Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {data.recentAiJobs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                Trường chưa chạy tác vụ AI nào gần đây.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.recentAiJobs.map((job) => (
                                            <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-900">
                                                    {job.kind}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600">
                                                    {job.model_name}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-blue-700">
                                                    {job.actual_tokens} tokens
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {job.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 font-mono">
                                                    {new Date(job.created_at).toLocaleString("vi-VN")}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 5: FINANCE */}
            {activeTab === "finance" && (
                <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Mã hóa đơn</th>
                                <th className="px-4 py-3">Số tiền</th>
                                <th className="px-4 py-3">Trạng thái thanh toán</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {data.invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                                        Chưa có dữ liệu giao dịch thu phí nào.
                                    </td>
                                </tr>
                            ) : (
                                data.invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-500">
                                            {inv.id}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-emerald-700 text-xs">
                                            {Number(inv.amount).toLocaleString("vi-VN")} đ
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                    inv.status === "completed" || inv.status === "paid"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                )}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Direct Member Password Reset Modal */}
            <Dialog open={isKeyOpen} onOpenChange={setIsKeyOpen}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Key className="w-5 h-5 text-amber-500" />
                            API Key trường [{data.school.code}]
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Dùng cho endpoint /api/schools/{data.school.id}. Hệ thống chỉ lưu bản băm nên key gốc chỉ hiện một lần lúc tạo.
                        </DialogDescription>
                    </DialogHeader>
                    <SchoolApiKeyManager
                        schoolId={data.school.id}
                        schoolCode={data.school.code}
                        initialInfo={data.school.apiKey}
                        onChange={(info) => setData((prev) => ({ ...prev, school: { ...prev.school, apiKey: info } }))}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
                <DialogContent className="max-w-md bg-white border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-blue-600" />
                            Đổi mật khẩu thành viên
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Cập nhật trực tiếp mật khẩu cho thành viên trường [{data.school.code}]
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMember && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
                                <div className="font-semibold text-slate-900">{selectedMember.full_name}</div>
                                <div className="text-blue-700 font-mono">{selectedMember.email}</div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-slate-700">Mật khẩu mới</Label>
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Tạo ngẫu nhiên
                                    </button>
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Nhập tối thiểu 6 ký tự..."
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-9 text-xs border-slate-200"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Lý do can thiệp</Label>
                                <Input
                                    type="text"
                                    value={resetReason}
                                    onChange={(e) => setResetReason(e.target.value)}
                                    className="h-9 text-xs border-slate-200"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsResetPasswordOpen(false)}
                            className="text-xs h-8"
                        >
                            Hủy
                        </Button>
                        <Button
                            size="sm"
                            disabled={isSubmittingPassword || !newPassword || newPassword.length < 6}
                            onClick={handleConfirmResetPassword}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shadow-xs"
                        >
                            {isSubmittingPassword ? "Đang lưu..." : "Lưu mật khẩu"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Test Ping Modal */}
            <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
                <DialogContent className="max-w-md bg-white text-slate-900 border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                            <Activity className="w-4 h-4 text-blue-600" />
                            Kết quả kiểm tra kết nối API Gateway
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Chẩn đoán kết nối và kiểm tra tính hợp lệ quota của [{data.school.code}]
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3">
                        {isTesting ? (
                            <div className="flex flex-col items-center justify-center py-6 space-y-2">
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                <p className="text-xs text-slate-500">Đang gửi gói tin kiểm tra...</p>
                            </div>
                        ) : testResult ? (
                            <div className="space-y-3">
                                <div
                                    className={cn(
                                        "p-3 rounded-lg border flex items-start gap-2.5",
                                        testResult.allowed
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                            : "bg-red-50 border-red-200 text-red-800"
                                    )}
                                >
                                    {testResult.allowed ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h4 className="font-semibold text-xs">
                                            {testResult.allowed ? "Kết nối bình thường" : "Cảnh báo dịch vụ"}
                                        </h4>
                                        <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <span className="text-slate-500 block">Độ trễ:</span>
                                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                                            {testResult.latencyMs} ms
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <span className="text-slate-500 block">Mạch an toàn:</span>
                                        <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                                            {testResult.circuitState || "CLOSED"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleTestPing}
                            disabled={isTesting}
                            className="border-slate-200 text-xs h-8"
                        >
                            Thử lại
                        </Button>
                        <Button onClick={() => setIsTestOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
