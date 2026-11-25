/**
 * Thêm lại trường THCS Nguyễn Du (Pilot) vào một project đã có dữ liệu, không đụng trường khác.
 *
 *   node scripts/db/import-nguyendu-pilot.mjs <projectRef>            # chạy thử, chỉ đọc
 *   node scripts/db/import-nguyendu-pilot.mjs <projectRef> --apply    # tạo Auth + ghi dữ liệu
 *
 * Chạy lại an toàn: mọi bản ghi có id cố định và được upsert. Mật khẩu lưu ở
 * .local/nguyendu-accounts.json và .local/TAI_KHOAN_NGUYEN_DU.md, không in ra màn hình.
 */
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root } from "./bootstrap.mjs";
import { buildNguyenDuImport, loadSeed, NDU_SCHOOL_CODE, NDU_SCHOOL_ID } from "./nguyendu-pilot.mjs";

nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
const ref = process.argv[2];
const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ref || !/^[a-z]{20}$/.test(ref) || !url || new URL(url).hostname !== `${ref}.supabase.co`) throw new Error("Target project does not match local configuration");
if (!key) throw new Error("Server-side service key is required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const { accounts, tables } = buildNguyenDuImport(loadSeed(root), today);

// ---- Kiểm tra trước khi ghi: không được chạm vào dữ liệu của trường khác.
const problems = [];
const { data: schools, error: schoolErr } = await db.from("schools").select("id,code").or(`id.eq.${NDU_SCHOOL_ID},code.eq.${NDU_SCHOOL_CODE}`);
if (schoolErr) throw new Error(`schools: ${schoolErr.message}`);
if (schools.some((s) => s.id !== NDU_SCHOOL_ID || s.code !== NDU_SCHOOL_CODE)) problems.push("Mã THCS-NDU hoặc id trường đang thuộc về một trường khác");

const authUsers = [];
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Auth inventory failed (${error.status})`);
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}
const authByEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u.id]));
const authById = new Map(authUsers.map((u) => [u.id, u.email?.toLowerCase()]));
for (const a of accounts) {
  const idForEmail = authByEmail.get(a.email);
  if (idForEmail && idForEmail !== a.id) problems.push(`${a.email} đã có trong Auth với id khác`);
  const emailForId = authById.get(a.id);
  if (emailForId && emailForId !== a.email) problems.push(`id của ${a.email} đang thuộc ${emailForId}`);
}
const { data: publicUsers, error: usersErr } = await db.from("users").select("id,email").in("id", accounts.map((a) => a.id));
if (usersErr) throw new Error(`users: ${usersErr.message}`);
for (const u of publicUsers) if (u.email?.toLowerCase() !== accounts.find((a) => a.id === u.id).email) problems.push(`public.users ${u.id} thuộc email khác`);

// Bản ghi có id cố định phải chưa tồn tại hoặc đã thuộc Nguyễn Du.
const ownedBy = { classes: "school_id", courses: "school_id", rooms: "school_id", academic_years: "school_id", terms: "school_id", grade_levels: "school_id", subjects: "school_id", homerooms: "school_id", class_teacher_assignments: "school_id", homeroom_teacher_assignments: "school_id", parent_students: "school_id", attendance_records: "school_id" };
for (const [table, onConflict, rows] of tables) {
  if (onConflict !== "id" || !ownedBy[table]) continue;
  const { data, error } = await db.from(table).select(`id,${ownedBy[table]}`).in("id", rows.map((r) => r.id));
  if (error) throw new Error(`${table}: ${error.message}`);
  for (const r of data) if (r[ownedBy[table]] !== NDU_SCHOOL_ID) problems.push(`${table} ${r.id} thuộc trường khác`);
}
for (const [table, ids] of [["enrollments", tables.find(([t]) => t === "enrollments")[2].map((r) => r.id)], ["attendance_sessions", ["00000000-0000-0055-0000-000000000999"]]]) {
  const { data, error } = await db.from(table).select("id,class_id").in("id", ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  for (const r of data) if (r.class_id !== "00000000-0000-0030-0000-000000000901") problems.push(`${table} ${r.id} thuộc lớp khác`);
}

const missingAuth = accounts.filter((a) => !authByEmail.has(a.email));
const summary = { projectRef: ref, mode: apply ? "apply" : "dry-run", schoolExists: schools.length > 0, authToCreate: missingAuth.length, authExisting: accounts.length - missingAuth.length, rows: Object.fromEntries(tables.map(([t, , r]) => [t, r.length])), problems };
console.log(JSON.stringify(summary, null, 2));
if (problems.length) { process.exitCode = 1; throw new Error("Dừng: có xung đột, không ghi gì"); }
if (!apply) process.exit(0);

// ---- Mật khẩu: một mật khẩu ngẫu nhiên dùng chung cho tài khoản test của trường, giữ nguyên giữa các lần chạy.
const location = path.join(root, ".local/nguyendu-accounts.json");
mkdirSync(path.dirname(location), { recursive: true });
const manifest = existsSync(location) ? JSON.parse(readFileSync(location, "utf8")) : { projectRef: ref, createdAt: new Date().toISOString(), password: `Ndu-${randomBytes(9).toString("base64url")}7!` };
if (manifest.projectRef !== ref) throw new Error("Credential manifest belongs to another project");
writeFileSync(location, JSON.stringify(manifest, null, 2), { mode: 0o600 });

const codeOf = new Map(tables.find(([t]) => t === "student_identifiers")[2].map((r) => [r.user_id, r.student_code]));
const childOf = new Map(tables.find(([t]) => t === "parent_students")[2].map((r) => [r.parent_id, r.student_id]));
const byId = new Map(accounts.map((a) => [a.id, a]));
const label = { admin: "Quản trị", teacher: "Giáo viên", student: "Học sinh", parent: "Phụ huynh" };
writeFileSync(path.join(root, ".local/TAI_KHOAN_NGUYEN_DU.md"), [
  "# Tài khoản trường THCS Nguyễn Du (Pilot) — chỉ lưu trên máy, không đưa lên Git",
  "",
  `Project: ${ref}. Nhập lại ngày ${today} bằng scripts/db/import-nguyendu-pilot.mjs.`,
  `Mật khẩu chung cho mọi tài khoản dưới đây: \`${manifest.password}\``,
  "Học sinh đăng nhập bằng email hoặc mã dạng THCS-NDU:HS101. Lớp 9A1 do thầy Lê Hoàng Nam dạy (môn Tiếng Anh) và chủ nhiệm.",
  "Email @nguyendu.edu.vn là địa chỉ giả, không nhận được email khôi phục mật khẩu.",
  "",
  "| Vai trò | Họ tên | Email | Mã HS | Con |", "|---|---|---|---|---|",
  ...accounts.map((a) => `| ${label[a.role]} | ${a.full_name} | ${a.email} | ${codeOf.get(a.id) ?? ""} | ${childOf.has(a.id) ? byId.get(childOf.get(a.id)).full_name : ""} |`),
  "",
].join("\n"), { mode: 0o600 });

// ---- Auth: tạo tài khoản còn thiếu với đúng id của seed.
let created = 0;
for (const a of missingAuth) {
  const { error } = await db.auth.admin.createUser({ id: a.id, email: a.email, password: manifest.password, email_confirm: true, user_metadata: { full_name: a.full_name } });
  if (error) throw new Error(`Tạo Auth thất bại ở ${a.email} (${error.status ?? "?"}: ${error.message}). Chạy lại để tiếp tục.`);
  if (++created % 10 === 0) console.log(JSON.stringify({ authCreated: created, of: missingAuth.length }));
}

// ---- Dữ liệu: upsert từng bảng theo thứ tự khoá ngoại.
for (const [table, onConflict, rows] of tables) {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`Ghi ${table} thất bại: ${error.message}. Chạy lại sau khi sửa; các bảng trước đã ghi xong.`);
  console.log(JSON.stringify({ table, upserted: rows.length }));
}
console.log(JSON.stringify({ done: true, authCreated: created, credentialsFile: ".local/TAI_KHOAN_NGUYEN_DU.md" }));
