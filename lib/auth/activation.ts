import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/lib/audit/audit-logger";

export interface ActivationResult {
  ok: boolean;
  message?: string;
  error?: string;
}

/**
 * Tính mã băm SHA-256 của token kích hoạt (Bảo mật: Tuyệt đối không lưu token rõ)
 */
export function hashActivationToken(token: string): string {
  const normalized = token.trim().toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Sinh mã kích hoạt ngẫu nhiên 8 ký tự kèm mã băm SHA-256
 */
export function generateActivationToken(): { token: string; hash: string } {
  // Bộ ký tự dễ đọc, tránh nhầm lẫn (bỏ 0, O, 1, I)
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let token = "";
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    token += chars[randomBytes[i] % chars.length];
  }
  // Định dạng: ACT-XXXX-XXXX
  const formattedToken = `ACT-${token.slice(0, 4)}-${token.slice(4)}`;
  return {
    token: formattedToken,
    hash: hashActivationToken(formattedToken),
  };
}

/**
 * Kiểm tra trạng thái kích hoạt của một tài khoản người dùng
 */
export async function checkAccountActivationStatus(userId: string): Promise<{
  isActivated: boolean;
  status?: string;
}> {
  const db = createAdminClient();
  const { data: activation } = await db
    .from("account_activations")
    .select("status, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!activation) {
    // Không có bản ghi activation -> coi như tài khoản bình thường/đã kích hoạt
    return { isActivated: true };
  }

  if (activation.status === "used") {
    return { isActivated: true, status: "used" };
  }

  return { isActivated: false, status: activation.status };
}

/**
 * Xác thực mã kích hoạt và tiến hành đổi mật khẩu bắt buộc
 */
export async function completeAccountActivation(
  userId: string,
  plainToken: string,
  newPassword: string
): Promise<ActivationResult> {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "Mật khẩu mới phải có tối thiểu 6 ký tự." };
  }

  if (newPassword === "abc123") {
    return { ok: false, error: "Vui lòng chọn mật khẩu mới khác mật khẩu tạm mặc định (abc123)." };
  }

  const db = createAdminClient();

  // 1. Lấy bản ghi activation mới nhất
  const { data: activation, error } = await db
    .from("account_activations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !activation) {
    return { ok: false, error: "Không tìm thấy yêu cầu kích hoạt hợp lệ hoặc tài khoản đã kích hoạt." };
  }

  // 2. Kiểm tra hạn dùng
  if (new Date(activation.expires_at) < new Date()) {
    await db
      .from("account_activations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", activation.id);
    return { ok: false, error: "Mã kích hoạt đã hết hạn. Vui lòng liên hệ nhà trường để cấp mã mới." };
  }

  // 3. Kiểm tra số lần thử sai
  if (activation.attempts_count >= activation.max_attempts) {
    return { ok: false, error: "Bạn đã nhập sai mã kích hoạt quá 5 lần. Mã đã bị khóa." };
  }

  // 4. So khớp hash SHA-256
  const incomingHash = hashActivationToken(plainToken);
  if (incomingHash !== activation.activation_token_hash) {
    await db
      .from("account_activations")
      .update({
        attempts_count: activation.attempts_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activation.id);

    const remaining = activation.max_attempts - (activation.attempts_count + 1);
    return {
      ok: false,
      error: `Mã kích hoạt không chính xác. Bạn còn ${Math.max(0, remaining)} lần thử.`,
    };
  }

  // 5. Cập nhật mật khẩu mới trên Supabase Auth qua admin client
  const { error: authError } = await db.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (authError) {
    return { ok: false, error: `Lỗi cập nhật mật khẩu: ${authError.message}` };
  }

  // 6. Đánh dấu token đã sử dụng
  await db
    .from("account_activations")
    .update({
      status: "used",
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", activation.id);

  // 7. Ghi audit event
  await recordAuditEvent({
    schoolId: activation.school_id,
    actorId: userId,
    action: "activate_account",
    entityType: "user",
    entityId: userId,
    afterState: { status: "activated" },
  });

  return { ok: true, message: "Kích hoạt tài khoản và đổi mật khẩu thành công!" };
}
