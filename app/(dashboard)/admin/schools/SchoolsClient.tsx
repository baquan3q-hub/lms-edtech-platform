"use client";

import { useState } from "react";
import {
    SchoolWithQuota,
    createSchoolAction,
    updateSchoolAction,
    updateSchoolQuotaAction,
    toggleSchoolAiAction,
    testSchoolAiApiAction,
} from "@/lib/actions/schools";
import {
    Building2,
    Plus,
    Search,
    Cpu,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Key,
    Activity,
    Settings2,
    Copy,
    Check,
    Loader2,
    RefreshCw,
    ExternalLink,
    Zap,
    Users,
    BookOpen,
    ShieldCheck,
    Radio,
    Terminal,
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
import { cn } from "@/lib/utils";

interface SchoolsClientProps {
    initialSchools: SchoolWithQuota[];
}

export default function SchoolsClient({ initialSchools }: SchoolsClientProps) {
    const [schools, setSchools] = useState<SchoolWithQuota[]>(initialSchools);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal states
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
    const [isTestOpen, setIsTestOpen] = useState(false);

    // Selected school for edit / view
    const [selectedSchool, setSelectedSchool] = useState<SchoolWithQuota | null>(null);

    // Form loading states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [copiedKey, setCopiedKey] = useState(false);

    // Add Form state
    const [addForm, setAddForm] = useState({
        code: "",
        name: "",
        address: "",
        phone: "",
        email: "",
        ai_enabled: true,
        token_quota: 1000000,
        max_parallel_jobs: 5,
    });

    // Edit Form state
    const [editForm, setEditForm] = useState({
        name: "",
        code: "",
        address: "",
        phone: "",
        email: "",
        status: "active" as "active" | "inactive" | "archived",
        ai_enabled: true,
        token_quota: 500000,
        max_parallel_jobs: 5,
        resetTokensUsed: false,
    });

    // Filtered schools
    const filteredSchools = schools.filter((s) => {
        const matchSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStatus = statusFilter === "all" || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // System aggregate stats
    const totalSchools = schools.length;
    const activeSchools = schools.filter((s) => s.status === "active").length;
    const totalTokenQuota = schools.reduce((acc, s) => acc + (s.quota?.token_quota || 0), 0);
    const totalTokensUsed = schools.reduce((acc, s) => acc + (s.quota?.tokens_used || 0), 0);
    const totalJobs = schools.reduce((acc, s) => acc + (s.quota?.job_count || 0), 0);
    const overallPercent = totalTokenQuota > 0 ? Math.round((totalTokensUsed / totalTokenQuota) * 100) : 0;

    // Toggle AI
    async function handleToggleAi(school: SchoolWithQuota) {
        const nextState = !school.ai_enabled;
        // Optimistic UI update
        setSchools((prev) =>
            prev.map((s) => (s.id === school.id ? { ...s, ai_enabled: nextState } : s))
        );

        const res = await toggleSchoolAiAction(school.id, nextState);
        if (res.success) {
            toast.success(
                nextState
                    ? `Đã kích hoạt AI API cho trường [${school.code}]`
                    : `Đã tạm ngắt AI API cho trường [${school.code}]`
            );
        } else {
            toast.error("Không thể cập nhật trạng thái AI", { description: res.error });
            // Revert
            setSchools((prev) =>
                prev.map((s) => (s.id === school.id ? { ...s, ai_enabled: !nextState } : s))
            );
        }
    }

    // Add School
    async function handleCreateSchool(e: React.FormEvent) {
        e.preventDefault();
        if (!addForm.code || !addForm.name) {
            toast.error("Vui lòng điền đầy đủ Mã trường và Tên trường.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await createSchoolAction(addForm);
            if (res.success) {
                toast.success(`Đã thêm trường học '${addForm.name}' thành công!`);
                setIsAddOpen(false);
                setAddForm({
                    code: "",
                    name: "",
                    address: "",
                    phone: "",
                    email: "",
                    ai_enabled: true,
                    token_quota: 1000000,
                    max_parallel_jobs: 5,
                });
                window.location.reload();
            } else {
                toast.error("Lỗi thêm trường học", { description: res.error });
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    // Open Edit Modal
    function openEditModal(school: SchoolWithQuota) {
        setSelectedSchool(school);
        setEditForm({
            name: school.name,
            code: school.code,
            address: school.address || "",
            phone: school.phone || "",
            email: school.email || "",
            status: school.status,
            ai_enabled: school.ai_enabled,
            token_quota: school.quota?.token_quota || 500000,
            max_parallel_jobs: school.quota?.max_parallel_jobs || 5,
            resetTokensUsed: false,
        });
        setIsEditOpen(true);
    }

    // Save Edit School
    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedSchool) return;

        setIsSubmitting(true);
        try {
            // 1. Cập nhật thông tin cơ sở
            const resSchool = await updateSchoolAction(selectedSchool.id, {
                name: editForm.name,
                code: editForm.code,
                address: editForm.address,
                phone: editForm.phone,
                email: editForm.email,
                status: editForm.status,
                ai_enabled: editForm.ai_enabled,
            });

            if (!resSchool.success) {
                toast.error("Lỗi cập nhật trường", { description: resSchool.error });
                return;
            }

            // 2. Cập nhật hạn mức Quota
            const resQuota = await updateSchoolQuotaAction(selectedSchool.id, {
                token_quota: Number(editForm.token_quota),
                max_parallel_jobs: Number(editForm.max_parallel_jobs),
                resetTokensUsed: editForm.resetTokensUsed,
            });

            if (!resQuota.success) {
                toast.error("Lỗi cập nhật hạn ngạch Quota", { description: resQuota.error });
                return;
            }

            toast.success(`Cập nhật cấu hình trường [${editForm.code}] thành công!`);
            setIsEditOpen(false);
            window.location.reload();
        } finally {
            setIsSubmitting(false);
        }
    }

    // Test API Connection
    async function handleTestApi(school: SchoolWithQuota) {
        setSelectedSchool(school);
        setIsTesting(true);
        setIsTestOpen(true);
        setTestResult(null);

        try {
            const res = await testSchoolAiApiAction(school.id);
            setTestResult(res);
        } catch {
            setTestResult({
                success: false,
                message: "Không thể gửi yêu cầu kiểm tra tới API Gateway.",
            });
        } finally {
            setIsTesting(false);
        }
    }

    // Open API Key Dialog
    function openApiKeyModal(school: SchoolWithQuota) {
        setSelectedSchool(school);
        setCopiedKey(false);
        setIsApiKeyOpen(true);
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        toast.success("Đã sao chép vào bộ nhớ tạm!");
        setTimeout(() => setCopiedKey(false), 2500);
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                    Quản Lý Cơ Sở Trường & API Gateway
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Super Admin
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Quản trị danh sách trường học, phân bổ hạn ngạch AI Token, cấu hình API Keys và theo dõi tình trạng mạch kết nối
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm trường mới
                    </Button>
                </div>
            </div>

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-gray-200 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-gray-500">Cơ sở trường học</CardTitle>
                        <Building2 className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">{totalSchools}</span>
                            <span className="text-xs text-emerald-600 font-medium">
                                ({activeSchools} hoạt động)
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                            Tổng các trường học được kết nối
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-gray-500">Hạn ngạch AI Token tháng</CardTitle>
                        <Cpu className="w-4 h-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">
                                {(totalTokensUsed / 1000).toFixed(1)}k
                            </span>
                            <span className="text-xs text-gray-500">
                                / {(totalTokenQuota / 1000).toFixed(0)}k
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    overallPercent > 90 ? "bg-red-500" : overallPercent > 70 ? "bg-amber-500" : "bg-blue-600"
                                )}
                                style={{ width: `${Math.min(100, overallPercent)}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                            Đã sử dụng {overallPercent}% tổng token cấp phát
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-gray-500">Tác vụ AI đã xử lý</CardTitle>
                        <Zap className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">{totalJobs}</span>
                            <span className="text-xs text-blue-600 font-medium">Jobs tháng này</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                            Đánh giá năng lực, chấm bài, gợi ý học tập
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-gray-500">Tình trạng Gateway</CardTitle>
                        <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-base">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>100% Khả dụng</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                            Mạch an toàn Circuit Breaker: Bình thường
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm theo mã trường, tên trường, địa chỉ..."
                        className="pl-9 bg-gray-50/50 border-gray-200 text-sm h-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Trạng thái:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs h-9 px-3 rounded-lg border border-gray-200 bg-gray-50/50 font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Tạm dừng</option>
                        <option value="archived">Lưu trữ</option>
                    </select>
                </div>
            </div>

            {/* Schools Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Mã & Tên Trường</th>
                                <th className="px-4 py-3">Quy mô học vụ</th>
                                <th className="px-4 py-3">Hạn ngạch AI Token</th>
                                <th className="px-4 py-3">API AI</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSchools.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                        Không tìm thấy trường học nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredSchools.map((school) => {
                                    const percent = school.quota?.percentUsed ?? 0;
                                    return (
                                        <tr key={school.id} className="hover:bg-gray-50/60 transition-colors">
                                            {/* Code & Name */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-blue-100">
                                                        {school.code.slice(0, 3)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-gray-900">
                                                                {school.name}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                                {school.code}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {school.address || "Chưa có địa chỉ"} {school.phone ? `• ${school.phone}` : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Roster counts */}
                                            <td className="px-4 py-3.5">
                                                <div className="text-xs text-gray-700 space-y-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{school.classCount} lớp học</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-gray-500">
                                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{school.memberCount} thành viên</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Quota */}
                                            <td className="px-4 py-3.5 min-w-[200px]">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-medium text-gray-700">
                                                            {((school.quota?.tokens_used || 0) / 1000).toFixed(1)}k / {((school.quota?.token_quota || 0) / 1000).toFixed(0)}k
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "font-semibold text-[11px]",
                                                                percent > 90 ? "text-red-600" : percent > 70 ? "text-amber-600" : "text-emerald-600"
                                                            )}
                                                        >
                                                            {percent}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                percent > 90 ? "bg-red-500" : percent > 70 ? "bg-amber-500" : "bg-blue-600"
                                                            )}
                                                            style={{ width: `${Math.min(100, percent)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400">
                                                        Max {school.quota?.max_parallel_jobs || 5} luồng song song
                                                    </p>
                                                </div>
                                            </td>

                                            {/* AI Switch */}
                                            <td className="px-4 py-3.5">
                                                <button
                                                    onClick={() => handleToggleAi(school)}
                                                    className={cn(
                                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2",
                                                        school.ai_enabled ? "bg-blue-600" : "bg-gray-200"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                                            school.ai_enabled ? "translate-x-4" : "translate-x-0"
                                                        )}
                                                    />
                                                </button>
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {school.ai_enabled ? "Bật" : "Tắt"}
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                        school.status === "active"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : school.status === "inactive"
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : "bg-gray-100 text-gray-700 border border-gray-200"
                                                    )}
                                                >
                                                    {school.status === "active" ? "Đang hoạt động" : school.status === "inactive" ? "Tạm dừng" : "Lưu trữ"}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleTestApi(school)}
                                                        className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        title="Kiểm tra kết nối API & Quota"
                                                    >
                                                        <Activity className="w-3.5 h-3.5 mr-1" />
                                                        Test
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openApiKeyModal(school)}
                                                        className="h-8 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                        title="Xem API Key & Hướng dẫn tích hợp"
                                                    >
                                                        <Key className="w-3.5 h-3.5 mr-1" />
                                                        API Key
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(school)}
                                                        className="h-8 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                        title="Cấu hình trường và hạn ngạch"
                                                    >
                                                        <Settings2 className="w-3.5 h-3.5 mr-1" />
                                                        Sửa
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Thêm trường học mới */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Plus className="w-5 h-5 text-blue-600" />
                            Thêm Trường Học Mới
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Khởi tạo cơ sở trường học mới vào hệ thống và cấp hạn ngạch API ban đầu
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSchool} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="add-code" className="text-xs font-semibold text-gray-700">
                                    Mã trường (Code) *
                                </Label>
                                <Input
                                    id="add-code"
                                    placeholder="VD: THCS-TV"
                                    value={addForm.code}
                                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                                    required
                                    className="uppercase font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="add-name" className="text-xs font-semibold text-gray-700">
                                    Tên trường *
                                </Label>
                                <Input
                                    id="add-name"
                                    placeholder="VD: THCS Trần Văn..."
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    required
                                    className="text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="add-address" className="text-xs font-semibold text-gray-700">
                                Địa chỉ cơ sở
                            </Label>
                            <Input
                                id="add-address"
                                placeholder="VD: Ba Đình, Hà Nội"
                                value={addForm.address}
                                onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                                className="text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="add-phone" className="text-xs font-semibold text-gray-700">
                                    Số điện thoại
                                </Label>
                                <Input
                                    id="add-phone"
                                    placeholder="024-xxxx-xxxx"
                                    value={addForm.phone}
                                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                                    className="text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="add-email" className="text-xs font-semibold text-gray-700">
                                    Email liên hệ
                                </Label>
                                <Input
                                    id="add-email"
                                    type="email"
                                    placeholder="banquanti@truong.edu.vn"
                                    value={addForm.email}
                                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                    className="text-sm"
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                                Cấu hình hạn ngạch API & AI ban đầu
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[11px] font-medium text-gray-600">
                                        Token Quota / Tháng
                                    </Label>
                                    <Input
                                        type="number"
                                        value={addForm.token_quota}
                                        onChange={(e) => setAddForm({ ...addForm, token_quota: Number(e.target.value) })}
                                        min={100000}
                                        step={100000}
                                        className="text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-medium text-gray-600">
                                        Max luồng song song
                                    </Label>
                                    <Input
                                        type="number"
                                        value={addForm.max_parallel_jobs}
                                        onChange={(e) => setAddForm({ ...addForm, max_parallel_jobs: Number(e.target.value) })}
                                        min={1}
                                        max={20}
                                        className="text-sm bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddOpen(false)}
                                disabled={isSubmitting}
                            >
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    "Khởi tạo trường"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Chỉnh sửa thông tin & Quota */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Settings2 className="w-5 h-5 text-blue-600" />
                            Cấu Hình Trường & Hạn Ngạch Quota
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Chỉnh sửa thông số vận hành và hạn mức API cho [{selectedSchool?.code}]
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-gray-700">Tên trường</Label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                    className="text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-gray-700">Mã trường</Label>
                                <Input
                                    value={editForm.code}
                                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                    required
                                    className="uppercase font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-gray-700">Trạng thái trường</Label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                                    className="w-full text-sm h-9 px-3 rounded-lg border border-gray-200 bg-white"
                                >
                                    <option value="active">Đang hoạt động</option>
                                    <option value="inactive">Tạm dừng</option>
                                    <option value="archived">Lưu trữ</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-gray-700">Cờ AI API</Label>
                                <select
                                    value={editForm.ai_enabled ? "true" : "false"}
                                    onChange={(e) => setEditForm({ ...editForm, ai_enabled: e.target.value === "true" })}
                                    className="w-full text-sm h-9 px-3 rounded-lg border border-gray-200 bg-white"
                                >
                                    <option value="true">Bật AI API</option>
                                    <option value="false">Tắt AI API</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-700">Địa chỉ</Label>
                            <Input
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                className="text-sm"
                            />
                        </div>

                        {/* Quota Settings Box */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                                    Hạn ngạch AI Token & Concurrency
                                </span>
                                <span className="text-[11px] font-normal text-gray-500">
                                    Đã dùng: {((selectedSchool?.quota?.tokens_used || 0) / 1000).toFixed(1)}k tokens
                                </span>
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[11px] font-medium text-gray-600">
                                        Token Quota tháng
                                    </Label>
                                    <Input
                                        type="number"
                                        value={editForm.token_quota}
                                        onChange={(e) => setEditForm({ ...editForm, token_quota: Number(e.target.value) })}
                                        min={100000}
                                        step={100000}
                                        className="text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-medium text-gray-600">
                                        Max luồng song song
                                    </Label>
                                    <Input
                                        type="number"
                                        value={editForm.max_parallel_jobs}
                                        onChange={(e) => setEditForm({ ...editForm, max_parallel_jobs: Number(e.target.value) })}
                                        min={1}
                                        max={20}
                                        className="text-sm bg-white"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editForm.resetTokensUsed}
                                    onChange={(e) => setEditForm({ ...editForm, resetTokensUsed: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-xs text-red-600 font-medium">
                                    Đặt lại số token đã dùng về 0 (Reset usage)
                                </span>
                            </label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                                disabled={isSubmitting}
                            >
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    "Lưu thay đổi"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: API Key & Hướng dẫn tích hợp */}
            <Dialog open={isApiKeyOpen} onOpenChange={setIsApiKeyOpen}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Key className="w-5 h-5 text-amber-500" />
                            Khóa Tích Hợp API Trường [{selectedSchool?.code}]
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Sử dụng API Key này để liên kết phần mềm quản lý của trường hoặc gọi API đối soát hạn ngạch
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSchool && (
                        <div className="space-y-4 pt-2">
                            {/* API Key Box */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700">Khóa bí mật API Key:</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={selectedSchool.apiKey}
                                        className="font-mono text-xs bg-slate-50 select-all"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(selectedSchool.apiKey)}
                                        className="shrink-0 gap-1 text-xs"
                                    >
                                        {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                        {copiedKey ? "Đã chép" : "Sao chép"}
                                    </Button>
                                </div>
                            </div>

                            {/* Endpoint URL Box */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700">Endpoint Tra cứu Quota:</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={`/api/schools/${selectedSchool.id}`}
                                        className="font-mono text-xs bg-slate-50 text-gray-600"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(`${window.location.origin}/api/schools/${selectedSchool.id}`)}
                                        className="shrink-0 gap-1 text-xs"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy URL
                                    </Button>
                                </div>
                            </div>

                            {/* Code Snippet Example */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5 text-gray-500" />
                                    Ví dụ cURL xác thực API:
                                </Label>
                                <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
                                    <code>{`curl -X GET "${typeof window !== "undefined" ? window.location.origin : "https://eduschool.vn"}/api/schools/${selectedSchool.id}" \\
  -H "x-school-api-key: ${selectedSchool.apiKey}"`}</code>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                                ⚠️ <strong>Bảo mật:</strong> Không chia sẻ API Key cho bên thứ ba không tin cậy. Mỗi trường học chỉ có một khóa định danh duy nhất.
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button onClick={() => setIsApiKeyOpen(false)} className="bg-blue-600 text-white">
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Test API Connection Diagnostics */}
            <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Activity className="w-5 h-5 text-blue-600" />
                            Kiểm Tra Kết Nối API & Quota
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Chẩn đoán thời gian thực cho trường [{selectedSchool?.code}] {selectedSchool?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {isTesting ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                <p className="text-sm font-medium text-gray-600">Đang ping kiểm tra API Gateway & AI Quota...</p>
                            </div>
                        ) : testResult ? (
                            <div className="space-y-4">
                                <div
                                    className={cn(
                                        "p-4 rounded-xl border flex items-start gap-3",
                                        testResult.allowed
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                            : "bg-red-50 border-red-200 text-red-900"
                                    )}
                                >
                                    {testResult.allowed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h4 className="font-semibold text-sm">
                                            {testResult.allowed ? "API & Quota Sẵn Sàng" : "Cảnh Báo Giới Hạn API"}
                                        </h4>
                                        <p className="text-xs mt-0.5 leading-relaxed opacity-90">
                                            {testResult.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-[11px] text-gray-500">Độ trễ phản hồi (Latency):</span>
                                        <div className="text-base font-bold text-gray-900 mt-0.5">
                                            {testResult.latencyMs} ms
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-[11px] text-gray-500">Trạng thái Circuit Breaker:</span>
                                        <div className="text-base font-bold text-emerald-600 mt-0.5">
                                            {testResult.circuitState || "CLOSED"}
                                        </div>
                                    </div>
                                </div>

                                {testResult.tokenQuota !== undefined && (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Token Quota cấp phát:</span>
                                            <span className="font-semibold">{testResult.tokenQuota?.toLocaleString()} tokens</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Token đã dùng:</span>
                                            <span className="font-semibold">{testResult.tokensUsed?.toLocaleString()} tokens</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600 font-medium">
                                            <span>Token còn lại:</span>
                                            <span>{Math.max(0, (testResult.tokenQuota || 0) - (testResult.tokensUsed || 0)).toLocaleString()} tokens</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => selectedSchool && handleTestApi(selectedSchool)}
                            disabled={isTesting}
                            className="gap-1.5"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isTesting && "animate-spin")} />
                            Thử lại
                        </Button>
                        <Button onClick={() => setIsTestOpen(false)} className="bg-blue-600 text-white">
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
