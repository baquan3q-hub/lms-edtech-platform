"use client";

import { useState, useRef, useCallback } from "react";
import { FileSpreadsheet, Upload, Download, CheckCircle2, XCircle, AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { bulkCreateUsers } from "@/app/(dashboard)/admin/users/actions";
import * as XLSX from "xlsx";

type ParsedUser = {
    email: string;
    fullName: string;
    role: string;
    phone: string;
    password: string;
    valid: boolean;
    error?: string;
};

type ImportResult = {
    email: string;
    success: boolean;
    error?: string;
};

const VALID_ROLES = ["admin", "teacher", "student", "parent"];
const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    teacher: "Giáo viên",
    student: "Học sinh",
    parent: "Phụ huynh",
};

function validateRow(row: any, index: number): ParsedUser {
    const email = (row["Email"] || row["email"] || "").toString().trim();
    const fullName = (row["Họ và tên"] || row["Ho va ten"] || row["Full Name"] || row["fullName"] || "").toString().trim();
    const roleRaw = (row["Vai trò"] || row["Vai tro"] || row["Role"] || row["role"] || "").toString().trim().toLowerCase();
    const phone = (row["Số điện thoại"] || row["So dien thoai"] || row["Phone"] || row["phone"] || "").toString().trim();
    const password = (row["Mật khẩu"] || row["Mat khau"] || row["Password"] || row["password"] || "").toString().trim();

    // Map Vietnamese role names
    let role = roleRaw;
    if (roleRaw === "giáo viên" || roleRaw === "giao vien") role = "teacher";
    if (roleRaw === "học sinh" || roleRaw === "hoc sinh") role = "student";
    if (roleRaw === "phụ huynh" || roleRaw === "phu huynh") role = "parent";

    const errors: string[] = [];
    if (!email) errors.push("Thiếu email");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email không hợp lệ");
    if (!fullName) errors.push("Thiếu họ tên");
    if (!VALID_ROLES.includes(role)) errors.push(`Role "${roleRaw}" không hợp lệ`);
    if (!password) errors.push("Thiếu mật khẩu");
    else if (password.length < 6) errors.push("Mật khẩu < 6 ký tự");

    return {
        email,
        fullName,
        role,
        phone,
        password,
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join(", ") : undefined,
    };
}

