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
import { bulkEnrollStudents } from "@/app/(dashboard)/admin/classes/[id]/students/actions";
import * as XLSX from "xlsx";

type ParsedStudent = {
    email: string;
    fullName: string;
    valid: boolean;
    error?: string;
};

type ImportResult = {
    email: string;
    fullName?: string;
    success: boolean;
    error?: string;
};

function validateRow(row: any): ParsedStudent {
    const email = (row["Email"] || row["email"] || "").toString().trim();
    const fullName = (row["Họ và tên"] || row["Ho va ten"] || row["Full Name"] || row["fullName"] || "").toString().trim();

    const errors: string[] = [];
    if (!email) errors.push("Thiếu email");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email không hợp lệ");

    return {
        email,
        fullName,
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join(", ") : undefined,
    };
}

export default function ImportStudentsDialog({ classId }: { classId: string }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
    const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
    const [results, setResults] = useState<ImportResult[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setStep("upload");
        setParsedStudents([]);
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

                const parsed = jsonData.map((row: any) => validateRow(row));
                setParsedStudents(parsed);
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
        const validStudents = parsedStudents.filter(s => s.valid);
        if (validStudents.length === 0) {
            toast.error("Không có dữ liệu hợp lệ để import.");
            return;
        }

        setStep("importing");

        try {
            const { results: importResults } = await bulkEnrollStudents(
                classId,
                validStudents.map(s => ({
                    email: s.email,
                    fullName: s.fullName,
                }))
            );

            setResults(importResults);
            setStep("done");

            const successCount = importResults.filter(r => r.success).length;
            if (successCount > 0) {
                toast.success(`Đã thêm thành công ${successCount}/${importResults.length} học viên!`);
            }
        } catch (err) {
            toast.error("Đã xảy ra lỗi khi import.");
            setStep("preview");
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            { "Email": "hocsinh1@example.com", "Họ và tên": "Nguyễn Văn A" },
            { "Email": "hocsinh2@example.com", "Họ và tên": "Trần Thị B" },
            { "Email": "hocsinh3@example.com", "Họ và tên": "Lê Minh C" },
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        ws["!cols"] = [{ wch: 30 }, { wch: 25 }];
        XLSX.writeFile(wb, "mau_import_hocvien.xlsx");
    };

    const validCount = parsedStudents.filter(s => s.valid).length;
    const invalidCount = parsedStudents.filter(s => !s.valid).length;

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Import Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        Import Học viên từ Excel
                    </DialogTitle>
                    <DialogDescription>
                        Tải lên file Excel chứa danh sách email học viên. Hệ thống sẽ tự động tìm và thêm vào lớp.
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
                                <p className="text-xs text-blue-700 mb-2">File chỉ cần cột <strong>Email</strong> (bắt buộc). Cột &quot;Họ và tên&quot; là tùy chọn để dễ xem trước.</p>
                                <div className="overflow-x-auto">
                                    <table className="text-xs w-full border-collapse">
                                        <thead>
                                            <tr className="bg-blue-100">
                                                <th className="border border-blue-200 px-3 py-1.5 text-left font-semibold">Email *</th>
                                                <th className="border border-blue-200 px-3 py-1.5 text-left font-semibold">Họ và tên</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="bg-white">
                                                <td className="border border-blue-200 px-3 py-1.5 text-blue-600">hocsinh1@email.com</td>
                                                <td className="border border-blue-200 px-3 py-1.5">Nguyễn Văn A</td>
                                            </tr>
                                            <tr className="bg-blue-50/50">
                                                <td className="border border-blue-200 px-3 py-1.5 text-blue-600">hocsinh2@email.com</td>
                                                <td className="border border-blue-200 px-3 py-1.5">Trần Thị B</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                    <strong>Lưu ý:</strong> Học viên cần có tài khoản (role = student) trong hệ thống trước. Email không tìm thấy sẽ báo lỗi.
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
                                    Tổng: {parsedStudents.length}
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
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {parsedStudents.map((student, i) => (
                                                <tr key={i} className={student.valid ? "hover:bg-gray-50" : "bg-red-50/50"}>
                                                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900">{student.email || "—"}</td>
                                                    <td className="px-3 py-2 text-gray-700">{student.fullName || "—"}</td>
                                                    <td className="px-3 py-2">
                                                        {student.valid ? (
                                                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                                                                <AlertCircle className="w-3.5 h-3.5" /> {student.error}
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
                            <p className="text-lg font-semibold text-gray-900">Đang thêm {validCount} học viên vào lớp...</p>
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
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Họ tên</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kết quả</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {results.map((r, i) => (
                                                <tr key={i} className={r.success ? "hover:bg-gray-50" : "bg-red-50/50"}>
                                                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900">{r.email}</td>
                                                    <td className="px-3 py-2 text-gray-700">{r.fullName || "—"}</td>
                                                    <td className="px-3 py-2">
                                                        {r.success ? (
                                                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Đã thêm
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
                                Thêm {validCount} học viên
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
