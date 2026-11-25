import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/supabase/auth";
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

type AdminDb = ReturnType<typeof createAdminClient>;

/** Active teaching assignments across schools; the caller keeps the current school's rows. Null on failure. */
async function loadTeacherScopeRows(db: AdminDb, teacherId: string) {
  try {
    const [hrRes, classRes] = await Promise.all([
      db.from("homeroom_teacher_assignments").select("school_id, homeroom_id, status, start_date, end_date").eq("teacher_id", teacherId).eq("status", "active"),
      db.from("class_teacher_assignments").select("school_id, status, valid_from, valid_to, class:classes!class_teacher_assignments_class_id_fkey(subject_id)").eq("teacher_id", teacherId).eq("status", "active"),
    ]);
    return { homerooms: hrRes.data ?? [], classes: classRes.data ?? [] };
  } catch {
    // Graceful fallback trong giai đoạn chuyển đổi
    return null;
  }
}

async function loadStudentHomeroomIds(db: AdminDb, studentId: string) {
  try {
    const { data } = await db.from("homeroom_enrollments").select("homeroom_id").eq("student_id", studentId).eq("status", "active");
    return data ? data.map((e: { homeroom_id: string }) => e.homeroom_id) : null;
  } catch {
    return null;
  }
}

/**
 * Lấy ActorContext của người dùng hiện tại từ session server-side
 * Dữ liệu vai trò lấy từ bảng users và school_memberships làm nguồn chuẩn (Ground Truth).
 * Request-scoped memoization bằng React cache giúp tránh lặp lại truy vấn trong cùng 1 request.
 */
export const getActorContext = cache(async (targetSchoolId?: string): Promise<ActorContext | null> => {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  if (authorization && (!authorization.startsWith("Bearer ") || authorization.length <= 7 || authorization.length > 16384)) return null;
  // Share the cookie-session lookup with layouts/profile/page in this render.
  // Bearer clients keep a separate cache entry keyed by their access token.
  const user = authorization ? await getCurrentUser(authorization.slice(7)) : await getCurrentUser();

  if (!user) {
    return null;
  }

  const db = createAdminClient();
  const cookieStore = await cookies();
  const preferredRole = ((authorization ? requestHeaders.get("x-lms-role") : null) || cookieStore.get("lms-role")?.value) as Role | undefined;

  // The role chosen at login only decides which scope rows to start loading alongside the
  // membership lookup, saving one round trip. It grants nothing: the role is still resolved
  // from memberships below, and the rows are filtered by school before use.
  const teacherScopePrefetch = preferredRole === "teacher" ? loadTeacherScopeRows(db, user.id) : null;
  const studentScopePrefetch = preferredRole === "student" ? loadStudentHomeroomIds(db, user.id) : null;

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

  const currentRole: Role = isSuper ? "super_admin" : (preferredRole && roles.includes(preferredRole) ? preferredRole : roles.includes(userData.role as Role) ? userData.role as Role : roles[0]);

  // 3. Lấy phạm vi lớp chủ nhiệm và môn học (Phase 2 Rosters)
  let homeroomScope: string[] = [];
  let subjectScope: string[] = [];

  if (currentRole === "teacher") {
    const rows = await (teacherScopePrefetch ?? loadTeacherScopeRows(db, user.id));
    if (rows) {
      homeroomScope = rows.homerooms
        .filter(a => a.school_id === primarySchoolId && isEffective(a))
        .map(a => a.homeroom_id);
      subjectScope = Array.from(new Set(
        rows.classes.filter(a => a.school_id === primarySchoolId && isEffective(a))
          .map((ca: any) => (Array.isArray(ca.class) ? ca.class[0] : ca.class)?.subject_id)
          .filter(Boolean)
      ));
    }
  } else if (currentRole === "student") {
    homeroomScope = (await (studentScopePrefetch ?? loadStudentHomeroomIds(db, user.id))) ?? [];
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
  const cls = await loadClassRow(classId);

  if (!cls) {
    throw new AccessError(404, "Không tìm thấy lớp học.", "NOT_FOUND");
  }

  // Kiểm tra trường học nếu lớp có school_id
  requireSchoolScope(actor, cls.school_id);

  if (actor.currentRole === "super_admin" || (actor.roles.includes("admin") && mode !== "learn")) return true;

  if (actor.roles.includes("teacher") && mode !== "learn") {
      const assigned = await loadTeacherAssignments(classId, actor.userId);
      if (assigned?.some(a => isEffective(a))) return true;
      // Legacy owner is allowed only when no assignment has ever superseded it.
      if (assigned && assigned.length === 0 && cls.teacher_id === actor.userId) return true;
  }

  if (actor.roles.includes("student") && mode !== "teach") {
    if (await hasActiveEnrollment(classId, actor.userId)) return true;
  }

  if (actor.roles.includes("parent") && mode === "read") {
    if (await guardianHasChildInClass(classId, actor.schoolId, actor.userId)) return true;
  }

  throw new AccessError(403, "Bạn không có quyền truy cập vào lớp học này.", "CLASS_ACCESS_DENIED");
}

// Request-scoped lookups behind requireClassScope. A class page calls the check once per
// widget; React cache (keyed on these primitive arguments) lets them share one query each
// within a server render. Outside a render (route handlers, tests) they run every time.
// Only rows are cached; the access decision above is still made on every call.
const loadClassRow = cache(async (classId: string) => {
  const { data, error } = await createAdminClient()
    .from("classes")
    .select("id, school_id, teacher_id")
    .eq("id", classId)
    .single();
  return error || !data ? null : data as { id: string; school_id: string; teacher_id: string | null };
});

const loadTeacherAssignments = cache(async (classId: string, teacherId: string) => {
  const { data } = await createAdminClient()
    .from("class_teacher_assignments")
    .select("id, status, valid_from, valid_to")
    .eq("class_id", classId)
    .eq("teacher_id", teacherId);
  return data;
});

const hasActiveEnrollment = cache(async (classId: string, studentId: string) => {
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(1);
  return !!data && data.length > 0;
});

const loadGuardianChildIds = cache(async (schoolId: string, parentId: string) => {
  const { data: children } = await createAdminClient()
    .from("parent_students")
    .select("student_id, verification_status, valid_from, valid_to")
    .eq("school_id", schoolId)
    .eq("parent_id", parentId);
  return (children || []).filter(c => isVerifiedGuardian(c)).map(c => c.student_id as string);
});

const guardianHasChildInClass = cache(async (classId: string, schoolId: string, parentId: string) => {
  const childIds = await loadGuardianChildIds(schoolId, parentId);
  if (childIds.length === 0) return false;
  const { data: enrolls } = await createAdminClient()
    .from("enrollments")
    .select("id")
    .eq("class_id", classId)
    .in("student_id", childIds)
    .eq("status", "active")
    .limit(1);
  return !!enrolls && enrolls.length > 0;
});

