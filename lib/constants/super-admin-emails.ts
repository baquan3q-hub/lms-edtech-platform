// ============================================================
// Constants: Danh sách email Super Admin toàn hệ thống
// ============================================================
// Tách riêng thành module hằng số để lib/auth/super-admin.ts và
// lib/auth/actor-context.ts dùng chung mà không tạo import vòng.
//
// BẢO MẬT: Đây là nguồn chuẩn duy nhất cho quyền Super Admin, bên cạnh
// cột `role` trong bảng public.users. Không bao giờ suy ra quyền này từ
// `user_metadata` vì client tự ghi được trường đó.

export const SUPER_ADMIN_EMAILS = [
    "boiquan401@gmail.com",
    "superadmin@demo.com",
];
