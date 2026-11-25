import { beforeEach, describe, expect, it, vi } from "vitest";

// requireClassScope reads its rows through request-scoped cached loaders; the access
// decision must stay exactly as before for every role.
const state = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]> }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let rows = [...(state.tables[table] || [])];
      const query = {
        select: () => query,
        eq: (field: string, value: unknown) => { rows = rows.filter(r => r[field] === value); return query; },
        in: (field: string, values: unknown[]) => { rows = rows.filter(r => values.includes(r[field])); return query; },
        limit: () => query,
        single: async () => ({ data: rows[0] || null, error: rows[0] ? null : { message: "not found" } }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { requireClassScope, type ActorContext, type Role } from "@/lib/auth/actor-context";

const actor = (userId: string, role: Role, schoolId = "school-a"): ActorContext =>
  ({ userId, schoolId, roles: [role], currentRole: role, expiresAt: 0 });

describe("requireClassScope", () => {
  beforeEach(() => {
    state.tables = {
      classes: [
        { id: "class-1", school_id: "school-a", teacher_id: "legacy-owner" },
        { id: "class-2", school_id: "school-a", teacher_id: "old-owner" },
      ],
      class_teacher_assignments: [
        { class_id: "class-1", teacher_id: "teacher-1", status: "active" },
        { class_id: "class-2", teacher_id: "new-teacher", status: "active" },
        { class_id: "class-2", teacher_id: "old-owner", status: "ended" },
      ],
      enrollments: [{ id: "e1", class_id: "class-1", student_id: "student-1", status: "active" }],
      parent_students: [
        { school_id: "school-a", parent_id: "parent-1", student_id: "student-1", verification_status: "verified" },
        { school_id: "school-a", parent_id: "parent-2", student_id: "student-1", verification_status: "pending" },
      ],
    };
  });

  it("returns 404 for a missing class and 403 across schools", async () => {
    await expect(requireClassScope(actor("teacher-1", "teacher"), "missing")).rejects.toMatchObject({ status: 404 });
    await expect(requireClassScope(actor("admin-1", "admin", "school-b"), "class-1")).rejects.toMatchObject({ status: 403 });
  });

  it("allows school admins except in learn mode", async () => {
    await expect(requireClassScope(actor("admin-1", "admin"), "class-1", "teach")).resolves.toBe(true);
    await expect(requireClassScope(actor("admin-1", "admin"), "class-1", "learn")).rejects.toMatchObject({ status: 403 });
  });

  it("allows assigned teachers and legacy owners only while no assignment supersedes them", async () => {
    await expect(requireClassScope(actor("teacher-1", "teacher"), "class-1", "teach")).resolves.toBe(true);
    await expect(requireClassScope(actor("legacy-owner", "teacher"), "class-1", "teach")).resolves.toBe(true);
    await expect(requireClassScope(actor("old-owner", "teacher"), "class-2", "teach")).rejects.toMatchObject({ status: 403 });
    await expect(requireClassScope(actor("teacher-2", "teacher"), "class-1", "teach")).rejects.toMatchObject({ status: 403 });
  });

  it("allows enrolled students to learn but not teach", async () => {
    await expect(requireClassScope(actor("student-1", "student"), "class-1", "learn")).resolves.toBe(true);
    await expect(requireClassScope(actor("student-1", "student"), "class-1", "teach")).rejects.toMatchObject({ status: 403 });
    await expect(requireClassScope(actor("student-2", "student"), "class-1", "learn")).rejects.toMatchObject({ status: 403 });
  });

  it("allows verified guardians of an enrolled child to read only", async () => {
    await expect(requireClassScope(actor("parent-1", "parent"), "class-1", "read")).resolves.toBe(true);
    await expect(requireClassScope(actor("parent-1", "parent"), "class-1", "learn")).rejects.toMatchObject({ status: 403 });
    await expect(requireClassScope(actor("parent-2", "parent"), "class-1", "read")).rejects.toMatchObject({ status: 403 });
    await expect(requireClassScope(actor("parent-1", "parent"), "class-2", "read")).rejects.toMatchObject({ status: 403 });
  });
});
