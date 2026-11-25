"use server";

// Số liệu dashboard admin. Mọi hàm export đều là Server Action công khai, nên mỗi hàm tự gọi
// requireSchoolActor(["admin"]) rồi mới dùng db (admin client, bỏ qua RLS). Mọi query đều lọc theo
// school_id của actor: trực tiếp với bảng có cột school_id (classes, courses, homework, exams,
// invoices, audit_events, school_memberships), còn lại qua embed `!inner` tới classes/homework/
// exams/school_memberships. Không lọc bằng school_id riêng của attendance_records,
// student_activity_logs, exam_submissions vì các luồng ghi chính chưa điền cột đó.
// Test: tests/unit/admin_dashboard_scope.test.ts.

import { requireSchoolActor } from "@/lib/auth/authorize";

type Db = Awaited<ReturnType<typeof requireSchoolActor>>["db"];
type Row = Record<string, any>;
type QueryResult = { data: Row[] | null; error: { message?: string } | null; count?: number | null };
type PageQuery = (from: number, to: number, withCount: boolean) => PromiseLike<QueryResult>;

const PAGE_SIZE = 1000; // max-rows mặc định của PostgREST
const MAX_ROWS = 50_000; // trần mỗi query, có cảnh báo khi chạm trần
const PAGE_CONCURRENCY = 6;
const VN_TZ = "Asia/Ho_Chi_Minh";
const HOUR_MS = 60 * 60 * 1000;

// ============================================================
// HÀM HỖ TRỢ (không export: file "use server" coi mọi hàm async export là endpoint)
// ============================================================

function fail(label: string, error: { message?: string } | null): never {
    console.error(`[admin-analytics] ${label}:`, error?.message);
    throw new Error("Không tải được dữ liệu thống kê. Vui lòng thử lại.");
}

/** Đọc đủ mọi trang (trang đầu kèm count, các trang sau chạy song song có giới hạn). */
async function fetchAllRows(label: string, page: PageQuery): Promise<Row[]> {
    const first = await page(0, PAGE_SIZE - 1, true);
    if (first.error) fail(label, first.error);
    const rows = [...(first.data ?? [])];
    const total = first.count ?? rows.length;
    const target = Math.min(total, MAX_ROWS);
    const step = rows.length;
    if (step > 0 && rows.length < target) {
        const starts: number[] = [];
        for (let from = step; from < target; from += step) starts.push(from);
        for (let i = 0; i < starts.length; i += PAGE_CONCURRENCY) {
            const batch = await Promise.all(
                starts.slice(i, i + PAGE_CONCURRENCY).map((from) => page(from, Math.min(from + step, target) - 1, false)),
            );
            for (const result of batch) {
                if (result.error) fail(label, result.error);
                for (const row of result.data ?? []) rows.push(row);
            }
        }
    }
    if (total > MAX_ROWS) console.warn(`[admin-analytics] ${label}: có ${total} dòng, chỉ đọc ${MAX_ROWS}.`);
    return rows;
}

/** Tạo PageQuery: select → filter → order("id") → range. */
function paged(db: Db, table: string, columns: string, filter: (query: any) => any): PageQuery {
    return (from, to, withCount) =>
        filter(db.from(table).select(columns, withCount ? { count: "exact" } : undefined)).order("id").range(from, to);
}

async function countRows(label: string, query: PromiseLike<QueryResult>): Promise<number> {
    const { count, error } = await query;
    if (error) fail(label, error);
    return count ?? 0;
}

function one<T>(value: T | T[] | null | undefined): T | undefined {
    return Array.isArray(value) ? value[0] : value ?? undefined;
}

const vnDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: VN_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

function vnDate(at: Date = new Date()): string {
    return vnDateFormat.format(at);
}

function vnDayStartIso(date: string): string {
    return new Date(`${date}T00:00:00+07:00`).toISOString();
}

function isIsoDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function shiftDate(date: string, unit: "day" | "month" | "year", amount: number): string {
    const [y, m, d] = date.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    if (unit === "day") t.setUTCDate(t.getUTCDate() + amount);
    else if (unit === "month") t.setUTCMonth(t.getUTCMonth() + amount);
    else t.setUTCFullYear(t.getUTCFullYear() + amount);
    return t.toISOString().slice(0, 10);
}

/** Mốc bắt đầu của bộ lọc thời gian, tính theo ngày Việt Nam. null = toàn bộ. */
function getStartForRange(range: unknown): { date: string; iso: string } | null {
    const today = vnDate();
    let date: string;
    switch (range) {
        case "today": date = today; break;
        case "week": date = shiftDate(today, "day", -7); break;
        case "month": date = shiftDate(today, "month", -1); break;
        case "quarter": date = shiftDate(today, "month", -3); break;
        case "year": date = shiftDate(today, "year", -1); break;
        default: return null;
    }
    return { date, iso: vnDayStartIso(date) };
}

