import { createAdminClient } from "@/lib/supabase/admin";
import { isVerifiedGuardian } from "./policy";

export interface ParentVerificationResult {
    allowed: boolean;
    error?: string;
    studentId?: string;
}

/**
 * Kiểm tra phân quyền truy cập của phụ huynh đối với học sinh (Phase 5 Parent Boundary).
 * Phụ huynh CHỈ được xem thông tin, điểm số, chuyên cần của con đã được xác minh.
 * Truy cập trái phép vào học sinh khác lập tức bị từ chối với mã 403 Forbidden.
 */
export async function verifyParentAccessToStudent(
    parentId: string,
    studentId: string
): Promise<ParentVerificationResult> {
    if (!parentId || !studentId) {
        return {
            allowed: false,
            error: "Thiếu định danh phụ huynh hoặc học sinh."
        };
    }

    const adminSupabase = createAdminClient();

    const { data: link, error } = await adminSupabase
        .from("parent_students")
        .select("id, parent_id, student_id, verification_status, valid_from, valid_to")
        .eq("parent_id", parentId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error || !link) {
        return {
            allowed: false,
            error: "403_FORBIDDEN: Bạn không có quyền truy cập dữ liệu của học sinh này."
        };
    }

    // Nếu có trường status trên parent_students, yêu cầu trạng thái phải là verified hoặc active
    if (!isVerifiedGuardian(link)) {
        return {
            allowed: false,
            error: "403_FORBIDDEN: Hồ sơ liên kết phụ huynh - học sinh chưa được xác minh."
        };
    }

    return {
        allowed: true,
        studentId
    };
}

/**
 * Lấy danh sách ID các con đã được xác nhận của phụ huynh.
 */
export async function getParentVerifiedStudentIds(parentId: string): Promise<string[]> {
    if (!parentId) return [];

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
        .from("parent_students")
        .select("student_id, verification_status, valid_from, valid_to")
        .eq("parent_id", parentId);

    if (error || !data) return [];

    return data
        .filter(row => isVerifiedGuardian(row))
        .map(row => row.student_id);
}
