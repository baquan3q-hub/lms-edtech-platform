import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  superAdmin: true,
}));

// Query builder giả lập vừa đủ cho service: select/update/insert + eq/is/in + maybeSingle/single.
function fakeDb() {
  return {
    from(table: string) {
      const rows = (state.tables[table] ||= []);
      const filters: ((row: Row) => boolean)[] = [];
      let op: "select" | "update" | "insert" = "select";
      let patch: Row = {};
      let inserted: Row | null = null;
      const matching = () => rows.filter(row => filters.every(f => f(row)));
      const run = () => {
        if (op === "update") { matching().forEach(row => Object.assign(row, patch)); return { data: null, error: null }; }
        if (op === "insert") return { data: inserted, error: null };
        return { data: matching(), error: null };
      };
      const query = {
        select: () => query,
        update: (values: Row) => { op = "update"; patch = values; return query; },
        insert: (values: Row) => {
          op = "insert";
          inserted = { id: crypto.randomUUID(), created_at: "2026-11-25T00:00:00.000Z", last_used_at: null, revoked_at: null, ...values };
          rows.push(inserted);
          return query;
        },
        eq: (field: string, value: unknown) => { filters.push(row => row[field] === value); return query; },
        is: (field: string, value: unknown) => { filters.push(row => (row[field] ?? null) === value); return query; },
        in: (field: string, values: unknown[]) => { filters.push(row => values.includes(row[field])); return query; },
        maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
        single: async () => ({ data: op === "insert" ? inserted : matching()[0], error: null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(run()).then(resolve),
      };
      return query;
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeDb() }));
vi.mock("@/lib/auth/super-admin", () => ({
  requireSuperAdmin: async () => {
    if (!state.superAdmin) throw new Error("FORBIDDEN");
    return { id: "00000000-0000-4000-8000-0000000000aa", role: "super_admin", isSuperAdmin: true };
  },
}));

import {
  API_KEY_PREFIX, generateApiKeyMaterial, getSchoolApiKeyInfo, hashApiKey, readPresentedApiKey,
  revokeSchoolApiKey, rotateSchoolApiKey, verifySchoolApiKey,
} from "@/lib/modules/school-api-keys/service";
import { GET } from "@/app/api/schools/[schoolId]/route";

const school = "00000000-0000-4000-8000-000000000001";
const otherSchool = "00000000-0000-4000-8000-000000000002";

function callRoute(schoolId: string, headers: Record<string, string> = {}) {
  return GET(new NextRequest(`http://localhost/api/schools/${schoolId}`, { headers }), { params: Promise.resolve({ schoolId }) });
}

beforeEach(() => {
  state.superAdmin = true;
  state.tables = {
    schools: [
      { id: school, code: "THCS-A", name: "Trường A", status: "active", ai_enabled: true },
      { id: otherSchool, code: "THCS-B", name: "Trường B", status: "active", ai_enabled: false },
    ],
    school_api_keys: [],
    school_ai_quotas: [],
    audit_events: [],
  };
});

describe("school API key material", () => {
  it("generates a random prefixed key and stores only its sha256", () => {
    const a = generateApiKeyMaterial();
    const b = generateApiKeyMaterial();
    expect(a.key).toMatch(/^sch_live_[A-Za-z0-9_-]{43}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toBe(hashApiKey(a.key));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.prefix).toBe(a.key.slice(0, 16));
    expect(a.hash).not.toContain(a.key);
  });

  it("reads the key from x-school-api-key or a Bearer token", () => {
    expect(readPresentedApiKey(new Headers({ "x-school-api-key": " sch_live_abc " }))).toBe("sch_live_abc");
    expect(readPresentedApiKey(new Headers({ authorization: "Bearer sch_live_xyz" }))).toBe("sch_live_xyz");
    expect(readPresentedApiKey(new Headers({ authorization: "Basic abc" }))).toBeNull();
    expect(readPresentedApiKey(new Headers())).toBeNull();
  });
});

describe("rotate / verify / revoke", () => {
  it("accepts only the active key of the right school and records last use", async () => {
    const { key, info } = await rotateSchoolApiKey(school);
    expect(info.prefix).toBe(key.slice(0, 16));
    const stored = state.tables.school_api_keys[0];
    expect(stored.key_hash).toBe(hashApiKey(key));
    expect(JSON.stringify(state.tables)).not.toContain(key);

    const db = fakeDb() as never;
    expect(await verifySchoolApiKey(db, school, key)).toBe(true);
    expect(stored.last_used_at).toEqual(expect.any(String));
    expect(await verifySchoolApiKey(db, otherSchool, key)).toBe(false);
    expect(await verifySchoolApiKey(db, school, key + "x")).toBe(false);
    expect(await verifySchoolApiKey(db, school, key.replace(API_KEY_PREFIX, "sch_test_"))).toBe(false);
    expect(await verifySchoolApiKey(db, "not-a-uuid", key)).toBe(false);
    expect(await verifySchoolApiKey(db, school, null)).toBe(false);
    expect(await verifySchoolApiKey(db, school, API_KEY_PREFIX + "a".repeat(200))).toBe(false);
  });

  it("rotating revokes the previous key, revoking disables the school", async () => {
    const first = await rotateSchoolApiKey(school);
    const second = await rotateSchoolApiKey(school);
    const db = fakeDb() as never;
    expect(await verifySchoolApiKey(db, school, first.key)).toBe(false);
    expect(await verifySchoolApiKey(db, school, second.key)).toBe(true);
    expect(state.tables.school_api_keys.filter(row => row.revoked_at === null)).toHaveLength(1);

    await revokeSchoolApiKey(school);
    expect(await verifySchoolApiKey(db, school, second.key)).toBe(false);
    expect((await getSchoolApiKeyInfo(db, [school])).size).toBe(0);
    expect(state.tables.audit_events.map(e => e.action)).toEqual([
      "school_api_key_rotated", "school_api_key_rotated", "school_api_key_revoked",
    ]);
  });

  it("only super admins can rotate or revoke", async () => {
    state.superAdmin = false;
    await expect(rotateSchoolApiKey(school)).rejects.toThrow("FORBIDDEN");
    await expect(revokeSchoolApiKey(school)).rejects.toThrow("FORBIDDEN");
    expect(state.tables.school_api_keys).toHaveLength(0);
  });

  it("no longer accepts the old salted-hash key", async () => {
    await rotateSchoolApiKey(school);
    const { createHash } = await import("node:crypto");
    const legacy = "sch_live_" + createHash("sha256").update(`eduschool_salt_2026_${school}_THCS-A`).digest("hex").slice(0, 32);
    expect(await verifySchoolApiKey(fakeDb() as never, school, legacy)).toBe(false);
  });
});

describe("GET /api/schools/[schoolId]", () => {
  it("returns 401 for a missing, wrong or revoked key, and for an unknown school", async () => {
    const { key } = await rotateSchoolApiKey(school);
    for (const response of [
      await callRoute(school),
      await callRoute(school, { "x-school-api-key": "sch_live_wrong" }),
      await callRoute(otherSchool, { "x-school-api-key": key }),
      await callRoute("00000000-0000-4000-8000-00000000dead", { "x-school-api-key": key }),
    ]) {
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("INVALID_API_KEY");
    }
  });

  it("returns the school status and quota for a valid key", async () => {
    const { key } = await rotateSchoolApiKey(school);
    const response = await callRoute(school, { authorization: `Bearer ${key}` });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.school).toEqual({ id: school, code: "THCS-A", name: "Trường A", status: "active", ai_enabled: true });
    expect(body.data.api_quota.remaining_tokens).toBe(500000);
  });
});
