import crypto from "crypto";

/**
 * PII Sanitizer & Data Hashing Module (Phase 6: AI Governance)
 * Bảo vệ dữ liệu cá nhân học sinh trước khi gửi qua API mô hình AI ngoài.
 */

export interface SanitizedContext<T = unknown> {
    sanitizedData: T;
    sourceHash: string;
    pseudonymMap: Record<string, string>;
}

/**
 * Tính SHA-256 hash chuẩn tắc của dữ liệu đầu vào.
 * Đảm bảo tính toàn vẹn (integrity) và đối soát (auditability).
 */
export function computeSourceDataHash(data: unknown): string {
    const canonical = typeof data === "string" ? data : JSON.stringify(data, Object.keys(data as object || {}).sort());
    return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Lọc sạch thông tin định danh cá nhân (PII: Họ tên, Email, SĐT, CCCD/CMND, Địa chỉ, Mã HS)
 * Thay thế bằng định danh ẩn danh (STUDENT_A, STUDENT_B, ...)
 */
export function sanitizeTextPII(
    rawText: string,
    studentIdentifiers?: { name?: string; studentCode?: string; email?: string; phone?: string }
): { sanitized: string; pseudonymMap: Record<string, string> } {
    let sanitized = rawText;
    const pseudonymMap: Record<string, string> = {};

    // 1. Thay thế trực tiếp thông tin học sinh được chỉ định
    if (studentIdentifiers) {
        if (studentIdentifiers.name && studentIdentifiers.name.trim().length > 1) {
            pseudonymMap[studentIdentifiers.name] = "Học sinh A";
            const nameRegex = new RegExp(studentIdentifiers.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            sanitized = sanitized.replace(nameRegex, "Học sinh A");
        }
        if (studentIdentifiers.studentCode) {
            pseudonymMap[studentIdentifiers.studentCode] = "HS_ANONYMOUS_01";
            const codeRegex = new RegExp(studentIdentifiers.studentCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            sanitized = sanitized.replace(codeRegex, "HS_ANONYMOUS_01");
        }
        if (studentIdentifiers.email) {
            pseudonymMap[studentIdentifiers.email] = "student@anonymized.edu.vn";
            const emailRegex = new RegExp(studentIdentifiers.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            sanitized = sanitized.replace(emailRegex, "student@anonymized.edu.vn");
        }
        if (studentIdentifiers.phone) {
            pseudonymMap[studentIdentifiers.phone] = "09xxxxxxxx";
            const phoneRegex = new RegExp(studentIdentifiers.phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            sanitized = sanitized.replace(phoneRegex, "09xxxxxxxx");
        }
    }

    // 2. Lọc Email thông thường
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_ANONYMIZED]");

    // 3. Lọc số điện thoại Việt Nam (10 chữ số bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84)
    sanitized = sanitized.replace(/(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}/g, "[PHONE_ANONYMIZED]");

    // 4. Lọc số CCCD / CMND (9 hoặc 12 chữ số liên tiếp)
    sanitized = sanitized.replace(/\b[0-9]{12}\b|\b[0-9]{9}\b/g, "[ID_ANONYMIZED]");

    return { sanitized, pseudonymMap };
}

/**
 * Chuẩn bị payload ẩn danh hoàn chỉnh kèm hash phục vụ AI Prompt
 */
export function sanitizeContextForAI<T extends Record<string, any>>(
    contextData: T,
    studentIdentifiers?: { name?: string; studentCode?: string; email?: string; phone?: string }
): SanitizedContext<T> {
    const rawJson = JSON.stringify(contextData);
    const { sanitized, pseudonymMap } = sanitizeTextPII(rawJson, studentIdentifiers);
    const sanitizedData = JSON.parse(sanitized) as T;
    const sourceHash = computeSourceDataHash(sanitizedData);

    return {
        sanitizedData,
        sourceHash,
        pseudonymMap,
    };
}
