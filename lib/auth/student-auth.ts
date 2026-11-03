import { createAdminClient } from "@/lib/supabase/admin";

export interface ResolvedStudent {
  userId: string;
  email: string;
  studentCode: string;
  schoolId: string;
  schoolCode: string;
  fullName: string;
}

/**
 * Tạo email nội bộ bí danh (Internal Alias) cho học sinh K12
 * Ví dụ: hs001@thcs-ndu.local
 */
export function buildStudentInternalEmail(studentCode: string, schoolCode: string): string {
  const cleanStudent = studentCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanSchool = schoolCode.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `${cleanStudent}@${cleanSchool}.local`;
}

/**
 * Kiểm tra xem chuỗi nhập vào có phải mã học sinh (thay vì email thông thường)
 */
export function isStudentCode(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  // Nếu không chứa ký tự '@' thì được coi là mã học sinh hoặc mã dạng SCHOOL_CODE:STUDENT_CODE
  return !trimmed.includes("@");
}

/**
 * Phân giải mã học sinh sang tài khoản thực tế trong hệ thống
 */
export async function resolveStudentIdentifier(
  identifier: string,
  targetSchoolCode?: string
): Promise<ResolvedStudent | null> {
  const db = createAdminClient();
  let studentCode = identifier.trim().toUpperCase();
  let schoolCode = targetSchoolCode?.trim().toUpperCase();

  // Hỗ trợ định dạng kép: THCS-NDU:HS001 hoặc THCS-NDU/HS001
  if (identifier.includes(":") || identifier.includes("/")) {
    const separator = identifier.includes(":") ? ":" : "/";
    const parts = identifier.split(separator);
    if(parts.length!==2 || !parts[0].trim() || !parts[1].trim())return null;
    schoolCode = parts[0].trim().toUpperCase();
    studentCode = parts[1].trim().toUpperCase();
  }

  // 1. Tìm trường học nếu có schoolCode
  let schoolId: string | null = null;
  if (schoolCode) {
    const { data: school } = await db
      .from("schools")
      .select("id, code")
      .eq("code", schoolCode)
      .eq("status", "active")
      .limit(1)
      .single();
    if (school) {
      schoolId = school.id;
      schoolCode = school.code;
    }
    else return null;
  }

  // 2. Tìm trong bảng student_identifiers
  let query = db
    .from("student_identifiers")
    .select(`
      id,
      student_code,
      school_id,
      user_id,
      school:schools!student_identifiers_school_id_fkey(id, code),
      user:users!student_identifiers_user_id_fkey(id, email, full_name)
    `)
    .eq("student_code", studentCode)
    .eq("status", "active");

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data: records, error } = await query.limit(2);
  if (error || !records || records.length !== 1) {
    return null;
  }

  // Nếu tìm thấy duy nhất 1 học sinh khớp
  const record = records[0];
  const user = (record as any).user;
  const school = (record as any).school;

  if (!user || !school) return null;

  return {
    userId: user.id,
    email: user.email,
    studentCode: record.student_code,
    schoolId: school.id,
    schoolCode: school.code,
    fullName: user.full_name,
  };
}
