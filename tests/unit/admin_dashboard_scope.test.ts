import { beforeEach, describe, expect, it, vi } from "vitest";

// Mọi query của dashboard admin phải có điều kiện school_id của actor: trực tiếp
// (`eq("school_id", ...)`) hoặc qua embed `!inner` (`eq("classes.school_id", ...)`).

const SCHOOL = "school-a";

type Call = [string, unknown[]];
type RecordedQuery = { table: string; calls: Call[] };

const state = vi.hoisted(() => ({
  queries: [] as { table: string; calls: [string, unknown[]][] }[],
  rows: {} as Record<string, Record<string, unknown>[]>,
  roleChecks: [] as unknown[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => { throw new Error("analytics phải dùng db từ requireSchoolActor"); },
}));

vi.mock("@/lib/auth/authorize", () => {
  class AccessError extends Error {
    constructor(public status: number, message = "Không có quyền truy cập.", public code = "FORBIDDEN") { super(message); }
  }
  const PAGE_CAP = 1000; // giống max-rows của PostgREST
  const db = {
    get auth(): never { throw new Error("không được gọi Supabase Auth"); },
    from(table: string) {
      const recorded = { table, calls: [] as [string, unknown[]][] };
      state.queries.push(recorded);
      let head = false;
      let range: [number, number] | null = null;
      const query: Record<string, unknown> = new Proxy({}, {
        get(_target, prop: string) {
          if (prop === "then") {
            return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
              const all = state.rows[table] ?? [];
              const [from, to] = range ?? [0, PAGE_CAP - 1];
              const data = head ? null : all.slice(from, Math.min(to + 1, from + PAGE_CAP));
              return Promise.resolve({ data, error: null, count: all.length }).then(resolve, reject);
            };
          }
          return (...args: unknown[]) => {
            recorded.calls.push([prop, args]);
            if (prop === "select") head = Boolean((args[1] as { head?: boolean } | undefined)?.head);
            if (prop === "range") range = [args[0] as number, args[1] as number];
            return query;
          };
        },
      });
      return query;
    },
  };
  return {
    AccessError,
    requireSchoolActor: async (roles?: string[]) => {
      state.roleChecks.push(roles);
      return { id: "admin-1", schoolId: "school-a", role: "admin", context: {}, db };
    },
    requireActor: async () => { throw new Error("analytics phải dùng requireSchoolActor"); },
  };
});

import * as analytics from "@/app/(dashboard)/admin/analytics-actions";

const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

const CALLS: Record<string, () => Promise<unknown>> = {
  fetchAdminSchoolStats: () => analytics.fetchAdminSchoolStats(),
  fetchDailyActiveUsers: () => analytics.fetchDailyActiveUsers(),
  fetchDailyAttendanceData: () => analytics.fetchDailyAttendanceData("month"),
  fetchGradesDistribution: () => analytics.fetchGradesDistribution("week"),
  fetchSubmissionStatus: () => analytics.fetchSubmissionStatus("all"),
  fetchAdminInsightInputs: () => analytics.fetchAdminInsightInputs("year"),
  fetchMonthlyRevenueData: () => analytics.fetchMonthlyRevenueData(),
  fetchAdminAttendanceSessionsToday: () => analytics.fetchAdminAttendanceSessionsToday(TODAY),
  fetchDailyStudentPresenceAndAttendance: () => analytics.fetchDailyStudentPresenceAndAttendance(),
  fetchHomeworkCompletionByGradeAndClass: () => analytics.fetchHomeworkCompletionByGradeAndClass(),
  fetchGradeOverviewByGradeAndClass: () => analytics.fetchGradeOverviewByGradeAndClass(),
  fetchSmartActionableBehaviorBriefing: () => analytics.fetchSmartActionableBehaviorBriefing(),
};

function schoolFilters(q: RecordedQuery) {
  return q.calls.filter(([method, args]) =>
    method === "eq" && typeof args[0] === "string" && (args[0] === "school_id" || args[0].endsWith(".school_id")) && args[1] === SCHOOL);
}

function selectColumns(q: RecordedQuery) {
  return q.calls.filter(([method]) => method === "select").map(([, args]) => String(args[0])).join(" ");
}

beforeEach(() => {
  state.queries = [];
  state.rows = {};
  state.roleChecks = [];
});

describe("admin analytics school scope", () => {
  it("covers every exported action", () => {
    const exported = Object.entries(analytics).filter(([, v]) => typeof v === "function").map(([k]) => k).sort();
    expect(Object.keys(CALLS).sort()).toEqual(exported);
  });

  it.each(Object.keys(CALLS))("%s: every query is filtered by the actor's school_id", async (name) => {
    await CALLS[name]();
    expect(state.roleChecks.length).toBeGreaterThan(0);
    for (const roles of state.roleChecks) expect(roles).toEqual(["admin"]);
    expect(state.queries.length).toBeGreaterThan(0);

    for (const q of state.queries) {
      const filters = schoolFilters(q);
      expect(filters, `${name} → ${q.table} thiếu điều kiện school_id`).not.toHaveLength(0);
      const select = selectColumns(q);
      for (const [, args] of filters) {
        const path = String(args[0]).split(".").slice(0, -1);
        // Lọc qua bảng nhúng chỉ giới hạn dòng cha khi mọi cấp đều là !inner.
        for (const segment of path) expect(select, `${name} → ${q.table}: ${segment} phải là !inner`).toContain(`${segment}!inner(`);
      }
    }
  });

  it("refuses a malformed date before querying", async () => {
    await expect(analytics.fetchAdminAttendanceSessionsToday("2026-13-40")).rejects.toThrow();
    await expect(analytics.fetchDailyStudentPresenceAndAttendance("hôm nay")).rejects.toThrow();
    expect(state.queries).toHaveLength(0);
  });
});

