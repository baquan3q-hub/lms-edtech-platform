@AGENTS.md

# LMS EdTech K12

LMS cho một trường K12, có 5 vai trò: super_admin, admin, teacher, student, parent. Stack: Next.js 16 (App Router, chạy bằng webpack), React 19, Supabase (Postgres + RLS), Stripe và VNPay, Gemini. Ngoài ra có worker analytics viết bằng Python ở `workers/analytics`. Giao diện viết bằng tiếng Việt.

Toàn bộ quy tắc nằm trong `docs/SYSTEM_RULES.md`. Đọc file đó trước khi đụng tới auth, database, payment hoặc AI.

## Lệnh

- Kiểm tra trước khi xong việc: `npm run typecheck`, `npm run lint`, `npm test`
- Test DB (PGlite, không cần Supabase thật): `npm run test:integration`, `npm run test:db`
- Worker Python: `npm run test:worker` (cần `uv`)
- E2E: `npm run test:e2e` (tự chạy dev server ở cổng 3100)
- CI (`.github/workflows/quality.yml`) build **không có** `SUPABASE_SERVICE_ROLE_KEY`. Trang nào cần secret thì phải render lúc request, không được render lúc build.

## Kiến trúc

- Nghiệp vụ mới đặt ở `lib/modules/<domain>/`. Server Action và route `/api/v1` cùng gọi một service đó. `lib/actions/` là code cũ, chỉ chuyển dần sang, không mở rộng thêm.
- Route API phải bọc bằng `api()`, đọc body bằng `jsonBody(request, zodSchema)` và gọi `requireSameOrigin` (cả ba ở `lib/api/http.ts`).
- Kiểm quyền dùng các helper trong `lib/auth/authorize.ts`: `requireActor`, `requireSchoolActor`, `requireClassAccess`, `requireStudentAccess`... Ném lỗi bằng `AccessError`.
- Tài liệu tính năng nằm trong `docs/`. Thay đổi lớn phải cập nhật ít nhất một file trong `ARCHITECTURE.md`, `TEST_PLAN.md` và các tài liệu liên quan (quy tắc A5).

## Bảo mật (bắt buộc)

- `proxy.ts` **bỏ qua `/api`**, nên mọi route phải tự kiểm session, vai trò, quyền sở hữu và `school_id`.
- Không lấy quyền từ `role` gửi lên từ client hay từ `user_metadata`. Quyền đọc từ membership và phân công trong DB.
- `createAdminClient()` (`lib/supabase/admin.ts`) bỏ qua RLS. Chỉ dùng phía server, **sau khi** đã kiểm actor, và luôn lọc theo `schoolId`.
- Webhook thanh toán phải xác thực chữ ký (Stripe hoặc HMAC-SHA512 của VNPay) và chống xử lý trùng theo event/order ID. Số tiền và trạng thái lấy từ provider, không lấy từ client.
- Kết quả AI phải parse và validate bằng schema trước khi lưu. AI không tự quyết điểm hay kỷ luật. Không gửi PII thừa vào prompt.
- Lỗi trả về client có dạng `{ error, message? }` và không lộ stack trace, SQL hay secret.

## Database

- Thứ tự áp migration là `supabase/migration-order.json`, **không** theo tên file.
- Muốn đổi schema thì tạo `supabase/migrations/YYYYMMDDNNNN_ten.sql` mới và thêm vào cuối `migration-order.json`. Migration đã commit thì không sửa (hook sẽ chặn).
- Bảng mới phải bật RLS và có policy theo trường. Ưu tiên `ALTER TABLE ... ADD COLUMN` hơn tạo bảng trùng ý nghĩa.
- Thêm test integration trong `tests/integration/` khi đổi policy hoặc schema.

## Hook trong repo

`.claude/settings.json` có hai hook:
- Chặn sửa `.env*`, `package-lock.json` và migration đã commit.
- Tự chạy `eslint --fix` trên file vừa sửa. Nếu còn lỗi, hook trả lỗi về để sửa tiếp.