function vnTime(at: Date): string {
    return at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: VN_TZ });
}

function vnDayMonth(at: Date): string {
    return at.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: VN_TZ });
}

function detectGradeLevel(className?: string): string {
    if (!className) return "Khối khác";
    const clean = className.trim().toUpperCase();
    if (clean.includes("12")) return "Khối 12";
    if (clean.includes("11")) return "Khối 11";
    if (clean.includes("10")) return "Khối 10";
    if (clean.includes("9")) return "Khối 9";
    if (clean.includes("8")) return "Khối 8";
    if (clean.includes("7")) return "Khối 7";
    if (clean.includes("6")) return "Khối 6";
    if (clean.includes("K01")) return "Khối 10";
    if (clean.includes("K02")) return "Khối 11";
    return "Khối chung";
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
}

function scoreStats(scores: number[]) {
    if (scores.length === 0) return { max: 0, min: 0, avg: 0 };
    let max = -Infinity;
    let min = Infinity;
    let sum = 0;
    for (const s of scores) {
        if (s > max) max = s;
        if (s < min) min = s;
        sum += s;
    }
    return { max, min, avg: Number((sum / scores.length).toFixed(1)) };
}

// ============================================================
// THẺ SỐ LIỆU ĐẦU TRANG
// ============================================================

export async function fetchAdminSchoolStats() {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    const [totalUsers, totalCourses, activeClasses] = await Promise.all([
        // Người dùng thuộc trường = có ít nhất một membership với trường (đếm user, không đếm membership).
        countRows("stats:users", db.from("users").select("id, school_memberships!inner(school_id)", { count: "exact", head: true })
            .eq("school_memberships.school_id", schoolId)),
        countRows("stats:courses", db.from("courses").select("id", { count: "exact", head: true }).eq("school_id", schoolId)),
        countRows("stats:classes", db.from("classes").select("id", { count: "exact", head: true })
            .eq("school_id", schoolId).eq("status", "active")),
    ]);
    return { totalUsers, totalCourses, activeClasses };
}

/**
 * Số người dùng của trường có hoạt động ghi nhận trong DB từ 00:00 hôm nay (giờ VN):
 * phiên học (learning_sessions), nộp bài tập/bài kiểm tra, điểm danh (người điểm danh), audit_events.
 */
export async function fetchDailyActiveUsers() {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    const since = vnDayStartIso(vnDate());

    const sources = await Promise.all([
        fetchAllRows("active:learning_sessions", paged(db, "learning_sessions", "id, student_id, users!inner(school_memberships!inner(school_id))",
            (q) => q.eq("users.school_memberships.school_id", schoolId).gte("last_seen_at", since))),
        fetchAllRows("active:homework_submissions", paged(db, "homework_submissions", "id, student_id, homework!inner(school_id)",
            (q) => q.eq("homework.school_id", schoolId).gte("submitted_at", since))),
        fetchAllRows("active:submissions", paged(db, "submissions", "id, student_id, assignments!inner(classes!inner(school_id))",
            (q) => q.eq("assignments.classes.school_id", schoolId).gte("submitted_at", since))),
        fetchAllRows("active:exam_submissions", paged(db, "exam_submissions", "id, student_id, exams!inner(school_id)",
            (q) => q.eq("exams.school_id", schoolId).gte("submitted_at", since))),
        fetchAllRows("active:attendance_records", paged(db, "attendance_records", "id, marked_by, attendance_sessions!inner(classes!inner(school_id))",
            (q) => q.eq("attendance_sessions.classes.school_id", schoolId).gte("marked_at", since))),
        fetchAllRows("active:audit_events", paged(db, "audit_events", "id, actor_id",
            (q) => q.eq("school_id", schoolId).gte("created_at", since))),
    ]);

    const ids = new Set<string>();
    for (const rows of sources) {
        for (const row of rows) {
            const id = row.student_id ?? row.marked_by ?? row.actor_id;
            if (id) ids.add(id);
        }
    }
    return ids.size;
}

// ============================================================
// BIỂU ĐỒ THEO KHOẢNG THỜI GIAN (đầu vào cho khung đánh giá AI)
// ============================================================

type ChartDatum = Record<string, string | number>;

