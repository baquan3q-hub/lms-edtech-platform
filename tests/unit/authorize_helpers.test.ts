import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  actor: { userId: "admin-1", schoolId: "school-a", roles: ["admin"], currentRole: "admin" } as Record<string, unknown>,
  rows: {} as Record<string, Record<string, unknown>[]>,
  classScopeCalls: [] as [string, string][],
  denyClass: false,
}));

vi.mock("@/lib/auth/actor-context", () => {
  class AccessError extends Error {
    constructor(public status: number, message = "Không có quyền truy cập.", public code = "FORBIDDEN") { super(message); }
  }
  return {
    AccessError,
    getActorContext: async () => state.actor,
    requireActorContext: async (roles?: string[]) => {
      const roleList = state.actor.roles as string[];
      if (roles?.length && !roles.some(r => roleList.includes(r))) throw new AccessError(403, "role", "FORBIDDEN_ROLE");
      return state.actor;
    },
    requireSchoolScope: () => undefined,
    requireClassScope: async (_actor: unknown, classId: string, mode: string) => {
      state.classScopeCalls.push([classId, mode]);
      if (state.denyClass) throw new AccessError(403, "class");
      return true;
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let rows = [...(state.rows[table] || [])];
      const query = {
        select: () => query,
        eq: (field: string, value: unknown) => { rows = rows.filter(r => r[field] === value); return query; },
        limit: () => query,
        maybeSingle: async () => ({ data: rows[0] || null, error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { requireRowClassAccess, requireSelfOrRoles } from "@/lib/auth/authorize";

describe("requireSelfOrRoles", () => {
  beforeEach(() => {
    state.actor = { userId: "teacher-1", schoolId: "school-a", roles: ["teacher"], currentRole: "teacher" };
    state.rows = { school_memberships: [{ school_id: "school-a", user_id: "teacher-2" }] };
  });

  it("lets a user act on their own id", async () => {
    await expect(requireSelfOrRoles("teacher-1")).resolves.toMatchObject({ id: "teacher-1" });
  });

  it("refuses another user's id without the role", async () => {
    await expect(requireSelfOrRoles("teacher-2")).rejects.toMatchObject({ status: 403 });
  });

  it("lets an admin act on a member of the same school only", async () => {
    state.actor = { userId: "admin-1", schoolId: "school-a", roles: ["admin"], currentRole: "admin" };
    await expect(requireSelfOrRoles("teacher-2")).resolves.toMatchObject({ id: "admin-1" });
    await expect(requireSelfOrRoles("someone-elsewhere")).rejects.toMatchObject({ status: 403 });
  });
});

describe("requireRowClassAccess", () => {
  beforeEach(() => {
    state.actor = { userId: "teacher-1", schoolId: "school-a", roles: ["teacher"], currentRole: "teacher" };
    state.rows = { class_sessions: [{ id: "session-1", class_id: "class-9" }] };
    state.classScopeCalls = [];
    state.denyClass = false;
  });

  it("checks access against the class that owns the row", async () => {
    await expect(requireRowClassAccess("class_sessions", "session-1")).resolves.toMatchObject({ classId: "class-9" });
    expect(state.classScopeCalls).toEqual([["class-9", "teach"]]);
  });

  it("returns 404 for an unknown row and 403 when the class is not the caller's", async () => {
    await expect(requireRowClassAccess("class_sessions", "missing")).rejects.toMatchObject({ status: 404 });
    state.denyClass = true;
    await expect(requireRowClassAccess("class_sessions", "session-1")).rejects.toMatchObject({ status: 403 });
  });
});
