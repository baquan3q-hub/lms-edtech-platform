# Test Plan - LMS EdTech Platform

Last reviewed: 2026-11-25

## Cập nhật hiệu năng 25/11/2026

Đợt 1 nhằm giảm số lượt gọi Supabase nối tiếp trên đường tải chính. Đợt này chỉ sửa code: không có migration, không nới quyền, không đổi dữ liệu trả về. Nguyên nhân và kế hoạch Đợt 2 nằm trong [rà soát hiệu năng 25/11](RA_SOAT_HIEU_NANG_2026-11-25.md).

Test unit mới:
- `tests/unit/actor_scope_prefetch.test.ts` (4 test):
  - Phạm vi giáo viên chỉ giữ dòng thuộc trường đã chọn và còn hiệu lực; bỏ phân công đã hết hạn.
  - Không có gợi ý vai trò thì phạm vi vẫn được tải sau.
  - Gợi ý `teacher` gửi kèm request của học sinh không cấp vai trò giáo viên.
  - Khi có gợi ý, query phạm vi được gửi trước batch đầu.
- `tests/unit/class_scope.test.ts` (5 test):
  - Lớp không tồn tại trả 404; lớp của trường khác trả 403.
  - Admin được vào, trừ chế độ `learn`.
  - Giáo viên được phân công và chủ lớp cũ (khi lớp chưa có phân công) được vào. Chủ lớp cũ đã bị phân công khác thay thế thì bị chặn.
  - Học sinh có ghi danh được `learn` nhưng không được `teach`.
  - Phụ huynh đã xác minh chỉ được `read`; liên kết đang chờ duyệt bị chặn.

Đếm query thủ công (chưa có số đo trước/sau trên Supabase thật):

```bash
LMS_TRACE_DB=1 npm run dev
# Mở lần lượt /parent, /teacher, /teacher/classes/<id>, /admin, /student
# Đếm các dòng "[db]" và cộng thời gian của mỗi lần tải trang
```

Ghi số lượt gọi và tổng thời gian vào bản rà soát 25/11 trước khi làm Đợt 2. Mục tiêu tham chiếu vẫn là p95 dashboard ≤ 3 s, như kế hoạch 04/11.

## Cập nhật hiệu năng và Auth 04/11/2026

Sau yêu cầu dựng lại một trường: `npm test` đạt **146/146**. Sáu test clean-reset kiểm tra dựng rỗng, guard Storage, transaction, quy mô 200/15/1 và quyền đọc trường/lớp. Đã thử Auth/PostgREST thật theo ba vai trò; chưa thử UI production do Vercel trả DEPLOYMENT_PAUSED. Chi tiết và tài khoản lưu riêng tại [biên bản dựng lại](DUNG_LAI_DATABASE_MOT_TRUONG_2026-11-04.md).

- `npm run typecheck`: đạt sau thay đổi helper Auth dùng chung.
- `npx vitest run tests/unit/actor_resolution.test.ts tests/unit/actor_context.test.ts tests/unit/student_auth.test.ts`: 14/14 đạt. Có kiểm tra bearer token, lỗi Auth dù trả user, header sai, membership/activation và phạm vi trường.
- `npm run db:inventory`: kết nối thật chỉ đọc, 95 resource/15 RPC; các hợp đồng mới chưa xuất hiện trên API.
- `npm run db:performance`: GET metadata + HEAD giới hạn, không trả nội dung hàng; chỉ là đo mạng/API bằng service role, chưa phải benchmark dashboard/RLS.
- SQL ứng viên 8 index đã chạy hai lần trên PostgreSQL cục bộ PGlite sau canonical migration chain; script catalog chạy được trong transaction chỉ đọc (12 result set gồm lệnh điều khiển). Chỉ chứng minh tính hợp lệ/tái chạy ở local, chưa chứng minh cần index hoặc tăng tốc DB thật.
- Gate còn lại: [kế hoạch đo bốn portal, SQL/index và RLS](RA_SOAT_KIEN_TRUC_VA_HIEU_NANG_2026-11-04.md). Chưa có kết quả p95 trước/sau hoặc nghiệm thu trên Supabase staging.

## 1. Mục tiêu kiểm thử

Đảm bảo các workflow lõi của LMS hoạt động đúng theo role, không rò rỉ dữ liệu giữa người dùng, và các tích hợp AI/payment có fallback rõ khi lỗi.