async function loadAttendanceByDay(db: Db, schoolId: string, range: unknown): Promise<ChartDatum[]> {
    const start = getStartForRange(range);
    const [sessions, records] = await Promise.all([
        fetchAllRows("attendance:sessions", paged(db, "attendance_sessions", "id, session_date, classes!inner(school_id)", (q) => {
            const scoped = q.eq("classes.school_id", schoolId);
            return start ? scoped.gte("session_date", start.date) : scoped;
        })),
        fetchAllRows("attendance:records", paged(db, "attendance_records", "id, session_id, status, attendance_sessions!inner(session_date, classes!inner(school_id))", (q) => {
            const scoped = q.eq("attendance_sessions.classes.school_id", schoolId);
            return start ? scoped.gte("attendance_sessions.session_date", start.date) : scoped;
        })),
    ]);
    if (sessions.length === 0) return [];

    const bySession = new Map<string, { present: number; absent: number }>();
    for (const record of records) {
        const counts = bySession.get(record.session_id) ?? { present: 0, absent: 0 };
        if (record.status === "present") counts.present++;
        else if (record.status === "absent" || record.status === "excused" || record.status === "late") counts.absent++;
        bySession.set(record.session_id, counts);
    }

    const byDate = new Map<string, { present: number; absent: number }>();
    const sorted = [...sessions].sort((a, b) => String(a.session_date).localeCompare(String(b.session_date)));
    for (const session of sorted) {
        const counts = byDate.get(session.session_date) ?? { present: 0, absent: 0 };
        const sessionCounts = bySession.get(session.id);
        counts.present += sessionCounts?.present ?? 0;
        counts.absent += sessionCounts?.absent ?? 0;
        byDate.set(session.session_date, counts);
    }

    return Array.from(byDate.entries()).map(([date, counts]) => {
        const total = counts.present + counts.absent;
        return {
            name: date.slice(5), // mm-dd
            rate: total > 0 ? Math.round((counts.present / total) * 100) : 0,
            present: counts.present,
            absent: counts.absent,
        };
    });
}

/**
 * Phổ điểm: điểm ≤ 10 được quy về thang 100 (×10). Đếm thẳng trong DB theo từng mức.
 * submissions.score là INTEGER nên mốc 6.5 tương đương 7.
 */
function scoreBuckets(integerScore: boolean) {
    const half = integerScore ? "7" : "6.5";
    return [
        { name: "Cần cố gắng", fill: "#ef4444", filter: "score.lt.5,and(score.gt.10,score.lt.50)" },
        { name: "Trung bình", fill: "#f59e0b", filter: `and(score.gte.5,score.lt.${half}),and(score.gte.50,score.lt.65)` },
        { name: "Khá", fill: "#3b82f6", filter: `and(score.gte.${half},score.lt.8),and(score.gte.65,score.lt.80)` },
        { name: "Khá Giỏi", fill: "#10b981", filter: "and(score.gte.8,score.lte.10),score.gte.80" },
    ];
}

async function loadGradesDistribution(db: Db, schoolId: string, range: unknown): Promise<ChartDatum[]> {
    const start = getStartForRange(range);
    const counts = await Promise.all(
        [0, 1, 2, 3].map(async (i) => {
            const subBucket = scoreBuckets(true)[i];
            const examBucket = scoreBuckets(false)[i];
            let subQuery = db.from("submissions").select("id, assignments!inner(classes!inner(school_id))", { count: "exact", head: true })
                .eq("assignments.classes.school_id", schoolId).or(subBucket.filter);
            let examQuery = db.from("exam_submissions").select("id, exams!inner(school_id)", { count: "exact", head: true })
                .eq("exams.school_id", schoolId).or(examBucket.filter);
            if (start) {
                subQuery = subQuery.gte("submitted_at", start.iso);
                examQuery = examQuery.gte("submitted_at", start.iso);
            }
            const [a, b] = await Promise.all([countRows("grades:submissions", subQuery), countRows("grades:exam_submissions", examQuery)]);
            return { name: subBucket.name, count: a + b, fill: subBucket.fill };
        }),
    );
    return counts.filter((item) => item.count > 0);
}

