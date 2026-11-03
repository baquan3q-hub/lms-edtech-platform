"use client";

import { useState } from "react";
import {
    PlatformAccountItem,
    adminDirectResetPassword,
    adminToggleUserStatus,
    adminCreateAccountAction,
} from "@/lib/actions/super-admin-accounts";
import {
    Search,
    KeyRound,
    UserCheck,
    UserX,
    Sparkles,
    UserPlus,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface AccountsClientProps {
    initialAccounts: PlatformAccountItem[];
    schools: Array<{ id: string; name: string; code: string }>;
}

export default function AccountsClient({
    initialAccounts,
    schools,
}: AccountsClientProps) {
    const [accounts, setAccounts] = useState<PlatformAccountItem[]>(initialAccounts);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [schoolFilter, setSchoolFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal state for password reset
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<PlatformAccountItem | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [reason, setReason] = useState("Super Admin trực tiếp can thiệp đổi mật khẩu");
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Modal state for creating new user
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: "",
        fullName: "",
        password: "DemoPassword123@",
        role: "admin" as "admin" | "teacher" | "student" | "parent",
        schoolId: schools[0]?.id || "",
        phone: "",
    });
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

    // Action loading state for status toggle
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Filter accounts
    const filteredAccounts = accounts.filter((acc) => {
        const matchesSearch =
            search.trim() === "" ||
            acc.email.toLowerCase().includes(search.toLowerCase()) ||
            acc.full_name.toLowerCase().includes(search.toLowerCase());

        const matchesRole = roleFilter === "all" || acc.role === roleFilter;
        const matchesSchool = schoolFilter === "all" || acc.school_id === schoolFilter;
        const matchesStatus = statusFilter === "all" || acc.status === statusFilter;

        return matchesSearch && matchesRole && matchesSchool && matchesStatus;
    });

    // Generate random strong password
    function generateRandomPassword() {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
        let pwd = "";
        for (let i = 0; i < 10; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewPassword(pwd);
    }

    function generateRandomCreatePassword() {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
        let pwd = "";
        for (let i = 0; i < 10; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCreateForm((prev) => ({ ...prev, password: pwd }));
    }

    // Open password modal
    function handleOpenResetModal(user: PlatformAccountItem) {
        setSelectedUser(user);
        setNewPassword("");
        setReason("Super Admin trực tiếp can thiệp đổi mật khẩu");
        setIsPasswordModalOpen(true);
    }

    // Submit password reset
    async function handleConfirmResetPassword() {
        if (!selectedUser) return;
        if (!newPassword || newPassword.length < 6) {
            toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự.");
            return;
        }

        setIsSubmittingPassword(true);
        try {
            const res = await adminDirectResetPassword(selectedUser.id, newPassword, reason);
            if (res.success) {
                toast.success("Đổi mật khẩu thành công!", {
                    description: `Tài khoản ${selectedUser.email} đã được đổi mật khẩu.`,
                });
                setIsPasswordModalOpen(false);
            } else {
                toast.error("Không thể đổi mật khẩu", { description: res.message });
            }
        } catch (err: any) {
            toast.error("Lỗi hệ thống", { description: err.message });
        } finally {
            setIsSubmittingPassword(false);
        }
    }

    // Submit create account
    async function handleConfirmCreateAccount() {
        if (!createForm.email || !createForm.email.includes("@")) {
            toast.error("Vui lòng nhập email hợp lệ.");
            return;
        }
        if (!createForm.fullName.trim()) {
            toast.error("Vui lòng nhập họ và tên.");
            return;
        }
        if (!createForm.password || createForm.password.length < 6) {
            toast.error("Mật khẩu phải có tối thiểu 6 ký tự.");
            return;
        }

        setIsSubmittingCreate(true);
        try {
            const res = await adminCreateAccountAction(createForm);
            if (res.success && res.user) {
                toast.success("Tạo tài khoản thành công!", {
                    description: res.message,
                });
                setAccounts((prev) => [res.user!, ...prev]);
                setIsCreateModalOpen(false);
                setCreateForm({
                    email: "",
                    fullName: "",
                    password: "DemoPassword123@",
                    role: "admin",
                    schoolId: schools[0]?.id || "",
                    phone: "",
                });
            } else {
                toast.error("Không thể tạo tài khoản", { description: res.message });
            }
        } catch (err: any) {
            toast.error("Lỗi hệ thống", { description: err.message });
        } finally {
            setIsSubmittingCreate(false);
        }
    }

    // Toggle user status
    async function handleToggleStatus(user: PlatformAccountItem) {
        const nextStatus = user.status === "active" ? "suspended" : "active";
        setTogglingId(user.id);

        try {
            const res = await adminToggleUserStatus(
                user.id,
                nextStatus,
                `Super Admin ${nextStatus === "active" ? "mở khóa" : "khóa"} tài khoản`
            );

            if (res.success) {
                setAccounts((prev) =>
                    prev.map((a) => (a.id === user.id ? { ...a, status: nextStatus } : a))
                );
                toast.success(
                    nextStatus === "active" ? "Đã kích hoạt tài khoản!" : "Đã tạm dừng tài khoản!"
                );
            } else {
                toast.error("Lỗi cập nhật trạng thái", { description: res.message });
            }
        } catch (err: any) {
            toast.error("Lỗi", { description: err.message });
        } finally {
            setTogglingId(null);
        }
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-blue-600" />
                        Quản trị Tài khoản & Mật khẩu
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kiểm soát danh sách người dùng toàn nền tảng, tạo tài khoản Admin trường và can thiệp đổi mật khẩu tức thì.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                        Tổng số: <strong className="text-slate-900">{filteredAccounts.length}</strong> / {accounts.length}
                    </span>
                    <Button
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8.5 px-3 gap-1.5 shadow-xs"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Tạo tài khoản mới</span>
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Tìm theo tên, email..."
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

                    {/* Role Filter */}
                    <div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">Tất cả vai trò</option>
                            <option value="super_admin">Admin Hệ Thống (Chủ sản phẩm)</option>
                            <option value="admin">Quản trị viên (Admin trường)</option>
                            <option value="teacher">Giáo viên (Teacher)</option>
                            <option value="student">Học sinh (Student)</option>
                            <option value="parent">Phụ huynh (Parent)</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="suspended">Tạm dừng / Đã khóa</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Người dùng</th>
                                <th className="px-4 py-3">Vai trò</th>
                                <th className="px-4 py-3">Cơ sở trường</th>
                                <th className="px-4 py-3">Ngày tạo</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3 text-right">Quyền can thiệp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                                        Không tìm thấy tài khoản nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                filteredAccounts.map((acc) => {
                                    return (
                                        <tr
                                            key={acc.id}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div>
                                                    <span className="font-semibold text-slate-900 block text-xs">
                                                        {acc.full_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 font-mono">
                                                        {acc.email}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
                                                        acc.role === "super_admin"
                                                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white font-extrabold border-transparent shadow-xs"
                                                            : acc.role === "admin"
                                                            ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                                                            : acc.role === "teacher"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : acc.role === "student"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                                    )}
                                                >
                                                    {acc.role === "super_admin"
                                                        ? "Admin Hệ Thống"
                                                        : acc.role === "admin"
                                                        ? "Admin trường"
                                                        : acc.role === "teacher"
                                                        ? "Giáo viên"
                                                        : acc.role === "student"
                                                        ? "Học sinh"
                                                        : "Phụ huynh"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-slate-700">
                                                <span className="font-medium text-slate-800">{acc.school_name}</span>
                                                {acc.school_code && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-semibold">
                                                        {acc.school_code}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                                                {new Date(acc.created_at).toLocaleDateString("vi-VN")}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                        acc.status === "active"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-red-50 text-red-700 border-red-200"
                                                    )}
                                                >
                                                    {acc.status === "active" ? "Hoạt động" : "Tạm dừng"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Direct Reset Password */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenResetModal(acc)}
                                                        className="h-7 text-xs px-2.5 border-slate-200 text-blue-700 hover:text-blue-800 hover:bg-blue-50 gap-1 font-medium"
                                                        title="Đổi mật khẩu ngay lập tức"
                                                    >
                                                        <KeyRound className="w-3 h-3 text-blue-600" />
                                                        <span>Đổi mật khẩu</span>
                                                    </Button>

                                                    {/* Toggle Active / Suspend (Only for non-super-admin) */}
                                                    {acc.role !== "super_admin" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            disabled={togglingId === acc.id}
                                                            onClick={() => handleToggleStatus(acc)}
                                                            className={cn(
                                                                "h-7 text-xs px-2",
                                                                acc.status === "active"
                                                                    ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            )}
                                                            title={acc.status === "active" ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
                                                        >
                                                            {acc.status === "active" ? (
                                                                <UserX className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-medium px-2 italic">
                                                            Chủ sở hữu
                                                        </span>
                                                    )}
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

            {/* Direct Password Reset Modal */}
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogContent className="max-w-md bg-white border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-blue-600" />
                            Can thiệp đổi mật khẩu tài khoản
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Cập nhật trực tiếp mật khẩu vào tài khoản xác thực mà không cần gửi email xác nhận.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
                                <div className="text-slate-500">Tài khoản mục tiêu:</div>
                                <div className="font-semibold text-slate-900">{selectedUser.full_name}</div>
                                <div className="text-blue-700 font-mono">{selectedUser.email}</div>
                                <div className="text-[11px] text-slate-500">
                                    Cơ sở: {selectedUser.school_name} ({selectedUser.school_code})
                                </div>
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
                                <Label className="text-xs font-semibold text-slate-700">Lý do can thiệp (Audit trail)</Label>
                                <Input
                                    type="text"
                                    placeholder="Lý do đổi mật khẩu..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="h-9 text-xs border-slate-200"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPasswordModalOpen(false)}
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
                            {isSubmittingPassword ? "Đang xử lý..." : "Lưu mật khẩu ngay"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Account Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-md bg-white border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-blue-600" />
                            Tạo tài khoản mới cho trường học
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Cấp mới tài khoản Admin trường, Giáo viên hoặc Học sinh và gán trực tiếp vào cơ sở.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Cơ sở trường học</Label>
                            <select
                                value={createForm.schoolId}
                                onChange={(e) => setCreateForm({ ...createForm, schoolId: e.target.value })}
                                className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            >
                                {schools.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Vai trò</Label>
                            <select
                                value={createForm.role}
                                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                                className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="admin">Quản trị viên (Admin trường)</option>
                                <option value="teacher">Giáo viên (Teacher)</option>
                                <option value="student">Học sinh (Student)</option>
                                <option value="parent">Phụ huynh (Parent)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Họ và tên</Label>
                            <Input
                                placeholder="Ví dụ: Thầy Hoàng Văn A"
                                value={createForm.fullName}
                                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                                className="h-9 text-xs border-slate-200"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Email đăng nhập</Label>
                            <Input
                                type="email"
                                placeholder="admin.cva@demo.com"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                className="h-9 text-xs border-slate-200"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-700">Mật khẩu khởi tạo</Label>
                                <button
                                    type="button"
                                    onClick={generateRandomCreatePassword}
                                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Tạo ngẫu nhiên
                                </button>
                            </div>
                            <Input
                                type="text"
                                placeholder="Tối thiểu 6 ký tự..."
                                value={createForm.password}
                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                className="h-9 text-xs border-slate-200"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="text-xs h-8"
                        >
                            Hủy
                        </Button>
                        <Button
                            size="sm"
                            disabled={isSubmittingCreate || !createForm.email || !createForm.fullName}
                            onClick={handleConfirmCreateAccount}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shadow-xs"
                        >
                            {isSubmittingCreate ? "Đang tạo..." : "Tạo tài khoản"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
