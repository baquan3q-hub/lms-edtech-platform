import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseK12ExcelBuffer } from "@/lib/excel/import-parser";

describe("Phase 3 Excel Parser Unit Tests", () => {
  function createTestWorkbook(data: any[]): Buffer {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  it("unit: parses valid K12 student list correctly", () => {
    const sampleData = [
      {
        "Mã học sinh": "HS001",
        "Họ và tên": "Nguyễn Văn An",
        "Khối": "8",
        "Lớp chủ nhiệm": "8A",
        "Tên phụ huynh": "Nguyễn Văn Ba",
        "SĐT phụ huynh": "0912345678",
      },
      {
        "Mã học sinh": "HS002",
        "Họ và tên": "Trần Thị Bình",
        "Khối": "8",
        "Lớp chủ nhiệm": "8A",
        "Tên phụ huynh": "Trần Văn Cường",
        "SĐT phụ huynh": "0987654321",
      },
    ];

    const buffer = createTestWorkbook(sampleData);
    const result = parseK12ExcelBuffer(buffer);

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(2);
    expect(result.errorCount).toBe(0);
    expect(result.rows[0].status).toBe("valid");
    expect(result.rows[0].normalizedData?.studentCode).toBe("HS001");
    expect(result.rows[0].normalizedData?.fullName).toBe("Nguyễn Văn An");
  });

  it("unit: detects missing required fields", () => {
    const faultyData = [
      {
        "Mã học sinh": "",
        "Họ và tên": "Học sinh không mã",
        "Khối": "8",
        "Lớp chủ nhiệm": "8A",
      },
      {
        "Mã học sinh": "HS003",
        "Họ và tên": "",
        "Khối": "8",
        "Lớp chủ nhiệm": "8A",
      },
      {
        "Mã học sinh": "HS004",
        "Họ và tên": "Nguyễn Thiếu Lớp",
        "Khối": "8",
        "Lớp chủ nhiệm": "",
      },
    ];

    const buffer = createTestWorkbook(faultyData);
    const result = parseK12ExcelBuffer(buffer);

    expect(result.totalRows).toBe(3);
    expect(result.validCount).toBe(0);
    expect(result.errorCount).toBe(3);

    expect(result.rows[0].errorCode).toBe("MISSING_STUDENT_CODE");
    expect(result.rows[1].errorCode).toBe("MISSING_FULL_NAME");
    expect(result.rows[2].errorCode).toBe("MISSING_HOMEROOM");
  });

  it("unit: detects duplicate student code within the same file", () => {
    const duplicateData = [
      {
        "Mã học sinh": "HS005",
        "Họ và tên": "Nguyễn Văn Một",
        "Khối": "8",
        "Lớp chủ nhiệm": "8A",
      },
      {
        "Mã học sinh": "HS005", // Trùng mã
        "Họ và tên": "Nguyễn Văn Hai",
        "Khối": "8",
        "Lớp chủ nhiệm": "8A",
      },
    ];

    const buffer = createTestWorkbook(duplicateData);
    const result = parseK12ExcelBuffer(buffer);

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.rows[1].errorCode).toBe("DUPLICATE_STUDENT_CODE_IN_FILE");
  });

  it("unit: validates guardian phone number format", () => {
    const invalidPhoneData = [
      {
        "Mã học sinh": "HS006",
        "Họ và tên": "Học sinh A",
        "Khối": "8",
        "Lớp chủ nhiệm": "8A",
        "SĐT phụ huynh": "123456", // Không đúng định dạng SĐT VN
      },
    ];

    const buffer = createTestWorkbook(invalidPhoneData);
    const result = parseK12ExcelBuffer(buffer);

    expect(result.totalRows).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.rows[0].errorCode).toBe("INVALID_PHONE_FORMAT");
  });
});