async function loadSubmissionStatus(db: Db, schoolId: string, range: unknown): Promise<ChartDatum[]> {
    const start = getStartForRange(range);
    const [assignments, exams, enrollments, subGraded, subPending, examGraded, examPending] = await Promise.all([
        fetchAllRows("status:assignments", paged(db, "assignments", "id, class_id, classes!inner(school_id)", (q) => {
            const scoped = q.eq("classes.school_id", schoolId);
            return start ? scoped.gte("created_at", start.iso) : scoped;
        })),
        fetchAllRows("status:exams", paged(db, "exams", "id, class_id", (q) => {
            const scoped = q.eq("school_id", schoolId);
            return start ? scoped.gte("created_at", start.iso) : scoped;
        })),
        fetchAllRows("status:enrollments", paged(db, "enrollments", "id, class_id, classes!inner(school_id)",
            (q) => q.eq("classes.school_id", schoolId))),
        ...[true, false].map((graded) => {
            let q = db.from("submissions").select("id, assignments!inner(created_at, classes!inner(school_id))", { count: "exact", head: true })
                .eq("assignments.classes.school_id", schoolId);
            q = graded ? q.not("score", "is", null) : q.is("score", null);
            if (start) q = q.gte("assignments.created_at", start.iso);
            return countRows("status:submissions", q);
        }),
        ...[true, false].map((graded) => {
            let q = db.from("exam_submissions").select("id, exams!inner(created_at, school_id)", { count: "exact", head: true })
                .eq("exams.school_id", schoolId);
            q = graded ? q.not("score", "is", null) : q.is("score", null);
            if (start) q = q.gte("exams.created_at", start.iso);
            return countRows("status:exam_submissions", q);
        }),
    ]);

    if (assignments.length === 0 && exams.length === 0) return [];

    const enrollmentCount = new Map<string, number>();
    for (const e of enrollments as Row[]) enrollmentCount.set(e.class_id, (enrollmentCount.get(e.class_id) ?? 0) + 1);

    let expected = 0;
    for (const item of [...assignments, ...exams] as Row[]) expected += enrollmentCount.get(item.class_id) ?? 0;

    const graded = (subGraded as number) + (examGraded as number);
    const pending = (subPending as number) + (examPending as number);
    const missing = Math.max(0, expected - (graded + pending));

    const result: ChartDatum[] = [];
    if (graded > 0) result.push({ name: "Đã chấm điểm", value: graded, fill: "#10b981" });
    if (pending > 0) result.push({ name: "Chờ chấm điểm", value: pending, fill: "#f59e0b" });
    if (missing > 0) result.push({ name: "Chưa nộp bài", value: missing, fill: "#ef4444" });
    return result;
}

export async function fetchDailyAttendanceData(range: string = "all") {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    return loadAttendanceByDay(db, schoolId, range);
}

export async function fetchGradesDistribution(range: string = "all") {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    return loadGradesDistribution(db, schoolId, range);
}

export async function fetchSubmissionStatus(range: string = "all") {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    return loadSubmissionStatus(db, schoolId, range);
}

/** Ba bộ số liệu khung đánh giá AI cần; chỉ tải khi admin bấm nút. */
export async function fetchAdminInsightInputs(range: string = "all") {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    const [attendanceData, gradesData, submissionData] = await Promise.all([
        loadAttendanceByDay(db, schoolId, range),
        loadGradesDistribution(db, schoolId, range),
        loadSubmissionStatus(db, schoolId, range),
    ]);
    return { attendanceData, gradesData, submissionData };
}

// ============================================================
// DOANH THU
// ============================================================

export async function fetchMonthlyRevenueData() {
    const { db, schoolId } = await requireSchoolActor(["admin"]);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [paidInvoices, pendingInvoices] = await Promise.all([
        fetchAllRows("revenue:paid", paged(db, "invoices", "id, amount, paid_at, status",
            (q) => q.eq("school_id", schoolId).eq("status", "paid").gte("paid_at", twelveMonthsAgo.toISOString()))),
        fetchAllRows("revenue:pending", paged(db, "invoices", "id, amount, status, due_date",
            (q) => q.eq("school_id", schoolId).in("status", ["unpaid", "overdue", "pending"]))),
    ]);

    const monthNames = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthMap = new Map<string, { paid: number; count: number }>();
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthMap.set(monthKey(d), { paid: 0, count: 0 });
    }

    for (const inv of paidInvoices) {
        if (!inv.paid_at) continue;
        const existing = monthMap.get(monthKey(new Date(inv.paid_at)));
        if (existing) {
            existing.paid += Number(inv.amount) || 0;
            existing.count += 1;
        }
    }

    const chartData = Array.from(monthMap.entries()).map(([key, val]) => ({
        month: monthNames[parseInt(key.split("-")[1]) - 1],
        revenue: val.paid,
        count: val.count,
    }));

    return {
        chartData,
        summary: {
            totalPaid: paidInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0),
            totalPending: pendingInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0),
            overdueCount: pendingInvoices.filter((inv) => inv.status === "overdue").length,
            paidCount: paidInvoices.length,
            pendingCount: pendingInvoices.length,
        },
    };
}

// ============================================================
// BUỔI ĐIỂM DANH TRONG NGÀY
// ============================================================

