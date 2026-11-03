import "server-only";
import { z } from "zod";
import { requireSchoolActor, requireClassAccess } from "@/lib/auth/authorize";
import { AccessError } from "@/lib/auth/actor-context";

const id = z.uuid();
const courseInput = z.object({ name: z.string().trim().min(1).max(200), description: z.string().max(10000).optional(), teacher_id: id });
const classInput = z.object({ course_id: id, teacher_id: id, room: z.string().max(100), schedule: z.string().max(5000), max_students: z.number().int().min(1).max(300) });
type Db = Awaited<ReturnType<typeof requireSchoolActor>>["db"];

async function member(db: Db, schoolId: string, userId: string, role: string) {
  const { data, error } = await db.from("school_memberships").select("id")
    .eq("school_id", schoolId).eq("user_id", id.parse(userId)).eq("role", role).eq("status", "active").limit(1);
  if (error || !data?.length) throw new AccessError(403, "Tài khoản không thuộc trường hoặc không có vai trò phù hợp.");
}

export async function listCatalog(table: "courses" | "academic_years" | "terms" | "grade_levels" | "subjects" | "homerooms", schoolId?: string, yearId?: string, select = "*") {
  const actor = await requireSchoolActor(undefined, schoolId);
  let query = actor.db.from(table).select(select).eq("school_id", actor.schoolId);
  if (yearId) query = query.eq("academic_year_id", id.parse(yearId));
  if (table === "subjects" || table === "grade_levels") query = query.eq("is_active", true);
  const sort = table === "academic_years" ? "start_date" : table === "terms" ? "semester_order" : table === "grade_levels" ? "level" : "name";
  const { data, error } = await query.order(sort, { ascending: table !== "academic_years" });
  if (error) throw error;
  return data || [];
}

export async function createCourseRecord(input: z.input<typeof courseInput>) {
  const actor = await requireSchoolActor(["admin"]);
  const checked = courseInput.parse(input);
  await member(actor.db, actor.schoolId, checked.teacher_id, "teacher");
  const { data, error } = await actor.db.from("courses").insert({ ...checked, school_id: actor.schoolId }).select().single();
  if (error) throw error;
  return data;
}

export async function createClassRecord(input: z.input<typeof classInput>) {
  const actor = await requireSchoolActor(["admin"]);
  const checked = classInput.parse(input);
  await member(actor.db, actor.schoolId, checked.teacher_id, "teacher");
  const { data: course, error: courseError } = await actor.db.from("courses").select("id,name").eq("id", checked.course_id).eq("school_id", actor.schoolId).single();
  if (courseError || !course) throw new AccessError(403, "Chương trình không thuộc trường.");
  let schedule: unknown = { text: checked.schedule };
  try { schedule = JSON.parse(checked.schedule); } catch { /* Legacy free text remains supported. */ }
  const { data, error } = await actor.db.from("classes").insert({ ...checked, schedule, school_id: actor.schoolId, name: course.name }).select().single();
  if (error) throw error;
  return data;
}

export async function listClasses() {
  const actor = await requireSchoolActor(["admin"]);
  const { data, error } = await actor.db.from("classes").select("*, course:courses!classes_course_id_fkey(id, name), teacher:users!classes_teacher_id_fkey(id, full_name)")
    .eq("school_id", actor.schoolId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function classDetail(classId: string) {
  const actor = await requireClassAccess(id.parse(classId), "teach");
  const { data, error } = await actor.db.from("classes").select("*, course:courses!classes_course_id_fkey(id,name,mode), teacher:users!classes_teacher_id_fkey(id,full_name,email)").eq("id", classId).single();
  if (error) throw error;
  return data;
}

export async function updateSchedule(classId: string, text: string) {
  const actor = await requireClassAccess(id.parse(classId), "teach");
  const { error } = await actor.db.from("classes").update({ schedule: { text: z.string().max(5000).parse(text) } }).eq("id", classId);
  if (error) throw error;
}

export async function listEnrollments(classId: string) {
  const actor = await requireClassAccess(id.parse(classId), "teach");
  const { data, error } = await actor.db.from("enrollments").select("*, student:users!enrollments_student_id_fkey(id,full_name,email,phone)").eq("class_id", classId).order("enrolled_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function enroll(classId: string, studentId: string) {
  const actor = await requireSchoolActor(["admin"]);
  await requireClassAccess(id.parse(classId), "teach");
  await member(actor.db, actor.schoolId, studentId, "student");
  const { data, error } = await actor.db.rpc("enroll_school_student", { p_actor: actor.id, p_school: actor.schoolId, p_class: classId, p_student: studentId });
  if (error) throw error;
  return data;
}

export async function unenroll(enrollmentId: string, classId: string) {
  await requireSchoolActor(["admin"]);
  const actor = await requireClassAccess(id.parse(classId), "teach");
  const { data, error } = await actor.db.from("enrollments").update({ status: "dropped" })
    .eq("id", id.parse(enrollmentId)).eq("class_id", classId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new AccessError(404, "Không tìm thấy ghi danh trong lớp này.");
}

export async function listSchoolMembers(role: "teacher" | "student") {
  const actor = await requireSchoolActor(["admin", "teacher"]);
  const { data: memberships, error: membershipError } = await actor.db.from("school_memberships").select("user_id").eq("school_id", actor.schoolId).eq("role", role).eq("status", "active");
  if (membershipError) throw membershipError;
  if (!memberships?.length) return [];
  const { data, error } = await actor.db.from("users").select("id,full_name,email").in("id", memberships.map(m => m.user_id)).order("full_name");
  if (error) throw error;
  return data || [];
}
