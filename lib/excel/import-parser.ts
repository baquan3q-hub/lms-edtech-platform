import * as XLSX from "xlsx";
import crypto from "crypto";

export interface ParsedRowResult {
  rowNumber: number;
  rawData: Record<string, any>;
  normalizedData?: Record<string, any>;
  status: "valid" | "error";
  errorCode?: string;
  errorMessage?: string;
}

export interface ExcelParseResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  rows: ParsedRowResult[];
  fileHash: string;
}

/**
 * Chuẩn hóa tên cột tiếng Việt không dấu, viết thường để chống lỗi sai chính tả
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Đọc và chuẩn hóa dữ liệu từ Buffer file Excel (.xlsx / .csv)
 */
export function parseK12ExcelBuffer(buffer: Buffer): ExcelParseResult {
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      rows: [],
      fileHash,
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const rows: ParsedRowResult[] = [];
  const seenStudentCodes = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Dòng 1 là Header

    // Map các trường linh hoạt theo tiếng Việt
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const normKey = normalizeHeader(key);
      if (normKey.includes("ma_truong")) mapped.schoolCode = String(value).trim();
      else if (normKey.includes("nam_hoc")) mapped.academicYear = String(value).trim();
      else if (normKey.includes("khoi")) mapped.grade = String(value).trim();
      else if (normKey.includes("lop") || normKey.includes("chu_nhiem")) mapped.homeroom = String(value).trim();
      else if (normKey.includes("ma_hoc_sinh") || normKey.includes("ma_hs")) mapped.studentCode = String(value).trim().toUpperCase();
      else if (normKey.includes("ho_va_ten") || normKey.includes("ho_ten") || normKey.includes("ten_hoc_sinh")) mapped.fullName = String(value).trim();
      else if (normKey.includes("ngay_sinh")) mapped.dob = String(value).trim();
      else if (normKey.includes("ten_phu_huynh") || normKey.includes("ho_ten_ph")) mapped.guardianName = String(value).trim();
      else if (normKey.includes("sdt") || normKey.includes("dien_thoai")) mapped.guardianPhone = String(value).trim();
      else if (normKey.includes("email_phu_huynh") || normKey.includes("email_ph")) mapped.guardianEmail = String(value).trim().toLowerCase();
      else if (normKey.includes("quan_he")) mapped.relationship = String(value).trim() || "Phụ huynh";
    }

    // Kiểm tra tính hợp lệ
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    if (!mapped.studentCode) {
      errorCode = "MISSING_STUDENT_CODE";
      errorMessage = "Thiếu mã học sinh";
    } else if (!mapped.fullName) {
      errorCode = "MISSING_FULL_NAME";
      errorMessage = "Thiếu họ và tên học sinh";
    } else if (!mapped.homeroom) {
      errorCode = "MISSING_HOMEROOM";
      errorMessage = "Thiếu lớp chủ nhiệm";
    } else if (seenStudentCodes.has(mapped.studentCode)) {
      errorCode = "DUPLICATE_STUDENT_CODE_IN_FILE";
      errorMessage = `Mã học sinh '${mapped.studentCode}' bị trùng lặp trong file`;
    } else if (mapped.guardianPhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(mapped.guardianPhone.replace(/\s+/g, ""))) {
      errorCode = "INVALID_PHONE_FORMAT";
      errorMessage = `Số điện thoại phụ huynh '${mapped.guardianPhone}' không đúng định dạng`;
    } else if (mapped.guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.guardianEmail)) {
      errorCode = "INVALID_EMAIL_FORMAT";
      errorMessage = `Email phụ huynh '${mapped.guardianEmail}' không hợp lệ`;
    }

    if (mapped.studentCode) {
      seenStudentCodes.add(mapped.studentCode);
    }

    if (errorCode) {
      rows.push({
        rowNumber,
        rawData: row,
        normalizedData: mapped,
        status: "error",
        errorCode,
        errorMessage,
      });
    } else {
      rows.push({
        rowNumber,
        rawData: row,
        normalizedData: mapped,
        status: "valid",
      });
    }
  });

  const validCount = rows.filter((r) => r.status === "valid").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return {
    totalRows: rows.length,
    validCount,
    errorCount,
    rows,
    fileHash,
  };
}