export async function fetchAdminAttendanceSessionsToday(todayDateStr: string) {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    if (!isIsoDate(todayDateStr)) throw new Error("Ngày không hợp lệ.");

    const [sessions, records] = await Promise.all([
        fetchAllRows("sessions:sessions", paged(db, "attendance_sessions",
            "id, class_id, session_date, status, start_time, end_time, classes!inner(name, teacher_id, school_id, teacher:users!teacher_id(full_name))",
            (q) => q.eq("classes.school_id", schoolId).eq("session_date", todayDateStr))),
        fetchAllRows("sessions:records", paged(db, "attendance_records", "id, session_id, status, attendance_sessions!inner(session_date, classes!inner(school_id))",
            (q) => q.eq("attendance_sessions.classes.school_id", schoolId).eq("attendance_sessions.session_date", todayDateStr))),
    ]);
    if (sessions.length === 0) return [];

    const counts = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();
    for (const r of records) {
        const c = counts.get(r.session_id) ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
        c.total++;
        if (r.status === "present") c.present++;
        else if (r.status === "absent") c.absent++;
        else if (r.status === "late") c.late++;
        else if (r.status === "excused") c.excused++;
        counts.set(r.session_id, c);
    }

    const sorted = [...sessions].sort((a, b) => String(a.start_time ?? "~").localeCompare(String(b.start_time ?? "~")));
    return sorted.map((session) => {
        const classObj = one<Row>(session.classes);
        const teacherName = one<Row>(classObj?.teacher)?.full_name;
        const c = counts.get(session.id) ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
        const relevantTotal = c.present + c.absent + c.excused;
        return {
            sessionId: session.id,
            classId: session.class_id,
            className: classObj?.name || "N/A",
            teacherName: teacherName || "N/A",
            startTime: session.start_time,
            endTime: session.end_time,
            status: session.status,
            attendanceRate: relevantTotal > 0 ? ((c.present / relevantTotal) * 100).toFixed(1) : "—",
            presentCount: c.present,
            absentCount: c.absent,
            lateCount: c.late,
            excusedCount: c.excused,
            totalStudents: c.total,
        };
    });
}

// ============================================================
// 1. TRẠNG THÁI ĐIỂM DANH KÈM THỜI GIAN & THỜI GIAN TRUY CẬP HỆ THỐNG
// ============================================================
export interface StudentPresenceRecord {
    id: string;
    studentId: string;
    fullName: string;
    email: string;
    className: string;
    gradeName: string;
    attendanceStatus: "present" | "absent" | "late" | "excused" | "unmarked";
    markedAt: string | null;
    markedTimeStr: string;
    lastSignInAt: string | null;
    lastSignInTimeStr: string;
    isOnline: boolean;
    notes?: string | null;
}

export interface DailyPresenceSummary {
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    onlineCount: number;
    attendanceRate: number;
    records: StudentPresenceRecord[];
}

/**
 * Học sinh đang hoạt động của trường, lớp (enrollment active), điểm danh của các buổi trong ngày
 * và lần truy cập LMS gần nhất trong 24 giờ qua (learning_sessions.last_seen_at).
 */
