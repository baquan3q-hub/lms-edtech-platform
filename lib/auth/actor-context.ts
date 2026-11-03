import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies, headers } from "next/headers";
import { isEffective, isVerifiedGuardian } from "./policy";

export type Role = "super_admin" | "admin" | "teacher" | "student" | "parent";

export class AccessError extends Error {
  constructor(
    public status: number,
    message = "Không có quyền truy cập.",
    public code = "FORBIDDEN"
  ) {
    super(message);
    this.name = "AccessError";
  }
}

export interface ActorContext {
  userId: string;
  schoolId: string;
  membershipId?: string;
  roles: Role[];
  currentRole: Role;
  scopes?: string[];
  homeroomScope?: string[];
  subjectScope?: string[];
  expiresAt: number;
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export const DEFAULT_PILOT_SCHOOL_ID = "00000000-0000-0000-0001-000000000000";

/**
 * Lấy ActorContext của người dùng hiện tại từ session server-side
 * Dữ liệu vai trò lấy từ bảng users và school_memberships làm nguồn chuẩn (Ground Truth).
 * Request-scoped memoization bằng React cache giúp tránh lặp lại truy vấn trong cùng 1 request.
 */
export const getActorContext = cache(async (targetSchoolId?: string): Promise<ActorContext | null> => {
  const sessionClient = await createClient();
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  if (authorization && (!authorization.startsWith("Bearer ") || authorization.length > 16384)) return null;
  const { data: { user }, error: authError } = await sessionClient.auth.getUser(authorization?.slice(7));

  if (authError || !user) {
    return null;
  }

  const db = createAdminClient();

  // 1 & 2. Lấy thông tin user và danh sách thành viên trường học song song
  const [userRes, membershipsRes, activationRes] = await Promise.all([
    db.from("users").select("id, role").eq("id", user.id).single(),
    db.from("school_memberships").select("id, school_id, role, status").eq("user_id", user.id).eq("status", "active").order("created_at"),
    db.from("account_activations").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1)
  ]);

  const { data: userData, error: userError } = userRes;
  if (userError || !userData || membershipsRes.error || activationRes.error) {
    return null;
  }

  if (activationRes.data?.[0] && activationRes.data[0].status !== "used") return null;
  const validMemberships = membershipsRes.data || [];
  const cookieStore = await cookies();
  const selectedSchoolId = targetSchoolId || (authorization ? requestHeaders.get("x-school-id") : null) || cookieStore.get("lms-school-id")?.value;
  const primarySchoolId = selectedSchoolId || validMemberships[0]?.school_id || "";
  const schoolMemberships = validMemberships.filter(m => m.school_id === primarySchoolId);

  // BẢO MẬT: Chỉ xét email allowlist (hằng số phía server) và vai trò trong
  // bảng public.users. Không xét user_metadata vì client tự ghi được trường này
  // qua supabase.auth.updateUser(), dẫn tới tự nâng quyền Super Admin.
  const isSuper = userData.role === "super_admin";
  if (!isSuper && schoolMemberships.length === 0) return null;

  const roles = isSuper
    ? ["super_admin" as Role, "admin" as Role]
    : Array.from(new Set(schoolMemberships.map(m => m.role))) as Role[];

  const preferredRole = ((authorization ? requestHeaders.get("x-lms-role") : null) || cookieStore.get("lms-role")?.value) as Role | undefined;
  const currentRole: Role = isSuper ? "super_admin" : (preferredRole && roles.includes(preferredRole) ? preferredRole : roles.includes(userData.role as Role) ? userData.role as Role : roles[0]);

  // 3. Lấy phạm vi lớp chủ nhiệm và môn học (Phase 2 Rosters)
  let homeroomScope: string[] = [];
  let subjectScope: string[] = [];

  try {
    if (currentRole === "teacher") {
      const [hrRes, classRes] = await Promise.all([
        db.from("homeroom_teacher_assignments").select("homeroom_id, status, start_date, end_date").eq("school_id", primarySchoolId).eq("teacher_id", user.id).eq("status", "active"),
        db.from("class_teacher_assignments").select("status, valid_from, valid_to, class:classes!class_teacher_assignments_class_id_fkey(subject_id)").eq("school_id", primarySchoolId).eq("teacher_id", user.id).eq("status", "active")
      ]);
      if (hrRes.data) {
        homeroomScope = hrRes.data.filter(a => isEffective(a)).map(a => a.homeroom_id);
      }
      if (classRes.data) {
        subjectScope = Array.from(new Set(
          classRes.data.filter(a => isEffective(a))
            .map((ca: any) => ca.class?.subject_id)
            .filter(Boolean)
        ));
      }
    } else if (currentRole === "student") {
      const { data: hrEnrolls } = await db
        .from("homeroom_enrollments")
        .select("homeroom_id")
        .eq("student_id", user.id)
        .eq("status", "active");
      if (hrEnrolls) {
        homeroomScope = hrEnrolls.map((e: { homeroom_id: string }) => e.homeroom_id);
      }
    }
  } catch {
    // Graceful fallback trong giai đoạn chuyển đổi
  }

  return {
    userId: user.id,
    schoolId: primarySchoolId,
    membershipId: schoolMemberships[0]?.id,
    roles,
    currentRole,
    scopes: [],
    homeroomScope,
    subjectScope,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
});

/**
 * Bắt buộc người dùng phải có ActorContext hợp lệ và nằm trong danh sách vai trò cho phép
 */
export async function requireActorContext(
  allowedRoles?: Role[],
  targetSchoolId?: string
): Promise<ActorContext> {
  const actor = await getActorContext(targetSchoolId);
  if (!actor) {
    throw new AccessError(401, "Vui lòng đăng nhập để tiếp tục.", "UNAUTHENTICATED");
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(actor.currentRole) || actor.roles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      throw new AccessError(403, "Bạn không có quyền thực hiện thao tác này.", "FORBIDDEN_ROLE");
    }
  }

