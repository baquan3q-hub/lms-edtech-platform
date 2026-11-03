"use client";

import { useState } from "react";
import { createImportJobAction, updateImportRowAction, commitImportJobAction } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Edit,
  Save,
  X,
} from "lucide-react";

export default function ExcelImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ total: number; valid: number; error: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activationSlips, setActivationSlips] = useState<any[] | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setMessage(null);
    setActivationSlips(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await createImportJobAction(formData);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Lỗi xử lý file Excel.");
    } else {
      setJobId(res.jobId);
      setRows(res.rows || []);
      setSummary({
        total: res.totalRows || 0,
        valid: res.validCount || 0,
        error: res.errorCount || 0,
      });
      setMessage(`Đã phân tích ${res.totalRows} dòng: ${res.validCount} hợp lệ, ${res.errorCount} lỗi.`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setLoading(true);

    const res = await updateImportRowAction(editingRow.id || editingRow.rowNumber, editingRow.normalizedData);
    setLoading(false);

    if (res.ok) {
      // Cập nhật lại hàng trong state
      setRows((prev) =>
        prev.map((r) =>
          r.rowNumber === editingRow.rowNumber
            ? { ...r, status: "valid", errorCode: null, errorMessage: null, normalizedData: editingRow.normalizedData }
            : r
        )
      );
      setSummary((prev) => (prev ? { ...prev, valid: prev.valid + 1, error: Math.max(0, prev.error - 1) } : null));
      setEditingRow(null);
    } else {
      setError(res.error || "Không thể cập nhật dòng.");
    }
  };

  const handleCommit = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);

    const res = await commitImportJobAction(jobId);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Lỗi ghi dữ liệu.");
    } else {
      setMessage(res.message || "Ghi dữ liệu thành công!");
      if (res.activationSlips) {
        setActivationSlips(res.activationSlips);
      }
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Onboarding Học sinh & Phụ huynh bằng Excel
        </h1>
        <p className="text-sm text-slate-500">
          Quy trình chuẩn K12: Tải lên $\rightarrow$ Xem trước & Kiểm tra lỗi $\rightarrow$ Sửa trực tiếp $\rightarrow$ Ghi dữ liệu & Sinh mã kích hoạt.
        </p>
      </div>

      {/* Form Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Tải lên danh sách học sinh (.xlsx / .csv)
          </CardTitle>
          <CardDescription>
            File mẫu hỗ trợ các cột: Mã học sinh, Họ và tên, Khối, Lớp chủ nhiệm, Tên phụ huynh, SĐT phụ huynh, Email phụ huynh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-center">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="max-w-md"
              required
            />
            <Button type="submit" disabled={!file || loading}>
              {loading ? "Đang phân tích..." : "Phân tích & Xem trước"}
            </Button>
          </form>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thống kê và Nút Commit */}
      {summary && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm py-1 px-3">
              Tổng số dòng: <strong className="ml-1">{summary.total}</strong>
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-sm py-1 px-3">
              Hợp lệ: <strong className="ml-1">{summary.valid}</strong>
            </Badge>
            {summary.error > 0 && (
              <Badge variant="destructive" className="text-sm py-1 px-3">
                Lỗi cần sửa: <strong className="ml-1">{summary.error}</strong>
              </Badge>
            )}
          </div>

          <Button
            onClick={handleCommit}
            disabled={summary.error > 0 || loading || !!activationSlips}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? "Đang ghi dữ liệu..." : "Xác nhận & Ghi dữ liệu"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bảng Xem trước dữ liệu */}
      {rows.length > 0 && !activationSlips && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Xem trước danh sách học sinh ({rows.length} bản ghi)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Mã HS</TableHead>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Lớp CN</TableHead>
                    <TableHead>Phụ huynh</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const d = r.normalizedData || {};
                    const isError = r.status === "error";
                    return (
                      <TableRow key={r.rowNumber} className={isError ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                        <TableCell className="text-center font-mono text-xs text-slate-400">{r.rowNumber}</TableCell>
                        <TableCell className="font-mono font-semibold">{d.studentCode || "-"}</TableCell>
                        <TableCell>{d.fullName || "-"}</TableCell>
                        <TableCell><Badge variant="secondary">{d.homeroom || "-"}</Badge></TableCell>
                        <TableCell>{d.guardianName || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{d.guardianPhone || "-"}</TableCell>
                        <TableCell>
                          {isError ? (
                            <Badge variant="destructive" className="text-xs">
                              {r.errorMessage || "Lỗi cú pháp"}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                              Sẵn sàng
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRow({ ...r, normalizedData: { ...d } })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hộp thoại sửa dòng lỗi tại chỗ */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Sửa thông tin dòng #{editingRow.rowNumber}</CardTitle>
                <CardDescription>Hiệu chỉnh trực tiếp thông tin lỗi trước khi commit</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingRow(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Mã học sinh</label>
                <Input
                  value={editingRow.normalizedData?.studentCode || ""}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      normalizedData: { ...editingRow.normalizedData, studentCode: e.target.value.toUpperCase() },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Họ và tên</label>
                <Input
                  value={editingRow.normalizedData?.fullName || ""}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      normalizedData: { ...editingRow.normalizedData, fullName: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Lớp chủ nhiệm</label>
                <Input
                  value={editingRow.normalizedData?.homeroom || ""}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      normalizedData: { ...editingRow.normalizedData, homeroom: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">SĐT phụ huynh</label>
                <Input
                  value={editingRow.normalizedData?.guardianPhone || ""}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      normalizedData: { ...editingRow.normalizedData, guardianPhone: e.target.value },
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingRow(null)}>Hủy</Button>
                <Button onClick={handleSaveEdit} className="gap-2">
                  <Save className="h-4 w-4" /> Lưu & Đánh dấu hợp lệ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Danh sách phiếu bàn giao tài khoản sau khi Commit */}
      {activationSlips && (
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Phiếu bàn giao tài khoản & Mã kích hoạt ({activationSlips.length} học sinh)
              </CardTitle>
              <CardDescription>
                Mật khẩu tạm mặc định là <code>abc123</code>. Học sinh bắt buộc đổi mật khẩu bằng mã kích hoạt.
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> In phiếu bàn giao
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activationSlips.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{s.fullName}</span>
                    <Badge variant="outline" className="font-mono">{s.studentCode}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">Mật khẩu tạm: <code className="text-slate-800 dark:text-slate-200 font-bold">abc123</code></div>
                  <div className="text-xs text-slate-500">Mã kích hoạt:</div>
                  <div className="font-mono text-sm font-bold text-primary tracking-wider bg-primary/5 p-1 rounded mt-0.5 text-center">
                    {s.token}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
