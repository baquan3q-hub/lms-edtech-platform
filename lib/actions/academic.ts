"use server";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AccessError } from "@/lib/auth/actor-context";
import * as academic from "@/lib/modules/academic/service";

async function run<T>(work: () => Promise<T>, path?: string) {
  try {
    const data = await work();
    if (path) revalidatePath(path);
    return { data, error: null, success: true };
  } catch (error: unknown) {
        unstable_rethrow(error);
    return { data: null, error: error instanceof AccessError ? error.message : "Không thể xử lý dữ liệu học vụ. Vui lòng kiểm tra và thử lại.", success: false };
  }
}
export async function fetchCourses() {
  return run(() => academic.listCatalog("courses", undefined, undefined, "*, teacher:users!courses_teacher_id_fkey(id,full_name)"));
}
export async function createCourse(formData: { name: string; description?: string; teacher_id: string }) {
  return run(() => academic.createCourseRecord(formData), "/admin/courses");
}
export async function fetchClasses() { return run(() => academic.listClasses()); }
export async function createClass(formData: { course_id: string; teacher_id: string; room: string; schedule: string; max_students: number }) {
  return run(() => academic.createClassRecord(formData), "/admin/classes");
}
export async function fetchClassDetail(classId: string) { return run(() => academic.classDetail(classId)); }
export async function updateClassSchedule(classId: string, scheduleText: string) {
  return run(() => academic.updateSchedule(classId, scheduleText), `/admin/classes/${classId}`);
}
export async function fetchEnrollments(classId: string) { return run(() => academic.listEnrollments(classId)); }
export async function enrollStudent(classId: string, studentId: string) {
  return run(() => academic.enroll(classId, studentId), `/admin/classes/${classId}`);
}
export async function unenrollStudent(enrollmentId: string, classId: string) {
  return run(() => academic.unenroll(enrollmentId, classId), `/admin/classes/${classId}`);
}
export async function fetchTeachers() { return run(() => academic.listSchoolMembers("teacher")); }
export async function fetchStudents() { return run(() => academic.listSchoolMembers("student")); }
export async function fetchCoursesForSelect() { return run(() => academic.listCatalog("courses", undefined, undefined, "id,name")); }
export async function fetchAcademicYears(schoolId?: string) { return run(() => academic.listCatalog("academic_years", schoolId)); }
export async function fetchTerms(academicYearId?: string) { return run(() => academic.listCatalog("terms", undefined, academicYearId)); }
export async function fetchGradeLevels(schoolId?: string) { return run(() => academic.listCatalog("grade_levels", schoolId)); }
export async function fetchSubjects(schoolId?: string) { return run(() => academic.listCatalog("subjects", schoolId)); }
export async function fetchHomerooms(academicYearId?: string) {
  return run(() => academic.listCatalog("homerooms", undefined, academicYearId, "*,grade_level:grade_levels(id,level,name),academic_year:academic_years(id,name,code)"));
}
