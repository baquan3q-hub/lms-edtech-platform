import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccessError } from "@/lib/auth/actor-context";

export const PRIVATE_BUCKETS = ["homework", "exams", "documents", "materials", "lesson-files"] as const;
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

/**
 * Tạo Signed URL tải xuống có thời hạn ngắn (mặc định 900 giây = 15 phút)
 * Đảm bảo chỉ cấp URL sau khi đã xác thực người dùng server-side.
 */
export async function getSignedDownloadUrl(
  bucket: string,
  filePath: string,
  expiresInSeconds: number = 900
): Promise<string> {
  if (!filePath) {
    throw new AccessError(400, "Đường dẫn tệp tin không hợp lệ.", "INVALID_PATH");
  }

  const db = createAdminClient();
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error(`[STORAGE] Error creating signed URL for ${bucket}/${filePath}:`, error);
    throw new AccessError(404, "Không thể tạo liên kết tải tệp tin.", "STORAGE_ERROR");
  }

  return data.signedUrl;
}

/**
 * Tải lên tệp tin vào bucket riêng tư sử dụng Supabase Admin Client
 */
export async function uploadPrivateFile(
  bucket: PrivateBucket,
  filePath: string,
  fileBody: Buffer | Uint8Array | Blob,
  contentType?: string
): Promise<{ path: string }> {
  const db = createAdminClient();

  const { data, error } = await db.storage
    .from(bucket)
    .upload(filePath, fileBody, {
      contentType: contentType || "application/octet-stream",
      upsert: true,
    });

  if (error || !data) {
    console.error(`[STORAGE] Error uploading to ${bucket}/${filePath}:`, error);
    throw new AccessError(500, "Tải tệp tin lên thất bại.", "UPLOAD_FAILED");
  }

  return { path: data.path };
}

/**
 * Xóa tệp tin khỏi bucket riêng tư
 */
export async function deletePrivateFile(bucket: PrivateBucket, filePath: string): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db.storage.from(bucket).remove([filePath]);
  if (error) {
    console.error(`[STORAGE] Error deleting from ${bucket}/${filePath}:`, error);
    return false;
  }
  return true;
}