describe("admin analytics aggregation", () => {
  it("reads every page past the 1000-row cap and aggregates per class", async () => {
    state.rows = {
      classes: [{ id: "c1", name: "10A1" }, { id: "c2", name: "11A1" }],
      enrollments: Array.from({ length: 2500 }, (_, i) => ({ id: `e${i}`, class_id: i < 2400 ? "c1" : "c2" })),
      homework: [{ id: "h1", class_id: "c1" }, { id: "h2", class_id: "c1" }],
      homework_submissions: Array.from({ length: 1800 }, (_, i) => ({ id: `s${i}`, homework_id: i % 2 ? "h1" : "h2", student_id: `st${i % 1200}` })),
    };
    const result = await analytics.fetchHomeworkCompletionByGradeAndClass();
    const c1 = result.flatMap(g => g.classes).find(c => c.classId === "c1")!;
    const c2 = result.flatMap(g => g.classes).find(c => c.classId === "c2")!;
    expect(c1).toMatchObject({ totalStudents: 2400, completedStudents: 1200, homeworkCount: 2, completionRate: 50, status: "Cần đôn đốc" });
    expect(c2).toMatchObject({ totalStudents: 100, homeworkCount: 0, status: "Chưa giao bài" });
    const enrollmentPages = state.queries.filter(q => q.table === "enrollments").flatMap(q => q.calls.filter(([m]) => m === "range"));
    expect(enrollmentPages.map(([, args]) => args)).toEqual([[0, 999], [1000, 1999], [2000, 2499]]);
  });

  it("presence only reads today's sessions and the last 24h of activity", async () => {
    state.rows = {
      school_memberships: [{ id: "m1", user_id: "st1", users: { id: "st1", full_name: "An", email: "an@x" } }, { id: "m2", user_id: "st2", users: { id: "st2", full_name: null, email: null } }],
      enrollments: [{ id: "e1", student_id: "st1", classes: { name: "10A1", school_id: SCHOOL } }],
      attendance_records: [
        { id: "a1", student_id: "st1", status: "absent", marked_at: "2026-11-25T00:30:00Z", note: null },
        { id: "a2", student_id: "st1", status: "present", marked_at: "2026-11-25T01:00:00Z", note: "đi trễ có phép" },
      ],
      learning_sessions: [{ id: "l1", student_id: "st1", last_seen_at: new Date().toISOString() }],
    };
    const summary = await analytics.fetchDailyStudentPresenceAndAttendance();
    expect(summary).toMatchObject({ totalStudents: 2, presentCount: 1, absentCount: 0, onlineCount: 1, attendanceRate: 100 });
    expect(summary.records.find(r => r.studentId === "st1")).toMatchObject({ id: "a2", className: "10A1", gradeName: "Khối 10", attendanceStatus: "present", isOnline: true, notes: "đi trễ có phép" });
    expect(summary.records.find(r => r.studentId === "st2")).toMatchObject({ fullName: "Học sinh", className: "Chưa xếp lớp", attendanceStatus: "unmarked", lastSignInTimeStr: "Chưa đăng nhập" });

    const attendance = state.queries.find(q => q.table === "attendance_records")!;
    expect(attendance.calls).toContainEqual(["eq", ["attendance_sessions.session_date", TODAY]]);
    const sessions = state.queries.find(q => q.table === "learning_sessions")!;
    expect(sessions.calls.some(([m, args]) => m === "gte" && args[0] === "last_seen_at")).toBe(true);
  });

  it("daily active users counts distinct ids across sources without Auth", async () => {
    state.rows = {
      learning_sessions: [{ id: "1", student_id: "st1" }, { id: "2", student_id: "st1" }],
      homework_submissions: [{ id: "3", student_id: "st2" }],
      attendance_records: [{ id: "4", marked_by: "t1" }],
      audit_events: [{ id: "5", actor_id: "t1" }, { id: "6", actor_id: "admin-1" }],
    };
    await expect(analytics.fetchDailyActiveUsers()).resolves.toBe(4);
  });

  it("grade distribution counts buckets in the database", async () => {
    state.rows = { submissions: [{ id: "1" }], exam_submissions: [{ id: "2" }, { id: "3" }] };
    const result = await analytics.fetchGradesDistribution("all");
    expect(result.map(r => r.name)).toEqual(["Cần cố gắng", "Trung bình", "Khá", "Khá Giỏi"]);
    expect(result.every(r => r.count === 3)).toBe(true);
    const intFilters = state.queries.filter(q => q.table === "submissions").flatMap(q => q.calls.filter(([m]) => m === "or").map(([, a]) => String(a[0])));
    expect(intFilters.join(" ")).not.toContain("6.5"); // submissions.score là INTEGER
  });
});
