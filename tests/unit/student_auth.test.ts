import { describe, it, expect } from "vitest";
import { buildStudentInternalEmail, isStudentCode } from "@/lib/auth/student-auth";

describe("Phase 3 Student Auth Unit Tests", () => {
  it("unit: buildStudentInternalEmail produces lowercase .local alias", () => {
    const alias1 = buildStudentInternalEmail("HS001", "THCS-NDU");
    expect(alias1).toBe("hs001@thcs-ndu.local");

    const alias2 = buildStudentInternalEmail(" HS-025 ", " THCS CVA ");
    expect(alias2).toBe("hs025@thcs-cva.local");
  });

  it("unit: isStudentCode correctly detects student codes vs emails", () => {
    expect(isStudentCode("HS001")).toBe(true);
    expect(isStudentCode("hs999")).toBe(true);
    expect(isStudentCode("THCS-NDU:HS001")).toBe(true);
    expect(isStudentCode("THCS-NDU/HS002")).toBe(true);
    expect(isStudentCode("202600123")).toBe(true);

    // Email thông thường
    expect(isStudentCode("admin@school.edu.vn")).toBe(false);
    expect(isStudentCode("parent@gmail.com")).toBe(false);
    expect(isStudentCode("teacher@thcs-ndu.edu.vn")).toBe(false);
  });
});