  if (targetSchoolId && actor.currentRole !== "super_admin") {
    if (actor.schoolId !== targetSchoolId) {
      throw new AccessError(403, "Không có quyền truy cập dữ liệu trường học khác.", "CROSS_SCHOOL_DENIED");
    }
  }

  return actor;
}

/**
 * Kiểm tra và bắt buộc quyền truy cập trường học
 */
export function requireSchoolScope(actor: ActorContext, schoolId: string): void {
  if (actor.currentRole === "super_admin") return;
  if (!schoolId || actor.schoolId !== schoolId) {
    throw new AccessError(403, "Từ chối truy cập: Dữ liệu thuộc trường học khác.", "CROSS_SCHOOL_DENIED");
  }
}

/**
 * Kiểm tra quyền quản lý lớp chủ nhiệm (chỉ GV chủ nhiệm được phân công hoặc Admin)
 */
export function requireHomeroomScope(actor: ActorContext, homeroomId: string, resourceSchoolId?: string): void {
  if (actor.currentRole === "super_admin") return;
  if (actor.currentRole === "admin") {
    if (!resourceSchoolId) throw new AccessError(403,"Thiếu phạm vi trường của tài nguyên.","SCHOOL_SCOPE_REQUIRED");
    return requireSchoolScope(actor,resourceSchoolId);
  }
  if (!actor.homeroomScope || !actor.homeroomScope.includes(homeroomId)) {
    throw new AccessError(403, "Bạn không có quyền quản lý lớp chủ nhiệm này.", "HOMEROOM_ACCESS_DENIED");
  }
}

/**
 * Kiểm tra quyền phụ trách môn học (chỉ GV bộ môn được phân công hoặc Admin)
 */
export function requireSubjectScope(actor: ActorContext, subjectId: string, resourceSchoolId?: string): void {
  if (actor.currentRole === "super_admin") return;
  if (actor.currentRole === "admin") {
    if (!resourceSchoolId) throw new AccessError(403,"Thiếu phạm vi trường của tài nguyên.","SCHOOL_SCOPE_REQUIRED");
    return requireSchoolScope(actor,resourceSchoolId);
  }
  if (!actor.subjectScope || !actor.subjectScope.includes(subjectId)) {
    throw new AccessError(403, "Bạn không có quyền quản lý môn học này.", "SUBJECT_ACCESS_DENIED");
  }
}

/**
 * Kiểm tra quyền truy cập lớp học cụ thể (chống can thiệp chéo lớp)
 */
export async function requireClassScope(
  actor: ActorContext,
  classId: string,
  mode: "read" | "teach" | "learn" = "read"
): Promise<boolean> {
  const db = createAdminClient();

  const { data: cls, error } = await db
    .from("classes")
    .select("id, school_id, teacher_id")
    .eq("id", classId)
    .single();

  if (error || !cls) {
    throw new AccessError(404, "Không tìm thấy lớp học.", "NOT_FOUND");
  }

  // Kiểm tra trường học nếu lớp có school_id
  requireSchoolScope(actor, cls.school_id);

  if (actor.currentRole === "super_admin" || (actor.roles.includes("admin") && mode !== "learn")) return true;

  if (actor.roles.includes("teacher") && mode !== "learn") {
      const { data: assigned } = await db
        .from("class_teacher_assignments")
        .select("id, status, valid_from, valid_to")
        .eq("class_id", classId)
        .eq("teacher_id", actor.userId);
      if (assigned?.some(a => isEffective(a))) return true;
      // Legacy owner is allowed only when no assignment has ever superseded it.
      if (assigned && assigned.length === 0 && cls.teacher_id === actor.userId) return true;
  }

  if (actor.roles.includes("student") && mode !== "teach") {
    const { data } = await db
      .from("enrollments")
      .select("id")
      .eq("class_id", classId)
      .eq("student_id", actor.userId)
      .eq("status", "active")
      .limit(1);
    if (data && data.length > 0) return true;
  }

  if (actor.roles.includes("parent") && mode === "read") {
    const { data: children } = await db
      .from("parent_students")
      .select("student_id, verification_status, valid_from, valid_to")
      .eq("school_id", actor.schoolId)
      .eq("parent_id", actor.userId);

    const childIds = (children || []).filter(c => isVerifiedGuardian(c)).map(c => c.student_id);
    if (childIds.length > 0) {
      const { data: enrolls } = await db
        .from("enrollments")
        .select("id")
        .eq("class_id", classId)
        .in("student_id", childIds)
        .eq("status", "active")
        .limit(1);
      if (enrolls && enrolls.length > 0) return true;
    }
  }

  throw new AccessError(403, "Bạn không có quyền truy cập vào lớp học này.", "CLASS_ACCESS_DENIED");
}