export default function ImportUsersDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
    const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
    const [results, setResults] = useState<ImportResult[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setStep("upload");
        setParsedUsers([]);
        setResults([]);
        setDragOver(false);
    }, []);

    const handleFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    toast.error("File Excel trống hoặc không đúng định dạng.");
                    return;
                }

                const parsed = jsonData.map((row: any, i: number) => validateRow(row, i));
                setParsedUsers(parsed);
                setStep("preview");
            } catch {
                toast.error("Không thể đọc file. Vui lòng kiểm tra lại định dạng.");
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleImport = async () => {
        const validUsers = parsedUsers.filter(u => u.valid);
        if (validUsers.length === 0) {
            toast.error("Không có dữ liệu hợp lệ để import.");
            return;
        }

        setStep("importing");

        try {
            const { results: importResults } = await bulkCreateUsers(
                validUsers.map(u => ({
                    email: u.email,
                    fullName: u.fullName,
                    role: u.role,
                    phone: u.phone,
                    password: u.password,
                }))
            );

            setResults(importResults);
            setStep("done");

            const successCount = importResults.filter(r => r.success).length;
            if (successCount > 0) {
                toast.success(`Đã import thành công ${successCount}/${importResults.length} tài khoản!`);
            }
        } catch (err) {
            toast.error("Đã xảy ra lỗi khi import.");
            setStep("preview");
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            { "Email": "giaovien1@example.com", "Họ và tên": "Nguyễn Văn A", "Vai trò": "teacher", "Số điện thoại": "0901234567", "Mật khẩu": "123456" },
            { "Email": "hocsinh1@example.com", "Họ và tên": "Trần Thị B", "Vai trò": "student", "Số điện thoại": "0912345678", "Mật khẩu": "123456" },
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Users");
        // Set column widths
        ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
        XLSX.writeFile(wb, "mau_import_users.xlsx");
    };

    const validCount = parsedUsers.filter(u => u.valid).length;
    const invalidCount = parsedUsers.filter(u => !u.valid).length;

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Import Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        Import người dùng từ Excel
                    </DialogTitle>
                    <DialogDescription>
                        Tải lên file Excel (.xlsx, .xls) chứa danh sách user. Hệ thống sẽ tự động tạo tài khoản.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Step 1: Upload */}
                    {step === "upload" && (
                        <div className="space-y-4 py-4">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver
                                        ? "border-emerald-400 bg-emerald-50"
                                        : "border-gray-300 hover:border-emerald-300 hover:bg-gray-50"
                                    }`}
                            >
                                <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? "text-emerald-500" : "text-gray-400"}`} />
                                <p className="text-sm font-medium text-gray-700">
                                    Kéo thả file Excel vào đây hoặc <span className="text-emerald-600 underline">chọn file</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Hỗ trợ .xlsx, .xls</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFile(f);
                                    }}
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-blue-900 mb-2">📋 Định dạng file Excel</h4>
                                <p className="text-xs text-blue-700 mb-2">File cần có các cột sau (hàng đầu tiên là tiêu đề):</p>
                                <div className="overflow-x-auto">
                                    <table className="text-xs w-full border-collapse">
                                        <thead>
                                            <tr className="bg-blue-100">
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Email *</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Họ và tên *</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Vai trò *</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Số điện thoại</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Mật khẩu *</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="bg-white">
                                                <td className="border border-blue-200 px-2 py-1 text-blue-600">gv@email.com</td>
                                                <td className="border border-blue-200 px-2 py-1">Nguyễn Văn A</td>
                                                <td className="border border-blue-200 px-2 py-1">teacher</td>
                                                <td className="border border-blue-200 px-2 py-1">0901234567</td>
                                                <td className="border border-blue-200 px-2 py-1">123456</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                    <strong>Vai trò hợp lệ:</strong> admin, teacher, student, parent (hoặc tiếng Việt: Giáo viên, Học sinh, Phụ huynh)
                                </p>
                            </div>

                            <Button variant="outline" onClick={downloadTemplate} className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <Download className="w-4 h-4 mr-2" />
                                Tải file mẫu (.xlsx)
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Preview */}
                    {step === "preview" && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700">
                                    Tổng: {parsedUsers.length}
                                </div>
                                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ: {validCount}
                                </div>
                                {invalidCount > 0 && (
                                    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600">
                                        <XCircle className="w-3.5 h-3.5" /> Lỗi: {invalidCount}
                                    </div>
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8">#</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Họ tên</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Vai trò</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {parsedUsers.map((user, i) => (
                                                <tr key={i} className={user.valid ? "hover:bg-gray-50" : "bg-red-50/50"}>
                                                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900">{user.email || "—"}</td>
                                                    <td className="px-3 py-2 text-gray-700">{user.fullName || "—"}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${VALID_ROLES.includes(user.role)
                                                                ? "bg-blue-50 text-blue-700"
                                                                : "bg-red-50 text-red-600"
                                                            }`}>
                                                            {ROLE_LABELS[user.role] || user.role || "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {user.valid ? (
                                                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                                                                <AlertCircle className="w-3.5 h-3.5" /> {user.error}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Importing */}
                    {step === "importing" && (
                        <div className="py-12 text-center">
                            <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-4 animate-spin" />
                            <p className="text-lg font-semibold text-gray-900">Đang import {validCount} tài khoản...</p>
                            <p className="text-sm text-gray-500 mt-1">Vui lòng không đóng cửa sổ</p>
                        </div>
                    )}

                    {/* Step 4: Done */}
                    {step === "done" && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Thành công: {results.filter(r => r.success).length}
                                </div>
                                {results.filter(r => !r.success).length > 0 && (
                                    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600">
                                        <XCircle className="w-3.5 h-3.5" /> Thất bại: {results.filter(r => !r.success).length}
                                    </div>
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8">#</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kết quả</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {results.map((r, i) => (
                                                <tr key={i} className={r.success ? "hover:bg-gray-50" : "bg-red-50/50"}>
                                                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900">{r.email}</td>
                                                    <td className="px-3 py-2">
                                                        {r.success ? (
                                                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Tạo thành công
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                                                                <XCircle className="w-3.5 h-3.5" /> {r.error}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-gray-100 pt-4">
                    {step === "upload" && (
                        <Button variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
                    )}
                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={resetState}>
                                <X className="w-4 h-4 mr-1" /> Chọn file khác
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={validCount === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Import {validCount} tài khoản
                            </Button>
                        </>
                    )}
                    {step === "done" && (
                        <Button onClick={() => { setOpen(false); resetState(); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Hoàn tất
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
