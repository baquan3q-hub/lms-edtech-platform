"use server";

import { completeAccountActivation } from "@/lib/auth/activation";

/**
 * Server action: Kích hoạt tài khoản và đổi mật khẩu bắt buộc
 */
export async function completeAccountActivationAction(
  userId: string,
  plainToken: string,
  newPassword: string
) {
  try {
    return await completeAccountActivation(userId, plainToken, newPassword);
  } catch (err: any) {
    return { ok: false, error: err.message || "Lỗi xử lý kích hoạt tài khoản." };
  }
}
