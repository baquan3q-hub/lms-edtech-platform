import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/super-admin";

/**
 * API key tích hợp của trường.
 * - Key = "sch_live_" + 32 byte ngẫu nhiên (base64url). Chỉ hiện cho Super Admin đúng một lần lúc tạo.
 * - DB chỉ lưu SHA-256 của key (key đủ entropy nên không cần hàm băm chậm) và tiền tố để hiển thị.
 * - So sánh bản băm bằng timingSafeEqual; mỗi trường tối đa một key còn hiệu lực.
 */
export const API_KEY_PREFIX = "sch_live_";
const DISPLAY_PREFIX_LENGTH = 16;
const MAX_KEY_LENGTH = 128;

type AdminDb = ReturnType<typeof createAdminClient>;

export interface SchoolApiKeyInfo {
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function generateApiKeyMaterial() {
  const key = API_KEY_PREFIX + randomBytes(32).toString("base64url");
  return { key, hash: hashApiKey(key), prefix: key.slice(0, DISPLAY_PREFIX_LENGTH) };
}

/** Lấy key từ header `x-school-api-key` hoặc `Authorization: Bearer <key>`. */
export function readPresentedApiKey(headers: Headers): string | null {
  const direct = headers.get("x-school-api-key");
  if (direct) return direct.trim();
  const auth = headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

/** true nếu `presented` là key còn hiệu lực của `schoolId`. Không ném lỗi với đầu vào xấu. */
export async function verifySchoolApiKey(db: AdminDb, schoolId: string, presented: string | null): Promise<boolean> {
  if (!presented || !presented.startsWith(API_KEY_PREFIX) || presented.length > MAX_KEY_LENGTH) return false;
  if (!z.uuid().safeParse(schoolId).success) return false;
  const { data, error } = await db.from("school_api_keys").select("id, key_hash")
    .eq("school_id", schoolId).is("revoked_at", null);
  if (error || !data?.length) return false;
  const presentedHash = Buffer.from(hashApiKey(presented), "hex");
  const match = data.find(row => {
    const stored = Buffer.from(String(row.key_hash), "hex");
    return stored.length === presentedHash.length && timingSafeEqual(stored, presentedHash);
  });
  if (!match) return false;
  await db.from("school_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", match.id);
  return true;
}

/** Metadata (không bao giờ có key gốc) của key còn hiệu lực, theo trường. */
export async function getSchoolApiKeyInfo(db: AdminDb, schoolIds: string[]): Promise<Map<string, SchoolApiKeyInfo>> {
  const result = new Map<string, SchoolApiKeyInfo>();
  if (!schoolIds.length) return result;
  const { data, error } = await db.from("school_api_keys").select("school_id, key_prefix, created_at, last_used_at")
    .in("school_id", schoolIds).is("revoked_at", null);
  if (error) throw error;
  for (const row of data || []) {
    result.set(row.school_id, { prefix: row.key_prefix, createdAt: row.created_at, lastUsedAt: row.last_used_at });
  }
  return result;
}

async function audit(db: AdminDb, schoolId: string, actorId: string, action: string, payload: Record<string, unknown>) {
  // Audit lỗi không chặn thao tác chính, nhưng phải để lại dấu vết trong log.
  const { error } = await db.from("audit_events").insert({
    school_id: schoolId, actor_id: actorId, action, entity_type: "school_api_keys", entity_id: schoolId, after_state: payload,
  });
  if (error) console.error(JSON.stringify({ event: "audit.failed", action, code: error.code }));
}

/** Thu hồi key đang dùng (nếu có) rồi tạo key mới. Trả key gốc đúng một lần. */
export async function rotateSchoolApiKey(schoolId: string) {
  const actor = await requireSuperAdmin();
  const id = z.uuid().parse(schoolId);
  const db = createAdminClient();
  const { data: school, error: schoolError } = await db.from("schools").select("id").eq("id", id).maybeSingle();
  if (schoolError) throw schoolError;
  if (!school) throw new Error("Trường học không tồn tại.");

  const now = new Date().toISOString();
  const { error: revokeError } = await db.from("school_api_keys").update({ revoked_at: now })
    .eq("school_id", id).is("revoked_at", null);
  if (revokeError) throw revokeError;

  const material = generateApiKeyMaterial();
  const { data, error } = await db.from("school_api_keys")
    .insert({ school_id: id, key_prefix: material.prefix, key_hash: material.hash, created_by: actor.id })
    .select("created_at").single();
  if (error) throw error;

  await audit(db, id, actor.id, "school_api_key_rotated", { prefix: material.prefix });
  return { key: material.key, info: { prefix: material.prefix, createdAt: data.created_at, lastUsedAt: null } satisfies SchoolApiKeyInfo };
}

/** Thu hồi key đang dùng; trường sẽ không gọi được API cho tới khi tạo key mới. */
export async function revokeSchoolApiKey(schoolId: string) {
  const actor = await requireSuperAdmin();
  const id = z.uuid().parse(schoolId);
  const db = createAdminClient();
  const { error } = await db.from("school_api_keys").update({ revoked_at: new Date().toISOString() })
    .eq("school_id", id).is("revoked_at", null);
  if (error) throw error;
  await audit(db, id, actor.id, "school_api_key_revoked", {});
}