export async function fetchDailyStudentPresenceAndAttendance(dateStr?: string): Promise<DailyPresenceSummary> {
    const { db, schoolId } = await requireSchoolActor(["admin"]);
    const today = dateStr ?? vnDate();
    if (!isIsoDate(today)) throw new Error("Ngày không hợp lệ.");
    const nowMs = Date.now();
    const activeSince = new Date(nowMs - 24 * HOUR_MS).toISOString();

    const [members, enrollments, attendance, sessions] = await Promise.all([
        fetchAllRows("presence:students", paged(db, "school_memberships", "id, user_id, users(id, full_name, email)",
            (q) => q.eq("school_id", schoolId).eq("role", "student").eq("status", "active"))),
        fetchAllRows("presence:enrollments", paged(db, "enrollments", "id, student_id, classes!inner(name, school_id)",
            (q) => q.eq("classes.school_id", schoolId).eq("status", "active"))),
        fetchAllRows("presence:attendance", paged(db, "attendance_records", "id, student_id, status, marked_at, note, attendance_sessions!inner(session_date, classes!inner(school_id))",
            (q) => q.eq("attendance_sessions.classes.school_id", schoolId).eq("attendance_sessions.session_date", today))),
        fetchAllRows("presence:learning_sessions", paged(db, "learning_sessions", "id, student_id, last_seen_at, users!inner(school_memberships!inner(school_id))",
            (q) => q.eq("users.school_memberships.school_id", schoolId).gte("last_seen_at", activeSince))),
    ]);

    const studentClass = new Map<string, string>();
    for (const e of enrollments) {
        const name = one<Row>(e.classes)?.name;
        if (name && !studentClass.has(e.student_id)) studentClass.set(e.student_id, name);
    }

    const lastActive = new Map<string, string>();
    for (const s of sessions) {
        const prev = lastActive.get(s.student_id);
        if (s.last_seen_at && (!prev || new Date(s.last_seen_at) > new Date(prev))) lastActive.set(s.student_id, s.last_seen_at);
    }

    // Bản ghi điểm danh mới nhất (theo marked_at) của mỗi học sinh trong ngày.
    const latestAttendance = new Map<string, Row>();
    for (const rec of attendance) {
        const prev = latestAttendance.get(rec.student_id);
        const recTime = rec.marked_at ? new Date(rec.marked_at).getTime() : -Infinity;
        const prevTime = prev?.marked_at ? new Date(prev.marked_at).getTime() : -Infinity;
        if (!prev || recTime > prevTime) latestAttendance.set(rec.student_id, rec);
    }

    const students = new Map<string, Row>();
    for (const m of members) {
        if (!students.has(m.user_id)) students.set(m.user_id, one<Row>(m.users) ?? { id: m.user_id });
    }

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let onlineCount = 0;

    const records: StudentPresenceRecord[] = Array.from(students.entries()).map(([studentId, stu]) => {
        const className = studentClass.get(studentId) || "Chưa xếp lớp";
        const att = latestAttendance.get(studentId);

        let status: StudentPresenceRecord["attendanceStatus"] = "unmarked";
        let markedAt: string | null = null;
        let markedTimeStr = "Chưa ghi nhận";
        if (att) {
            status = att.status as StudentPresenceRecord["attendanceStatus"];
            markedAt = att.marked_at;
            if (att.marked_at) markedTimeStr = vnTime(new Date(att.marked_at));
        }

        if (status === "present") presentCount++;
        else if (status === "absent") absentCount++;
        else if (status === "late") lateCount++;
        else if (status === "excused") excusedCount++;

        const lastActiveIso = lastActive.get(studentId) ?? null;
        let lastSignInTimeStr = "Chưa đăng nhập";
        let isOnline = false;
        if (lastActiveIso) {
            const at = new Date(lastActiveIso);
            if ((nowMs - at.getTime()) / HOUR_MS <= 12) {
                isOnline = true;
                onlineCount++;
                lastSignInTimeStr = vnTime(at);
            } else {
                lastSignInTimeStr = `${vnDayMonth(at)} ${vnTime(at)}`;
            }
        }

        return {
            id: att?.id || studentId,
            studentId,
            fullName: stu.full_name || "Học sinh",
            email: stu.email || "",
            className,
            gradeName: detectGradeLevel(className),
            attendanceStatus: status,
            markedAt,
            markedTimeStr,
            lastSignInAt: lastActiveIso,
            lastSignInTimeStr,
            isOnline,
            notes: att?.note || null,
        };
    });

    const accountedTotal = presentCount + absentCount + lateCount + excusedCount;
    return {
        totalStudents: records.length,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        onlineCount,
        attendanceRate: accountedTotal > 0 ? Math.round((presentCount / accountedTotal) * 100) : 0,
        records,
    };
}

// ============================================================
// 2. TỶ LỆ HOÀN THÀNH BÀI TẬP THEO KHỐI & LỚP
// ============================================================
export interface ClassHomeworkCompletion {
    classId: string;
    className: string;
    gradeName: string;
    homeworkCount: number;
    completedStudents: number;
    totalStudents: number;
    completionRate: number;
    status: "Đạt chuẩn" | "Cần đôn đốc" | "Chưa giao bài";
}

export interface GradeHomeworkSummary {
    gradeName: string;
    totalClasses: number;
    totalHomework: number;
    totalCompletedStudents: number;
    totalEnrolledStudents: number;
    overallRate: number;
    classes: ClassHomeworkCompletion[];
}

