/**
 * Dữ liệu trường THCS Nguyễn Du (Pilot), dựng lại từ supabase/seed_30_students_pilot.sql
 * cho schema sau ngày 04/11/2026. Mọi id đều cố định nên chạy lại không tạo bản ghi trùng.
 * Không chứa mật khẩu.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export const NDU_SCHOOL_ID = "00000000-0000-0000-0001-000000000000";
export const NDU_SCHOOL_CODE = "THCS-NDU";

// Thầy Long không có trong file seed; lấy id, họ tên, điện thoại từ docs/backup/live_snapshot_2026-09-26.json.
const ADMIN = { id: "f799268b-c2e6-4178-a227-c9c732f1b12d", email: "thaylongcngd@gmail.com", role: "admin", full_name: "Thầy Long Công Nghệ", phone: "0886668888" };

const ids = {
  year: "00000000-0000-0010-0000-000000000001",
  term1: "00000000-0000-0010-0000-000000000011",
  term2: "00000000-0000-0010-0000-000000000012",
  grade9: "00000000-0000-0010-0000-000000000009",
  subject: "00000000-0000-0010-0000-000000000021",
  homeroom: "00000000-0000-0010-0000-000000000031",
  course: "00000000-0000-0010-0000-000000000041",
  room: "00000000-0000-0010-0000-000000000051",
  classPrimary: "00000000-0000-0010-0000-000000000061",
  homeroomHead: "00000000-0000-0010-0000-000000000071",
  class9A1: "00000000-0000-0030-0000-000000000901",
  session: "00000000-0000-0055-0000-000000000999",
};
const suffix = (n) => String(n).padStart(12, "0");

const uuid = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
const str = "'((?:[^']|'')*)'";

function section(sql, from, to) {
  const start = sql.indexOf(from);
  const end = sql.indexOf(to, start + from.length);
  if (start < 0 || end < 0) throw new Error(`Seed section not found: ${from}`);
  return sql.slice(start, end);
}
const unquote = (s) => s.replace(/''/g, "'");

export function parseSeed(sql) {
  const users = [...section(sql, "-- [B]", "-- [E]").matchAll(new RegExp(`\\('${uuid}', ${str}, '(teacher|student|parent)', ${str}, ${str}\\)`, "g"))]
    .map(([, id, email, role, full_name, phone]) => ({ id, email: unquote(email), role, full_name: unquote(full_name), phone }));
  const codes = [...section(sql, "-- [F]", "-- [G]").matchAll(new RegExp(`'${uuid}', '(HS\\d+)'`, "g"))]
    .map(([, user_id, student_code]) => ({ user_id, student_code }));
  const links = [...section(sql, "-- [H]", "-- [I]").matchAll(new RegExp(`\\('${uuid}', '${uuid}', '${uuid}', ${str}, (true|false)`, "g"))]
    .map(([, id, parent_id, student_id, relationship, primary]) => ({ id, parent_id, student_id, relationship: unquote(relationship), is_primary: primary === "true" }));
  const attendance = [...section(sql, "-- 2. Chi tiết điểm danh", "-- [K]").matchAll(new RegExp(`\\('${uuid}', '${uuid}', '${uuid}', '(present|late|excused|absent)', ${str}`, "g"))]
    .map(([, id, , student_id, status, note]) => ({ id, student_id, status, note: unquote(note) }));
  return { users, codes, links, attendance };
}

export function loadSeed(root) {
  return parseSeed(readFileSync(path.join(root, "supabase/seed_30_students_pilot.sql"), "utf8"));
}

/** Danh sách bảng theo thứ tự ghi. Mỗi bảng ghi bằng upsert theo `onConflict`. */
export function buildNguyenDuImport(seed, today) {
  const accounts = [ADMIN, ...seed.users];
  const count = (role) => accounts.filter((a) => a.role === role).length;
  if (count("admin") !== 1 || count("teacher") !== 5 || count("student") !== 30 || count("parent") !== 30) throw new Error("Seed Nguyễn Du không đủ 1 admin, 5 GV, 30 HS, 30 PH");
  if (new Set(accounts.map((a) => a.id)).size !== accounts.length || new Set(accounts.map((a) => a.email)).size !== accounts.length) throw new Error("Seed Nguyễn Du có id hoặc email trùng");
  if (seed.codes.length !== 30 || seed.links.length !== 30 || seed.attendance.length !== 30) throw new Error("Seed Nguyễn Du thiếu mã HS, liên kết PH hoặc điểm danh");

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const students = accounts.filter((a) => a.role === "student");
  for (const x of [...seed.codes.map((c) => c.user_id), ...seed.attendance.map((r) => r.student_id)]) if (byId.get(x)?.role !== "student") throw new Error(`Không phải học sinh: ${x}`);
  for (const l of seed.links) if (byId.get(l.parent_id)?.role !== "parent" || byId.get(l.student_id)?.role !== "student") throw new Error(`Liên kết sai: ${l.id}`);
  const teacher = accounts.find((a) => a.email === "gv.nam@nguyendu.edu.vn");
  const school_id = NDU_SCHOOL_ID;

  const tables = [
    ["schools", "id", [{ id: school_id, code: NDU_SCHOOL_CODE, name: "Trường THCS Nguyễn Du (Pilot)", address: "44 Hàng Quạt, Hoàn Kiếm, Hà Nội", status: "active", ai_enabled: true }]],
    ["users", "id", accounts.map(({ id, email, role, full_name, phone }) => ({ id, email, role, full_name, phone }))],
    ["school_memberships", "school_id,user_id,role", accounts.map((a) => ({ school_id, user_id: a.id, role: a.role, status: "active" }))],
    ["academic_years", "id", [{ id: ids.year, school_id, code: "2026-2027", name: "Năm học 2026–2027", start_date: "2026-09-01", end_date: "2027-05-31", is_current: true, status: "active" }]],
    ["terms", "id", [
      { id: ids.term1, school_id, academic_year_id: ids.year, code: "HK1", name: "Học kỳ 1", semester_order: 1, start_date: "2026-09-01", end_date: "2027-01-15", is_active: true },
      { id: ids.term2, school_id, academic_year_id: ids.year, code: "HK2", name: "Học kỳ 2", semester_order: 2, start_date: "2027-01-16", end_date: "2027-05-31", is_active: false },
    ]],
    ["grade_levels", "id", [{ id: ids.grade9, school_id, level: 9, code: "K9", name: "Khối 9", is_active: true }]],
    ["subjects", "id", [{ id: ids.subject, school_id, code: "ENG", name: "Tiếng Anh", department: "Ngoại ngữ", is_active: true }]],
    ["homerooms", "id", [{ id: ids.homeroom, school_id, academic_year_id: ids.year, grade_level_id: ids.grade9, code: "9A1", name: "Lớp 9A1", room: "Phòng 201 - Nhà A", status: "active" }]],
    ["rooms", "id", [{ id: ids.room, school_id, name: "Phòng 201 - Nhà A", capacity: 40 }]],
    ["courses", "id", [{ id: ids.course, school_id, name: "Tiếng Anh 9", description: "Chương trình Tiếng Anh khối 9", mode: "offline", teacher_id: teacher.id }]],
    ["classes", "id", [{ id: ids.class9A1, school_id, name: "Lớp 9A1 - THCS Nguyễn Du", course_id: ids.course, teacher_id: teacher.id, room: "Phòng 201 - Nhà A", max_students: 40, status: "active", term_id: ids.term1, subject_id: ids.subject, homeroom_id: ids.homeroom }]],
    ["class_teacher_assignments", "id", [{ id: ids.classPrimary, school_id, class_id: ids.class9A1, teacher_id: teacher.id, role: "primary_teacher", valid_from: "2026-09-01", status: "active" }]],
    ["homeroom_teacher_assignments", "id", [{ id: ids.homeroomHead, school_id, homeroom_id: ids.homeroom, teacher_id: teacher.id, academic_year_id: ids.year, role: "head_teacher", start_date: "2026-09-01", status: "active" }]],
    ["student_identifiers", "school_id,student_code", seed.codes.map((c) => ({ school_id, user_id: c.user_id, student_code: c.student_code, status: "active" }))],
    ["homeroom_enrollments", "school_id,student_id,academic_year_id", students.map((s) => ({ school_id, homeroom_id: ids.homeroom, student_id: s.id, academic_year_id: ids.year, start_date: "2026-09-01", status: "active" }))],
    ["enrollments", "id", students.map((s, i) => ({ id: `00000000-0000-0031-0000-${suffix(101 + i)}`, student_id: s.id, class_id: ids.class9A1, status: "active" }))],
    ["parent_students", "id", seed.links.map((l) => ({ ...l, school_id, verification_status: "verified", valid_from: "2026-09-01" }))],
    ["attendance_sessions", "id", [{ id: ids.session, class_id: ids.class9A1, teacher_id: teacher.id, session_date: today, status: "closed", note: "Điểm danh Lớp 9A1" }]],
    ["attendance_records", "id", seed.attendance.map((r) => ({ id: r.id, session_id: ids.session, student_id: r.student_id, status: r.status, note: r.note, marked_by: teacher.id, school_id }))],
  ];
  return { accounts, tables };
}
