"use client";

import { useState, useRef, useCallback } from "react";
import { FileSpreadsheet, Upload, Download, CheckCircle2, XCircle, AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { bulkLinkParentStudents } from "@/lib/actions/parentStudent";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

type ParsedRow = {
    parentEmail: string;
    parentName: string;
    studentEmail: string;
    studentName: string;
    relationship: string;
    valid: boolean;
    error?: string;
};

type ImportResult = {
    parentEmail: string;
    studentEmail: string;
    success: boolean;
    error?: string;
};

const VALID_RELATIONSHIPS = ["Bố", "Mẹ", "Ông", "Bà", "Người giám hộ", "Phụ huynh"];

function validateRow(row: any): ParsedRow {
    const parentEmail = (
        row["Email Phụ huynh"] || row["Email PH"] || row["Parent Email"] || row["parentEmail"] || ""
    ).toString().trim();
    const parentName = (
        row["Tên Phụ huynh"] || row["Tên PH"] || row["Parent Name"] || row["parentName"] || ""
    ).toString().trim();
    const studentEmail = (
        row["Email Học sinh"] || row["Email HS"] || row["Student Email"] || row["studentEmail"] || ""
    ).toString().trim();
    const studentName = (
        row["Tên Học sinh"] || row["Tên HS"] || row["Student Name"] || row["studentName"] || ""
    ).toString().trim();
    let relationship = (
        row["Mối quan hệ"] || row["Quan hệ"] || row["Relationship"] || row["relationship"] || "Phụ huynh"
    ).toString().trim();

    // Normalize relationship
    if (relationship.toLowerCase() === "bố" || relationship.toLowerCase() === "ba" || relationship.toLowerCase() === "cha" || relationship.toLowerCase() === "father") relationship = "Bố";
    if (relationship.toLowerCase() === "mẹ" || relationship.toLowerCase() === "me" || relationship.toLowerCase() === "mother") relationship = "Mẹ";
    if (relationship.toLowerCase() === "ông" || relationship.toLowerCase() === "ong" || relationship.toLowerCase() === "grandfather") relationship = "Ông";
    if (relationship.toLowerCase() === "bà" || relationship.toLowerCase() === "ba2" || relationship.toLowerCase() === "grandmother") relationship = "Bà";

    const errors: string[] = [];
    if (!parentEmail) errors.push("Thiếu email PH");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) errors.push("Email PH không hợp lệ");
    if (!studentEmail) errors.push("Thiếu email HS");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) errors.push("Email HS không hợp lệ");

    return {
        parentEmail,
        parentName,
        studentEmail,
        studentName,
        relationship,
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join(", ") : undefined,
    };
}

export default function ImportParentStudentDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [results, setResults] = useState<ImportResult[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setStep("upload");
        setParsedRows([]);
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
                setParsedRows(parsed);
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
        const validRows = parsedRows.filter(r => r.valid);
        if (validRows.length === 0) {
            toast.error("Không có dữ liệu hợp lệ để import.");
            return;
        }

        setStep("importing");

        try {
            const { results: importResults } = await bulkLinkParentStudents(
                validRows.map(r => ({
                    parentEmail: r.parentEmail,
                    studentEmail: r.studentEmail,
                    relationship: r.relationship,
                }))
            );

            setResults(importResults);
            setStep("done");

            const successCount = importResults.filter(r => r.success).length;
            if (successCount > 0) {
                toast.success(`Đã liên kết thành công ${successCount}/${importResults.length} cặp PH-HS!`);
                router.refresh();
            }
        } catch {
            toast.error("Đã xảy ra lỗi khi import.");
            setStep("preview");
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            {
                "Email Phụ huynh": "phuhuynh1@email.com",
                "Tên Phụ huynh": "Nguyễn Văn A",
                "Email Học sinh": "hocsinh1@email.com",
                "Tên Học sinh": "Nguyễn Văn B",
                "Mối quan hệ": "Bố",
            },
            {
                "Email Phụ huynh": "phuhuynh2@email.com",
                "Tên Phụ huynh": "Trần Thị C",
                "Email Học sinh": "hocsinh2@email.com",
                "Tên Học sinh": "Trần Văn D",
                "Mối quan hệ": "Mẹ",
            },
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Liên kết PH-HS");
        ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
        XLSX.writeFile(wb, "mau_lien_ket_phuhuynh_hocsinh.xlsx");
    };

    const validCount = parsedRows.filter(r => r.valid).length;
    const invalidCount = parsedRows.filter(r => !r.valid).length;

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Import Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        Import liên kết Phụ huynh - Học sinh
                    </DialogTitle>
                    <DialogDescription>
                        Tải lên file Excel chứa danh sách cặp phụ huynh - học sinh. Hệ thống sẽ tự nhận diện và liên kết.
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

                            {/* Format guide */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-blue-900 mb-2">📋 Định dạng file Excel</h4>
                                <p className="text-xs text-blue-700 mb-2">File cần có các cột sau (hàng đầu tiên là tiêu đề):</p>
                                <div className="overflow-x-auto">
                                    <table className="text-xs w-full border-collapse">
                                        <thead>
                                            <tr className="bg-blue-100">
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Email Phụ huynh *</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Tên Phụ huynh</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Email Học sinh *</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Tên Học sinh</th>
                                                <th className="border border-blue-200 px-2 py-1 text-left font-semibold">Mối quan hệ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="bg-white">
                                                <td className="border border-blue-200 px-2 py-1 text-blue-600">ph1@mail.com</td>
                                                <td className="border border-blue-200 px-2 py-1">Nguyễn Văn A</td>
                                                <td className="border border-blue-200 px-2 py-1 text-blue-600">hs1@mail.com</td>
                                                <td className="border border-blue-200 px-2 py-1">Nguyễn Văn B</td>
                                                <td className="border border-blue-200 px-2 py-1">Bố</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                    <strong>Mối quan hệ:</strong> Bố, Mẹ, Ông, Bà, Người giám hộ (mặc định: Phụ huynh)
                                </p>
                                <p className="text-xs text-blue-600">
                                    <strong>Lưu ý:</strong> Email PH và HS phải đã có tài khoản trong hệ thống.
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
                                    Tổng: {parsedRows.length}
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
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email PH</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email HS</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Quan hệ</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {parsedRows.map((row, i) => (
                                                <tr key={i} className={row.valid ? "hover:bg-gray-50" : "bg-red-50/50"}>
                                                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-2 text-gray-900 text-xs">
                                                        <div>
                                                            <p className="font-medium">{row.parentEmail || "—"}</p>
                                                            {row.parentName && <p className="text-gray-400">{row.parentName}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-900 text-xs">
                                                        <div>
                                                            <p className="font-medium">{row.studentEmail || "—"}</p>
                                                            {row.studentName && <p className="text-gray-400">{row.studentName}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                                            {row.relationship}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {row.valid ? (
                                                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                                                                <AlertCircle className="w-3.5 h-3.5" /> {row.error}
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
                            <p className="text-lg font-semibold text-gray-900">Đang liên kết {validCount} cặp PH-HS...</p>
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
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email PH</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email HS</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kết quả</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {results.map((r, i) => (
                                                <tr key={i} className={r.success ? "hover:bg-gray-50" : "bg-red-50/50"}>
                                                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900 text-xs">{r.parentEmail}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900 text-xs">{r.studentEmail}</td>
                                                    <td className="px-3 py-2">
                                                        {r.success ? (
                                                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Liên kết thành công
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
                                Import {validCount} liên kết
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
