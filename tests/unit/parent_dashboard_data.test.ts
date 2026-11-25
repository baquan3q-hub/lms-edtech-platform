import { beforeEach, describe, expect, it, vi } from "vitest";

// fetchParentDashboardData: pins the response shape and how many sequential
// round trips it waits on. Every mocked query stays pending until the test
// releases the whole batch, so the number of batches = sequential rounds.
const state = vi.hoisted(() => ({
  pending: [] as Array<() => void>,
  queried: [] as string[],
  tables: {} as Record<string, Record<string, unknown>[]>,
  canView: true,
}));

function deferred<T>(value: T): Promise<T> {
  return new Promise(resolve => state.pending.push(() => resolve(value)));
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => deferred({ data: { user: { id: "parent-1" } }, error: null }) },
  }),
}));
vi.mock("@/lib/auth/authorize", () => ({
  requireActor: vi.fn(async () => ({})),
  requireSelfOrRoles: vi.fn(async () => ({})),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      state.queried.push(table);
      // Only plain columns are filtered; embedded filters (session.x) are left to fixtures.
      let rows = table === "parent_students" ? (state.canView ? [{ id: "link-1" }] : []) : [...(state.tables[table] || [])];
      const query: any = {
        select: () => query,
        eq: (field: string, value: unknown) => { if (!field.includes(".")) rows = rows.filter(r => r[field] === undefined || r[field] === value); return query; },
        in: (field: string, values: unknown[]) => { if (!field.includes(".")) rows = rows.filter(r => r[field] === undefined || values.includes(r[field])); return query; },
        not: () => query, gte: () => query, lte: () => query, or: () => query, order: () => query, limit: () => query,
        single: () => deferred({ data: rows[0] || null, error: null }),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => deferred({ data: rows, error: null }).then(resolve, reject),
      };
      return query;
    },
  }),
}));

import { fetchParentDashboardData } from "@/lib/actions/parentStudent";

/** Run `fn`, releasing pending queries one batch at a time. Returns result + batch count. */
async function runInRounds<T>(fn: () => Promise<T>) {
  let done = false;
  let result!: T;
  const promise = fn().then(r => { done = true; result = r; });
  let rounds = 0;
  for (;;) {
    await new Promise(r => setTimeout(r, 0));
    if (done) break;
    if (state.pending.length === 0) throw new Error("stalled without pending queries");
    const batch = state.pending.splice(0);
    rounds++;
    batch.forEach(release => release());
  }
  await promise;
  return { result, rounds };
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("fetchParentDashboardData", () => {
  beforeEach(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const cls = { id: "c1", name: "6A", course: { name: "Toán" }, teacher: { full_name: "GV" } };
    state.pending = [];
    state.queried = [];
    state.canView = true;
    state.tables = {
      users: [{ id: "stu-1", full_name: "Học sinh", email: "hs@example.test", avatar_url: null }],
      enrollments: [{ class_id: "c1", class: cls }],
      attendance_records: [
        { id: "ar1", status: "present", note: null, session: { session_date: ymd(yesterday), class_id: "c1" } },
        { id: "ar2", status: "absent", note: "ốm", session: { session_date: ymd(today), class_id: "c1" } },
      ],
      class_schedules: [{ id: "sch1", class_id: "c1", day_of_week: yesterday.getDay(), start_time: "07:00:00", end_time: "08:00:00", room: { name: "P1" }, class: cls }],
      class_sessions: [],
      absence_requests: [{ absence_date: ymd(yesterday), class_id: "c1", status: "approved" }],
      exam_submissions: [{ id: "es1", exam_id: "e1", score: 8, total_points: 10, submitted_at: "2026-11-01T00:00:00Z" }],
      exams: [{ id: "e1", title: "Kiểm tra 15 phút", class_id: "c1" }],
      notifications: [{ id: "n1", user_id: "parent-1", message: "ngắn", created_at: "2026-11-02T00:00:00Z", metadata: { announcementId: "a2" } }],
      announcements: [
        { id: "a1", title: "Họp PH", content: "Nội dung", created_at: "2026-11-03T00:00:00Z", class_id: "c1" },
        { id: "a2", title: "Học phí", content: "Nội dung đầy đủ", created_at: "2026-11-02T00:00:00Z", class_id: null, attachments: [] },
      ],
      announcement_reads: [{ announcement_id: "a1" }, { announcement_id: "unrelated" }],
      quiz_attempts: [{ item_id: "q1", score: 6 }, { item_id: "q1", score: 9 }],
      homework_submissions: [{ homework_id: "h1", score: 7 }],
    };
  });

  it("returns the dashboard shape in at most 5 sequential rounds", async () => {
    const { result, rounds } = await runInRounds(() => fetchParentDashboardData("stu-1"));
    // getUser → parent_students check → 2 data waves (+ announcement_reads chained to announcements)
    expect(rounds).toBeLessThanOrEqual(5);

    expect(result.error).toBeNull();
    const data = result.data!;
    expect(Object.keys(data)).toEqual([
      "student", "classes", "attendance", "attendanceSummary", "recentExams", "announcements",
      "recentNotifications", "confirmedAnnouncementIds", "upcomingSessions", "upcomingSchedules", "stats",
    ]);
    expect(data.student).toMatchObject({ id: "stu-1" });
    expect(data.classes).toEqual([state.tables.enrollments[0].class]);
    expect(data.attendance[0]).toEqual({ date: expect.any(String), status: "present", notes: null, class_id: "c1" });
    expect(data.attendanceSummary).toEqual({
      total: 2, present: 1, absent: 1, late: 0, excused: 0,
      allTime: { total: 2, present: 1, absent: 1, late: 0, excused: 0 },
    });
    expect(data.recentExams).toEqual([{ ...state.tables.exam_submissions[0], exam: state.tables.exams[0] }]);
    // a2 is attached to the notification, so it is removed from the announcement list
    expect(data.announcements.map((a: any) => a.id)).toEqual(["a1"]);
    expect(data.recentNotifications[0]).toMatchObject({ id: "n1", message: "Nội dung đầy đủ", _announcementId: "a2" });
    expect(data.confirmedAnnouncementIds).toEqual(["a1"]);
    expect(data.stats).toEqual({ averageScore: "8.0", assignmentsCount: 3 });

    // Yesterday's projected session: approved absence request overrides attendance
    const yesterdaySession = data.upcomingSessions.find((s: any) => s.session_date === data.attendance[0].date);
    expect(yesterdaySession).toMatchObject({
      class_id: "c1", class_name: "6A", course_name: "Toán", room_name: "P1", isVirtual: true,
      attendance_status: "excused", absence_request_status: "approved",
    });
    expect(data.upcomingSessions.length).toBeGreaterThan(1);
    expect(data.upcomingSessions.length).toBeLessThanOrEqual(15);
    expect(data.upcomingSchedules).toEqual(state.tables.class_schedules);
  });

  it("refuses before reading any student data when the parent is not linked", async () => {
    state.canView = false;
    const { result } = await runInRounds(() => fetchParentDashboardData("stu-1"));
    expect(result).toEqual({ data: null, error: "Bạn không có quyền xem thông tin học sinh này." });
    expect(state.queried).toEqual(["parent_students"]);
  });
});
