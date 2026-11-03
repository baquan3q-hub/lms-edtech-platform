"use server";

import { requireActorContext } from "@/lib/auth/actor-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateActivationToken } from "@/lib/auth/activation";
import { recordAuditEvent } from "@/lib/audit/audit-logger";
import { requireManagedUser } from "@/lib/auth/authorize";

/**
 * Server action: Reset mật khẩu tài khoản về mặc định 'abc123'
 * Thu hồi session cũ, sinh mã kích hoạt mới, và ghi audit log.
 */
export async function resetUserPasswordToDefault(targetUserId: string) {
  try {
    const actor = (await requireManagedUser(targetUserId,true)).context;
    const db = createAdminClient();

    // 1. Kiểm tra người dùng tồn tại
    const { data: targetUser, error: userErr } = await db
      .from("users")
      .select("id, full_name, role, email")
      .eq("id", targetUserId)
      .single();

    if (userErr || !targetUser) {
      return { ok: false, error: "Không tìm thấy người dùng." };
    }

    // 2. Cập nhật mật khẩu Auth về 'abc123'
    const { error: authErr } = await db.auth.admin.updateUserById(targetUserId, {
      password: "abc123",
    });

    if (authErr) {
      return { ok: false, error: `Không thể reset mật khẩu: ${authErr.message}` };
    }

    // 3. Thu hồi toàn bộ token kích hoạt cũ của người dùng này
    await db
      .from("account_activations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId)
      .eq("status", "pending");

    // 4. Sinh mã kích hoạt mới
    const { token, hash } = generateActivationToken();

    await db.from("account_activations").insert({
      school_id: actor.schoolId,
      user_id: targetUserId,
      activation_token_hash: hash,
      status: "pending",
    });

    // 5. Ghi audit event
    await recordAuditEvent({
      schoolId: actor.schoolId,
      actorId: actor.userId,
      action: "reset_password_default",
      entityType: "user",
      entityId: targetUserId,
      afterState: {
        reset_by: actor.userId,
        default_password: true,
        activation_required: true,
      },
    });

    return {
      ok: true,
      message: `Đã reset mật khẩu cho ${targetUser.full_name} về 'abc123'.`,
      activationToken: token,
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