`package.json` hiện có typecheck, lint, Vitest, integration/database, worker và Playwright. Các checklist legacy bên dưới bổ sung tình huống; trạng thái thực thi gần nhất của lần tái thiết nằm trong `REBUILD_K12_IMPLEMENTATION.md`.

## 2. Lệnh kiểm tra hiện có

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run test:e2e
npm run build
```

Kiểm tra kết nối chỉ đọc:

```bash
npm run db:inventory
npm run db:performance
```

## 3. Test matrix theo role

| Role | Smoke test bắt buộc |
|---|---|
| Guest | Vào dashboard bị redirect `/login`; vào `/login` được |
| Admin | Vào `/admin`; quản lý user/course/class; xem finance/attendance/analytics |
| Teacher | Vào `/teacher`; chỉ thấy lớp mình; tạo content/homework/exam; điểm danh; chấm bài |
| Student | Vào `/student`; chỉ thấy lớp đã enroll; học bài; nộp homework/exam; xem điểm |
| Parent | Vào `/parent`; chỉ thấy con đã link; xem progress/schedule/payment; gửi xin nghỉ |

## 4. Auth/RBAC tests

| Case | Kỳ vọng |
|---|---|
| User chưa login mở `/admin` | Redirect về `/login?redirectTo=/admin` |
| Student mở `/teacher` | Redirect về `/student` |
| Parent gọi API/Action dữ liệu student không liên kết | Forbidden hoặc không có dữ liệu |
| Teacher mở class không thuộc mình | Forbidden hoặc not found |
| API `/api/*` bị gọi trực tiếp | Endpoint tự kiểm quyền, không dựa vào proxy |
| Server Action bị POST trực tiếp khi chưa login hoặc sai vai trò | Bị từ chối (401/403 hoặc `{ error }`). `tests/unit/server_action_guards.test.ts` fail nếu một action dùng `createAdminClient()`/`getGeminiModel()` mà thiếu guard |
| Duyệt bản nháp AI với `reviewerId` của người khác hoặc job khác trường | Bị từ chối, job giữ trạng thái `draft` (`tests/integration/phase6_ai.test.ts`) |
| `requireSelfOrRoles`, `requireRowClassAccess` | Chặn user khác trường, bản ghi không tồn tại (404), lớp không thuộc người gọi (403) (`tests/unit/authorize_helpers.test.ts`) |
| `GET /api/schools/[schoolId]` với key thiếu, sai, đã thu hồi, của trường khác, key cũ tính từ salt, hoặc `schoolId` không tồn tại | 401 `INVALID_API_KEY`, cùng một thông báo; key đúng trả 200 `{ ok, data }` (`tests/unit/school_api_keys.test.ts`) |
| Xoay vòng/thu hồi API key trường | Chỉ Super Admin; key cũ hết hiệu lực ngay; DB chỉ chứa bản băm; có `audit_events` (`tests/unit/school_api_keys.test.ts`) |
| Bảng `school_api_keys` | Tối đa một key hiệu lực mỗi trường; `key_hash` phải là hex 64 ký tự; admin chỉ đọc key trường mình; giáo viên không thấy; `authenticated`/`anon` không ghi được (`tests/integration/school_api_keys.test.ts`) |

## 5. Academic flow tests

1. Admin tạo course.
2. Admin tạo class, gán teacher.
3. Admin enroll student.
4. Teacher thấy class trong dashboard.
5. Student thấy class trong dashboard.
6. Parent chỉ thấy class sau khi link đúng student.

Kiểm tra DB: `courses`, `classes`, `enrollments`, `parent_students`.

## 6. Content/learning tests

1. Teacher tạo section/item trong course builder.
2. Teacher thêm content và publish.
3. Student mở learn page và xem đúng content.
4. Student hoàn thành item hoặc làm quiz.
5. Progress/activity được ghi.

Kiểm tra DB: `course_items`, `item_contents`, `student_progress`, `student_activity_logs`.

## 7. Homework/exam tests

| Flow | Kỳ vọng |
|---|---|
| Teacher tạo homework | Student trong lớp nhìn thấy |
| Student submit homework | Submission lưu đúng student/class/homework |
| Teacher grade homework | Student/Parent thấy điểm khi được phép |
| Teacher tạo exam strict mode | Student làm bài theo setting |
| AI phân tích exam | Lưu analysis, UI không crash khi AI lỗi |

Kiểm tra DB: `homework`, `homework_submissions`, `exams`, `exam_submissions`, `quiz_class_analysis`, `quiz_individual_analysis`.

## 8. Attendance tests

1. Teacher mở điểm danh cho class/date.
2. Hệ thống tạo hoặc lấy attendance session.
3. Teacher đánh trạng thái present/absent/late/excused.
4. Parent gửi đơn xin nghỉ.
5. Teacher/Admin duyệt đơn.
6. Admin export hoặc xem overview.

Kiểm tra DB: `attendance_sessions`, `attendance_records`, `absence_requests`, `attendance_points`.

## 9. Payment tests

| Case | Kỳ vọng |
|---|---|
| Parent xem invoice | Chỉ thấy invoice của con đã link |
| Tạo Stripe payment | PaymentIntent tạo server-side, amount không tin từ client; mã đơn = PaymentIntent id; không gửi tên học sinh (`tests/unit/payment_service.test.ts`) |
| Tạo VNPay payment | Mỗi lần thử có `vnp_TxnRef` riêng (32 hex); `vnp_CreateDate`/`vnp_ExpireDate` theo GMT+7, hết hạn sau 15 phút; số tiền lấy từ hoá đơn (`tests/unit/payment_webhooks.test.ts`, `payment_service.test.ts`) |
| Tạo payment/xác nhận chuyển khoản cho hoá đơn trường khác, hoặc giám hộ chưa xác minh/đã thu hồi/hết hạn | 404 với hoá đơn trường khác, 403 với giám hộ không hợp lệ; không tạo bản ghi (`payment_service.test.ts`) |
| Stripe webhook thành công | Payment và invoice cập nhật trong một transaction; gửi lại cùng `event.id` không đổi gì; sai chữ ký 400; lỗi DB 500 để Stripe gửi lại; không khớp đơn hoặc lệch số tiền trả 200 và ghi log (`payment_webhooks.test.ts`, `tests/integration/payment_confirmation.test.ts`) |
| Stripe `payment_failed` rồi `succeeded` cho cùng PaymentIntent | Payment chuyển `failed` rồi `succeeded`, invoice `paid` |
| VNPay IPN | Sai chữ ký `97`; số tiền lệch `04` (payment giữ `pending`); đơn đã xử lý `02`; không thấy đơn `01`; lỗi DB `99`; trả JSON `{ RspCode, Message }` |
| RPC `confirm_provider_payment` | Chỉ `service_role` gọi được; chỉ báo phụ huynh đã xác minh; có `audit_events` khi xác nhận hoặc lệch số tiền (`payment_confirmation.test.ts`) |
| Manual transfer | Admin duyệt trước khi invoice paid; hai yêu cầu cùng lúc chỉ một cái đổi trạng thái (409 cho cái sau) |

Không test bằng key production trong local.

## 10. AI tests

| Case | Kỳ vọng |
|---|---|
| Thiếu `GEMINI_API_KEY` | UI/API báo lỗi mềm, không crash toàn trang |
| Gemini trả text không phải JSON | Retry hoặc trả lỗi parse rõ |
| Rate limit 429/503 | Retry/backoff, thông báo thử lại |
| Batch individual analysis | Không ghi partial data sai; có trạng thái xử lý |
| Feedback gửi cho student/parent | Chỉ teacher/admin có quyền gửi |

## 11. Realtime/PWA tests

- Notification mới hiện trong bell mà không reload.
- Attendance/announcement cập nhật đúng sau mutation.
- PWA install được trên mobile.
- Service worker không cache dữ liệu nhạy cảm sai thời gian.
- Sau deploy mới, app không bị kẹt service worker cũ.

## 12. Regression checklist trước release

- `npm run lint` pass.
- `npm run build` pass.
- Login bằng đủ 4 role.
- CRUD class/course/enrollment cơ bản pass.
- Teacher tạo content và student học được.
- Homework/exam submit và grade pass.
- Attendance và absence request pass.
- Payment sandbox pass hoặc được mock có kiểm chứng.
- AI route quan trọng có fallback khi API key/rate limit lỗi.

