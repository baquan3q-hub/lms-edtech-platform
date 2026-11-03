import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActorContext, requireActorContext, requireClassScope, requireSchoolScope, AccessError, type Role } from "./actor-context";
import { isEffective, isVerifiedGuardian } from "./policy";
export { AccessError };
export type { Role };

export async function requireActor(roles?: Role[]) {
  const context = await requireActorContext(roles);
  return { id: context.userId, role: context.currentRole, schoolId: context.schoolId, roles: context.roles, context, db: createAdminClient() };
}

export async function requireClassAccess(classId: string, mode: "read" | "teach" | "learn" = "read") {
  const actor = await requireActor();
  await requireClassScope(actor.context, classId, mode);
  return actor;
}

export async function requireResourceAccess(table: "exams" | "homework" | "course_items", id: string, mode: "read" | "teach" | "learn" = "read") {
  const actor = await requireActor();
  const { data, error } = await actor.db.from(table).select("*").eq("id", id).single();
  if (error || !data?.class_id) throw new AccessError(404, "Không tìm thấy nội dung.");
  await requireClassScope(actor.context, data.class_id, mode);
  if (actor.role === "student" || actor.role === "parent") {
    const published = data.is_published === true && (!data.publication_status || data.publication_status === "published" || (mode === "read" && data.publication_status === "closed"));
    if (!published) throw new AccessError(403, "Nội dung chưa được công bố.");
  }
  return { ...actor, resource: data };
}

export async function requireRecordAccess(table: "exam_submissions" | "homework_submissions" | "quiz_individual_analysis" | "supplementary_quizzes", id: string, mode: "read" | "teach" = "teach") {
  const actor = await requireActor();
  const { data, error } = await actor.db.from(table).select("*").eq("id", id).single();
  if (error || !data) throw new AccessError(404);
  if (mode === "read" && data.student_id === actor.id) {
    await requireResourceAccess(table === "homework_submissions" ? "homework" : "exams", data.homework_id || data.exam_id, "read");
    return { ...actor, record: data };
  }
  await requireResourceAccess(table === "homework_submissions" ? "homework" : "exams", data.homework_id || data.exam_id, "teach");
  return { ...actor, record: data };
}

export async function requireStudentAccess(studentId: string, teachOnly = false) {
  const actor = await requireActor();
  if (actor.role === "super_admin") return actor;
  const { data: membership, error } = await actor.db.from("school_memberships").select("id")
    .eq("school_id", actor.schoolId).eq("user_id", studentId).eq("role", "student").eq("status", "active").limit(1);
  if (error || !membership?.length) throw new AccessError(403);
  if (actor.roles.includes("admin") || (!teachOnly && actor.id === studentId)) return actor;
  if (!teachOnly && actor.roles.includes("parent")) {
    const { data } = await actor.db.from("parent_students").select("verification_status, valid_from, valid_to")
      .eq("school_id", actor.schoolId).eq("parent_id", actor.id).eq("student_id", studentId);
    if (data?.some(link => isVerifiedGuardian(link))) return actor;
  }
  if (actor.roles.includes("teacher")) {
    const { data } = await actor.db.from("enrollments").select("class_id").eq("student_id", studentId).eq("status", "active");
    for (const row of data || []) {
      try { await requireClassScope(actor.context, row.class_id, "teach"); return actor; }
      catch (error) { if (!(error instanceof AccessError)) throw error; }
    }
  }
  throw new AccessError(403);
}

export async function requireHomeroomAccess(homeroomId: string) {
  const actor = await requireActor();
  const { data: room, error } = await actor.db.from("homerooms").select("id, school_id").eq("id", homeroomId).single();
  if (error || !room) throw new AccessError(404);
  requireSchoolScope(actor.context, room.school_id);
  if (actor.roles.includes("admin") || actor.role === "super_admin") return actor;
  const { data } = await actor.db.from("homeroom_teacher_assignments").select("status, start_date, end_date")
    .eq("homeroom_id", homeroomId).eq("teacher_id", actor.id);
  if (actor.roles.includes("teacher") && data?.some(a => isEffective(a))) return actor;
  throw new AccessError(403, "Bạn không có quyền quản lý lớp chủ nhiệm này.");
}

/** Resolve school context for catalogs; platform users must choose a school explicitly. */
export async function requireSchoolActor(roles?: Role[], schoolId?: string) {
  const context = await requireActorContext(roles, schoolId);
  if (!context.schoolId) throw new AccessError(400, "Vui lòng chọn trường học.", "SCHOOL_REQUIRED");
  return { id: context.userId, schoolId: context.schoolId, role: context.currentRole, context, db: createAdminClient() };
}

/** School administrators manage membership; shared global identities need platform authority. */
export async function requireManagedUser(userId: string, globalIdentity = false) {
  const actor=await requireActor(["admin"]);
  const [user,memberships]=await Promise.all([
    actor.db.from("users").select("id,role").eq("id",userId).single(),
    actor.db.from("school_memberships").select("id,school_id,role,status").eq("user_id",userId),
  ]);
  if(user.error||!user.data||memberships.error)throw new AccessError(404,"Không tìm thấy tài khoản.","NOT_FOUND");
  if(actor.role!=="super_admin") {
    if(user.data.role==="super_admin"||!memberships.data?.some(m=>m.school_id===actor.schoolId))throw new AccessError(403);
    if(globalIdentity&&memberships.data?.some(m=>m.school_id!==actor.schoolId))throw new AccessError(403,"Hồ sơ dùng chung nhiều trường cần quản trị nền tảng xử lý.");
  }
  return {...actor,memberships:memberships.data||[]};
}