export async function fetchHomeworkCompletionByGradeAndClass(): Promise<GradeHomeworkSummary[]> {
    const { db, schoolId } = await requireSchoolActor(["admin"]);

    const [classes, enrollments, homework, submissions] = await Promise.all([
        fetchAllRows("homework:classes", paged(db, "classes", "id, name", (q) => q.eq("school_id", schoolId).eq("status", "active"))),
        fetchAllRows("homework:enrollments", paged(db, "enrollments", "id, class_id, classes!inner(school_id, status)",
            (q) => q.eq("classes.school_id", schoolId).eq("classes.status", "active"))),
        fetchAllRows("homework:homework", paged(db, "homework", "id, class_id", (q) => q.eq("school_id", schoolId))),
        fetchAllRows("homework:submissions", paged(db, "homework_submissions", "id, homework_id, student_id, homework!inner(school_id)",
            (q) => q.eq("homework.school_id", schoolId))),
    ]);

    const enrolledByClass = new Map<string, number>();
    for (const e of enrollments) enrolledByClass.set(e.class_id, (enrolledByClass.get(e.class_id) ?? 0) + 1);

    const homeworkClass = new Map<string, string>();
    const homeworkByClass = new Map<string, number>();
    for (const h of homework) {
        homeworkClass.set(h.id, h.class_id);
        homeworkByClass.set(h.class_id, (homeworkByClass.get(h.class_id) ?? 0) + 1);
    }

    const submittersByClass = new Map<string, Set<string>>();
    for (const s of submissions) {
        const classId = homeworkClass.get(s.homework_id);
        if (!classId) continue;
        const set = submittersByClass.get(classId) ?? new Set<string>();
        set.add(s.student_id);
        submittersByClass.set(classId, set);
    }

    const gradeMap = new Map<string, ClassHomeworkCompletion[]>();
    for (const c of classes) {
        const className = c.name || "N/A";
        const gradeName = detectGradeLevel(className);
        const homeworkCount = homeworkByClass.get(c.id) ?? 0;
        const completedStudents = submittersByClass.get(c.id)?.size ?? 0;
        const totalStudents = enrolledByClass.get(c.id) ?? 0;
        const completionRate = totalStudents > 0
            ? Math.min(100, Math.round((completedStudents / totalStudents) * 100))
            : (homeworkCount > 0 ? 100 : 0);

        let status: ClassHomeworkCompletion["status"] = "Đạt chuẩn";
        if (homeworkCount === 0) status = "Chưa giao bài";
        else if (completionRate < 60) status = "Cần đôn đốc";

        pushTo(gradeMap, gradeName, { classId: c.id, className, gradeName, homeworkCount, completedStudents, totalStudents, completionRate, status });
    }

    const result: GradeHomeworkSummary[] = Array.from(gradeMap.entries()).map(([gradeName, classList]) => {
        let totalHomework = 0;
        let totalCompleted = 0;
        let totalEnrolled = 0;
        for (const c of classList) {
            totalHomework += c.homeworkCount;
            totalCompleted += c.completedStudents;
            totalEnrolled += c.totalStudents;
        }
        return {
            gradeName,
            totalClasses: classList.length,
            totalHomework,
            totalCompletedStudents: totalCompleted,
            totalEnrolledStudents: totalEnrolled,
            overallRate: totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0,
            classes: classList.sort((a, b) => a.className.localeCompare(b.className)),
        };
    });

    return result.sort((a, b) => a.gradeName.localeCompare(b.gradeName));
}

// ============================================================
// 3. PHỔ ĐIỂM THEO KHỐI & LỚP (MAX, AVG, MIN)
// ============================================================
export interface ClassGradeStat {
    classId: string;
    className: string;
    gradeName: string;
    submissionCount: number;
    maxScore: number;
    avgScore: number;
    minScore: number;
    classification: "Xuất sắc" | "Khá" | "Trung bình" | "Cần cải thiện" | "Chưa có điểm";
}

export interface GradeOverviewGroup {
    gradeName: string;
    maxScore: number;
    avgScore: number;
    minScore: number;
    totalSubmissions: number;
    classes: ClassGradeStat[];
}

export async function fetchGradeOverviewByGradeAndClass(): Promise<GradeOverviewGroup[]> {
    const { db, schoolId } = await requireSchoolActor(["admin"]);

    const [classes, examSubs, hwSubs] = await Promise.all([
        fetchAllRows("grades:classes", paged(db, "classes", "id, name", (q) => q.eq("school_id", schoolId))),
        fetchAllRows("grades:exam_submissions", paged(db, "exam_submissions", "id, score, exams!inner(class_id, school_id)",
            (q) => q.eq("exams.school_id", schoolId).not("score", "is", null))),
        fetchAllRows("grades:homework_submissions", paged(db, "homework_submissions", "id, score, homework!inner(class_id, school_id)",
            (q) => q.eq("homework.school_id", schoolId).not("score", "is", null))),
    ]);

    const scoresByClass = new Map<string, number[]>();
    for (const s of examSubs) {
        const classId = one<Row>(s.exams)?.class_id;
        if (classId && s.score !== null) pushTo(scoresByClass, classId, Number(s.score));
    }
    for (const s of hwSubs) {
        const classId = one<Row>(s.homework)?.class_id;
        if (classId && s.score !== null) pushTo(scoresByClass, classId, Number(s.score));
    }

    const gradeMap = new Map<string, ClassGradeStat[]>();
    for (const c of classes) {
        const className = c.name || "N/A";
        const gradeName = detectGradeLevel(className);
        const scores = scoresByClass.get(c.id) ?? [];
        const { max, min, avg } = scoreStats(scores);

        let classification: ClassGradeStat["classification"] = "Chưa có điểm";
        if (scores.length > 0) {
            if (avg >= 8.0) classification = "Xuất sắc";
            else if (avg >= 6.5) classification = "Khá";
            else if (avg >= 5.0) classification = "Trung bình";
            else classification = "Cần cải thiện";
        }

        pushTo(gradeMap, gradeName, { classId: c.id, className, gradeName, submissionCount: scores.length, maxScore: max, avgScore: avg, minScore: min, classification });
    }

    const result: GradeOverviewGroup[] = Array.from(gradeMap.entries()).map(([gradeName, classStats]) => {
        const allScores: number[] = [];
        for (const cs of classStats) for (const s of scoresByClass.get(cs.classId) ?? []) allScores.push(s);
        const { max, min, avg } = scoreStats(allScores);
        return {
            gradeName,
            maxScore: max,
            avgScore: avg,
            minScore: min,
            totalSubmissions: allScores.length,
            classes: classStats.sort((a, b) => a.className.localeCompare(b.className)),
        };
    });

    return result.sort((a, b) => a.gradeName.localeCompare(b.gradeName));
}

