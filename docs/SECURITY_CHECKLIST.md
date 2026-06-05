# Security Checklist - LMS EdTech Platform

Last reviewed: 2026-05-27

## 1. Nguyên tắc

Hệ thống xử lý dữ liệu học sinh, phụ huynh, điểm số, chuyên cần, hành vi học tập và thanh toán. Mọi thay đổi liên quan auth, role, database, AI, payment phải được xem là nhạy cảm.

## 2. Secrets và environment

Các biến môi trường đang được code sử dụng:

| Env var | Mục đích | Quy tắc |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL public | Được expose client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Được expose client, phải dựa vào RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS server-side | Không bao giờ expose client |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_1..5` | Gemini AI | Server-only |
| `OPENAI_API_KEY` | Fallback cũ trong `lib/gemini.ts` | Server-only, nên đổi tên nếu không dùng OpenAI |
| `STRIPE_SECRET_KEY` | Stripe server client | Server-only |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhook | Server-only |
| `VNPAY_TMN_CODE` | Merchant code | Server-only |
| `VNPAY_HASH_SECRET` | Verify/sign VNPay | Server-only |
| `NEXT_PUBLIC_APP_URL` | URL app cho callback | Public nhưng phải đúng domain |
| `RESEND_API_KEY` | Email provider | Server-only |

Checklist:

- Không commit `.env.local`.
- Không log secret hoặc full provider response chứa token.
- Không dùng service role trong Client Component.
- Không truyền secret qua props xuống client.

## 3. Auth/RBAC

- `proxy.ts` chỉ bảo vệ page routes; `/api` bị ignore nên API phải tự kiểm quyền.
- Mọi Server Action phải xác định user hiện tại bằng Supabase server client hoặc admin client có kiểm quyền.
- Không tin `role` từ client payload.
- Teacher chỉ được thao tác class có `teacher_id` là user hiện tại hoặc được gán thay thế.
- Parent chỉ được xem student có quan hệ trong `parent_students`.
- Student chỉ được thao tác submission/progress/activity của chính mình.

## 4. RLS

RLS là lớp phòng thủ bắt buộc vì anon key tồn tại ở client.

Audit cần làm:

- Tìm và xử lý các đoạn `DISABLE ROW LEVEL SECURITY`.
- Tìm policy `USING (true)` hoặc `WITH CHECK (true)` trên bảng nhạy cảm.
- Đảm bảo bảng payment, submissions, grades, attendance, activity logs có policy theo owner/role.
- Kiểm tra policy parent-child không cho parent xem nhầm học sinh khác.
- Kiểm tra storage policies cho video/document/file upload.

## 5. API và Server Actions

Mỗi endpoint/action ghi dữ liệu cần có:

- Session check.
- Role check.
- Ownership check.
- Input validation bằng Zod hoặc kiểm tra rõ.
- Error response không lộ stack trace/secret.
- Idempotency nếu endpoint có thể bị gọi lại.

Đặc biệt cần kiểm:

- `/api/payment/*`
- `/api/ai/*`
- `/api/activity/*`
- `/api/notifications`
- Actions dùng `createAdminClient()`.

## 6. Payment security

Stripe:

- Verify webhook signature bằng `STRIPE_WEBHOOK_SECRET`.
- Không tin amount/currency/status từ client.
- PaymentIntent metadata phải đủ để map invoice nhưng không chứa PII quá mức.
- Webhook phải idempotent theo event id/payment intent id.

VNPay:

- Verify `vnp_SecureHash` trước khi cập nhật payment.
- Đối chiếu amount/order id/invoice id server-side.
- Không đánh dấu paid nếu hash sai hoặc response code không thành công.
- Log giao dịch tối thiểu để đối soát.

Manual transfer:

- Parent chỉ gửi yêu cầu xác nhận.
- Admin mới được duyệt paid.

## 7. AI security

- Không gửi dữ liệu cá nhân không cần thiết vào prompt.
- Không để AI tự quyết định điểm số hoặc kỷ luật học sinh mà không có rule/human review.
- AI output phải parse/validate schema trước khi lưu.
- Prompt injection có thể đến từ nội dung bài học, phản hồi user, file upload; không đưa instruction từ user content vào system logic.
- Rate limit các endpoint AI để tránh lạm dụng quota.

## 8. File upload/storage

- Chỉ cho phép loại file cần thiết.
- Giới hạn size.
- Không dùng file name gốc làm path duy nhất.
- Với tài liệu riêng tư, không dùng public bucket nếu không cần.
- Kiểm tra quyền xóa/update: owner, teacher của lớp, hoặc admin.

## 9. PWA/cache

- Không cache dữ liệu nhạy cảm dài hạn ở service worker.
- Sau logout, dọn client state nhạy cảm.
- Kiểm tra Supabase NetworkFirst cache không hiển thị dữ liệu user cũ sau đổi tài khoản.

## 10. Release security gate

Trước khi release production:

- Audit tất cả env vars.
- Chạy lint/build.
- Test login đủ 4 role.
- Test API direct call unauthorized/forbidden.
- Test RLS bằng anon client nếu có thể.
- Test Stripe/VNPay sandbox với signature/hash đúng và sai.
- Kiểm tra không có secret trong log, docs, client bundle.

