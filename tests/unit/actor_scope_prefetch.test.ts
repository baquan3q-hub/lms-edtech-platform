import { beforeEach, describe, expect, it, vi } from "vitest";

// Scope rows for the login-time role are fetched alongside the membership lookup.
// These tests pin that the hint never grants a role and rows stay filtered by school.
const state = vi.hoisted(() => ({
  userId: "user-1",
  role: "teacher",
  memberships: [] as Record<string, unknown>[],
  tables: {} as Record<string, Record<string, unknown>[]>,
  cookies: {} as Record<string, string>,
  queried: [] as string[],
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (state.cookies[name] ? { value: state.cookies[name] } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: state.userId } }, error: null }) } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      state.queried.push(table);
      let rows: Record<string, unknown>[] =
        table === "users" ? [{ id: state.userId, role: state.role }]
          : table === "school_memberships" ? state.memberships
            : table === "account_activations" ? []
              : state.tables[table] || [];
      const query = {
        select: () => query,
        eq: (field: string, value: unknown) => { rows = rows.filter(r => r[field] === undefined || r[field] === value); return query; },
        order: () => query,
        limit: () => query,
        single: async () => ({ data: rows[0] || null, error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { getActorContext } from "@/lib/auth/actor-context";

describe("actor scope prefetch", () => {
  beforeEach(() => {
    state.role = "teacher";
    state.cookies = {};
    state.queried = [];
    state.memberships = [
      { id: "m1", school_id: "school-a", role: "teacher", status: "active" },
      { id: "m2", school_id: "school-b", role: "teacher", status: "active" },
    ];
    state.tables = {
      homeroom_teacher_assignments: [
        { school_id: "school-a", teacher_id: "user-1", homeroom_id: "hr-a", status: "active" },
        { school_id: "school-b", teacher_id: "user-1", homeroom_id: "hr-b", status: "active" },
      ],
      class_teacher_assignments: [
        { school_id: "school-a", teacher_id: "user-1", status: "active", class: { subject_id: "math" } },
        { school_id: "school-b", teacher_id: "user-1", status: "active", class: { subject_id: "art" } },
        { school_id: "school-a", teacher_id: "user-1", status: "active", valid_to: "2000-01-01", class: { subject_id: "expired" } },
      ],
      homeroom_enrollments: [{ student_id: "user-1", homeroom_id: "hr-student", status: "active" }],
    };
  });

  it("keeps only the selected school's effective teaching scope", async () => {
    state.cookies = { "lms-role": "teacher", "lms-school-id": "school-a" };
    const actor = await getActorContext();
    expect(actor?.currentRole).toBe("teacher");
    expect(actor?.homeroomScope).toEqual(["hr-a"]);
    expect(actor?.subjectScope).toEqual(["math"]);
  });

  it("loads the teacher scope without a role hint", async () => {
    state.cookies = { "lms-school-id": "school-b" };
    const actor = await getActorContext();
    expect(actor?.homeroomScope).toEqual(["hr-b"]);
    expect(actor?.subjectScope).toEqual(["art"]);
  });

  it("does not let a role hint grant a role the memberships lack", async () => {
    state.role = "student";
    state.memberships = [{ id: "m3", school_id: "school-a", role: "student", status: "active" }];
    state.cookies = { "lms-role": "teacher" };
    const actor = await getActorContext();
    expect(actor?.roles).toEqual(["student"]);
    expect(actor?.currentRole).toBe("student");
    expect(actor?.subjectScope).toEqual([]);
    expect(actor?.homeroomScope).toEqual(["hr-student"]);
  });

  it("starts the hinted scope query in the same batch as the membership lookup", async () => {
    state.cookies = { "lms-role": "teacher", "lms-school-id": "school-a" };
    await getActorContext();
    expect(state.queried.slice(0, 2)).toEqual(["homeroom_teacher_assignments", "class_teacher_assignments"]);
    expect(state.queried).toContain("school_memberships");
  });
});