// ============================================================
// 4. GỢI Ý HÀNH ĐỘNG NGẮN GỌN
// ============================================================
export interface SmartActionItem {
    id: string;
    type: "warning" | "reminder" | "success";
    title: string;
    description: string;
    recommendation: string;
    actionLabel: string;
    targetRoute?: string;
}

export interface SmartBehaviorBriefing {
    criticalAlertsCount: number;
    classesNeedingAttention: number;
    positiveHighlightsCount: number;
    actionItems: SmartActionItem[];
}

export async function fetchSmartActionableBehaviorBriefing(): Promise<SmartBehaviorBriefing> {
    const { db, schoolId } = await requireSchoolActor(["admin"]);

    const { data, error } = await db.from("attendance_records")
        .select("id, student_id, status, student:users!student_id(full_name), attendance_sessions!inner(session_date, classes!inner(name, school_id))")
        .eq("attendance_sessions.classes.school_id", schoolId)
        .eq("attendance_sessions.session_date", vnDate())
        .order("marked_at", { ascending: false })
        .limit(50);
    if (error) fail("briefing:attendance", error);

    const attRecords: Row[] = data ?? [];
    const absents = attRecords.filter((r) => r.status === "absent");
    const lateRecords = attRecords.filter((r) => r.status === "late");

    const actionItems: SmartActionItem[] = [];

    if (absents.length > 0) {
        const studentName = one<Row>(absents[0].student)?.full_name || "học sinh";
        const className = one<Row>(one<Row>(absents[0].attendance_sessions)?.classes)?.name || "K01.02";
        actionItems.push({
            id: "att-alert-1",
            type: "warning",
            title: "Cảnh báo chuyên cần học sinh",
            description: `Ghi nhận ${absents.length} lượt vắng hôm nay. Điển hình em ${studentName} (${className}) cần xác minh lý do nghỉ học.`,
            recommendation: "Gửi thông báo SMS/Zalo hoặc gọi điện trực tiếp cho phụ huynh để xác nhận lý do vắng mặt.",
            actionLabel: "Liên hệ Phụ huynh",
            targetRoute: "/admin/attendance",
        });
    }

    actionItems.push({
        id: "hw-remind-1",
        type: "reminder",
        title: "Đôn đốc nộp bài tập về nhà",
        description: "Lớp K01-4.5 hiện có 1 bài tập sắp hết hạn nhưng tỷ lệ nộp bài đang ở mức 80% (4/5 học sinh).",
        recommendation: "Nhắc nhở giáo viên bộ môn gửi thông báo đôn đốc 1 học sinh còn lại hoàn thành bài trước 22:00.",
        actionLabel: "Gửi nhắc nhở GV",
        targetRoute: "/admin/classes",
    });

    actionItems.push({
        id: "positive-1",
        type: "success",
        title: "Khen thưởng chuyên cần Khối 10",
        description: "Khối 10 và lớp K01.02 duy trì tỷ lệ điểm danh đạt 100% trong 3 buổi gần nhất với 16 lượt nộp bài xuất sắc.",
        recommendation: "Cộng điểm thưởng rèn luyện (Attendance Points) trên hệ thống để khích lệ tinh thần các em.",
        actionLabel: "Tặng Điểm Thưởng",
        targetRoute: "/admin/attendance",
    });

    return {
        criticalAlertsCount: absents.length,
        classesNeedingAttention: lateRecords.length > 0 ? 1 : 0,
        positiveHighlightsCount: 1,
        actionItems,
    };
}
