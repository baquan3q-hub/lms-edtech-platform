# Rà soát bảo mật và đề xuất nâng cấp — 25/11/2026

Bản này bổ sung cho [RA_SOAT_KIEN_TRUC_VA_HIEU_NANG_2026-11-04.md](RA_SOAT_KIEN_TRUC_VA_HIEU_NANG_2026-11-04.md). Bản 04/11 tập trung vào database và hiệu năng. Bản này tập trung vào **tầng ứng dụng**: Server Action, route API, thanh toán, dependency và công cụ kiểm tra.

Cách làm: đọc mã nguồn và migration; chạy `npm run typecheck`, `eslint`, `npm test`, `npm audit --omit=dev`; quét bằng script từng hàm `export async function` trong các file `"use server"`. Không kết nối database thật, không chạy ứng dụng và không sửa mã nguồn.

## Kết luận

Database đã được siết đúng hướng: migration `202611030003_access_policies.sql` xoá các policy cũ, thay bằng policy theo trường, lớp và quan hệ giám hộ đã xác minh, và không còn đọc quyền từ `user_metadata`. **Lỗ hổng lớn nhất nằm ở tầng ứng dụng.** Nhiều Server Action cũ dùng `createAdminClient()`, tức là bỏ qua RLS, mà không kiểm người gọi là ai.

Server Action là endpoint HTTP công khai: ai có action ID đều gọi được, và action ID nằm trong bundle JS gửi xuống trình duyệt. `proxy.ts` để khách vào `/` và `/login`, nên **người chưa đăng nhập cũng gọi được** các action này bằng cách POST tới các trang đó.

Code kiểu mới (`lib/modules/*` cùng `lib/auth/authorize.ts` và `lib/api/http.ts`) làm đúng. Gốc của vấn đề là có hai kiến trúc chạy song song, và phần code cũ chưa được bảo vệ.

## P0 — Sửa ngay

### 1. Server Action dùng admin client mà không kiểm quyền

> **Trạng thái 25/11/2026: đã sửa.**
> - Có guard ở 105 action: 101 chèn bằng codemod, cộng 3 hàm `ai-review` và `generateParentAIInsight`. Một số hàm được sửa tay:
>   - `ai-review`: `reviewerId`/`teacherId` phải trùng người đăng nhập, job và ca can thiệp phải cùng trường.
>   - `getAbsenceRequests`: phụ huynh chỉ thấy đơn của mình, giáo viên phải chọn lớp mình dạy.
>   - `fetchSurveyDetail`: khảo sát theo lớp chỉ người trong lớp xem được.
>   - `updateUserProfile`: dùng `requireManagedUser` và chỉ nhận `full_name`, `phone`, để chặn việc gửi kèm `role`.
>   - `removeStudentFromClass`, `updateEnrollmentStatus`, `deleteClassSchedule`: thêm `.eq("class_id", classId)`.
>   - `createUser`: bỏ email khỏi log. `user_metadata.role` vẫn giữ, vì `proxy.ts` và `app/page.tsx` dùng nó làm gợi ý điều hướng, không dùng để cấp quyền.
> - Có thêm hai helper trong `lib/auth/authorize.ts`:
>   - `requireSelfOrRoles(userId, roles)`: người gọi là chính `userId`, hoặc có vai trò phù hợp và `userId` cùng trường.
>   - `requireRowClassAccess(table, id, mode)`: tra lớp sở hữu bản ghi rồi kiểm quyền lớp.
> - Có test chặn hồi quy `tests/unit/server_action_guards.test.ts`: action export nào gọi `createAdminClient()` hoặc `getGeminiModel()` mà không có guard thì test fail. Ngoại lệ chỉ có `loginAction` và `submitContactRequest`.
> - Còn lại (P1):
>   - Một số action cũ chỉ kiểm "đã đăng nhập" (`getCurrentUser`) cộng `users.role`/`teacher_id`, chưa dùng membership. Ví dụ: phần lớn `attendance.ts`, `student-reviews.ts`.
>   - Các truy vấn danh sách của admin chưa lọc theo `school_id`. Hiện chưa ảnh hưởng vì đang pilot một trường.

Các trường hợp nghiêm trọng nhất, đã đọc mã để xác nhận:

| Action | Hệ quả |
|---|---|
| `app/(dashboard)/admin/users/actions.ts` → `createUser`, `bulkCreateUsers` | Ai cũng tạo được tài khoản, **kể cả `role: "admin"`**, và email được xác nhận sẵn |
| `…/admin/users/actions.ts` → `fetchUsers` | Lấy được toàn bộ bảng `users` (`select *`) |
| `lib/actions/parentStudent.ts` → `linkParentToStudent`, `bulkLinkParentStudents`, `generateInviteCode`, `unlinkParent` | Tự liên kết mình làm phụ huynh của bất kỳ học sinh nào, từ đó xem được dữ liệu của con |
| `lib/actions/profile.ts` → `updateUserProfile(userId, …)` | Sửa được hồ sơ của bất kỳ ai |
| `…/admin/classes/actions.ts` → `deleteClass`; `…/admin/courses/actions.ts` → `deleteCourse`; `lib/actions/schedule.ts` → `deleteRoom`, `resetClassSessions` | Xoá được dữ liệu học vụ |
| `lib/actions/ai-review.ts` → `approveAiJobAction`, `rejectAiJobAction` | Duyệt nội dung AI với `reviewerId` do client tự gửi lên |
| `lib/actions/class-students.ts` → `getClassStudentsWithStats`; `lib/actions/daily-activity.ts` → `fetchStudentDailyActivity` | Đọc được tên, email và hoạt động của học sinh ở mọi lớp |
| `lib/actions/gemini-analysis.ts` → `generateStudentInsight`; `class-students.ts` → `generateClassAIReport`; `parent-progress.ts` → `generateParentAIInsight` | Gọi Gemini không giới hạn, tốn chi phí, và ghi đè dữ liệu |

Danh sách đầy đủ có ở phụ lục A. Script quét dựa theo mẫu nên có thể nhận nhầm vài trường hợp:
- Có hàm công khai là có chủ đích: `loginAction`, `submitContactRequest`, có thể cả `lookupInviteCode`.
- `canParentViewStudent` là hàm hỗ trợ (helper), không phải action.

**Cách sửa:**

1. Gắn guard vào đầu mỗi action: `requireSchoolActor(["admin"])`, `requireClassAccess(classId, "teach")`, `requireStudentAccess(studentId)`… Sau đó lọc dữ liệu theo `actor.schoolId`. Không nhận `userId` hay `reviewerId` từ client nữa, mà lấy từ actor.
2. Hàm hỗ trợ (helper) không phải action thì chuyển sang file `import "server-only"` không có `"use server"`, để Next không tạo endpoint cho nó.
3. Thêm một test chặn hồi quy chạy trong CI: quét mọi file `"use server"`, và nếu một hàm export gọi `createAdminClient()` mà không gọi `require*` thì test fail. Có danh sách ngoại lệ ghi rõ lý do. Bản nháp của script nằm ở `tmp/scan-actions.mjs`.
4. `createUser` ngoài ra còn ghi `role` vào `user_metadata` và `console.log` email người dùng. Nên bỏ cả hai.

### 2. API key của trường tự tính được

> **Trạng thái 25/11/2026: đã sửa.**
> - Bảng mới `school_api_keys` (migration `202611250001_school_api_keys.sql`) chỉ lưu SHA-256 của key, tiền tố để hiển thị, thời điểm tạo, lần dùng cuối và thời điểm thu hồi. Mỗi trường có tối đa một key còn hiệu lực (unique index một phần). RLS cho admin của trường chỉ đọc metadata của trường mình; chỉ service role được ghi.
> - `lib/modules/school-api-keys/service.ts`: key là `sch_live_` + `randomBytes(32)` dạng base64url; so sánh bằng `timingSafeEqual`; xoay vòng và thu hồi chỉ dành cho Super Admin và có ghi `audit_events`. Key gốc chỉ trả về một lần lúc tạo.
> - `GET /api/schools/[schoolId]` nhận key qua `x-school-api-key` hoặc `Authorization: Bearer`, và kiểm key trước khi tra trường. Vì vậy key sai và trường không tồn tại cùng trả 401 `INVALID_API_KEY`, không dò được `school_id`. Route được bọc `api()`, nên body đổi từ `{ success, data }` sang `{ ok, data, requestId }`.
> - Giao diện: component `SchoolApiKeyManager` (tạo, xoay vòng, thu hồi; key mới hiện đúng một lần) được dùng ở `/admin/schools` và trang chi tiết trường của Super Admin. Trang `api-gateway` chỉ hiện tiền tố.
> - **Ảnh hưởng khi triển khai:** mọi key cũ tính từ salt đều hết hiệu lực. Super Admin cần tạo key mới cho từng trường đang tích hợp và báo cho hệ thống tích hợp đổi key, đồng thời đọc `ok`/`data` thay cho `success`/`data`.
> - Test: `tests/unit/school_api_keys.test.ts` (service và route), `tests/integration/school_api_keys.test.ts` (ràng buộc và RLS trên PGlite).

`app/api/schools/[schoolId]/route.ts`, `lib/actions/schools.ts` và `lib/actions/super-admin.ts` sinh key bằng `sha256("eduschool_salt_2026_" + schoolId + code)`. Salt ghi cứng trong mã nguồn, nên ai biết `schoolId` và mã trường là tự tính ra key, và cũng không thu hồi được key. Ngoài ra, phép so sánh key không chạy trong thời gian cố định (không dùng `timingSafeEqual`).

**Cách sửa:** sinh key ngẫu nhiên (`crypto.randomBytes(32)`), chỉ lưu bản băm trong DB, so sánh bằng `crypto.timingSafeEqual`, và có nút xoay vòng hoặc thu hồi key.

### 3. Thanh toán VNPay và Stripe

> **Trạng thái 25/11/2026: đã sửa.**
> - Migration `202611250002_payment_confirmation.sql`:
>   - Unique index `payments(provider, provider_order_id)`.
>   - Bảng `payment_provider_events` (unique `provider, event_id`, có RLS, admin chỉ đọc sự kiện của trường mình).
>   - RPC `confirm_provider_payment` (`SECURITY DEFINER`, chỉ `service_role` gọi được). RPC khoá payment và invoice, kiểm số tiền và tiền tệ, cập nhật hai bảng, báo phụ huynh đã xác minh và ghi `audit_events`, tất cả trong một transaction.
>   - Không dùng `idempotency_keys`, vì bảng đó bắt buộc `actor_id` và hết hạn sau 24 giờ, trong khi Stripe gửi lại tới 3 ngày.
> - `lib/vnpay.ts`: ngày theo `Asia/Ho_Chi_Minh`; `vnp_TxnRef` riêng cho mỗi lần thử; so chữ ký bằng `timingSafeEqual`; chỉ coi là thành công khi `vnp_ResponseCode` và `vnp_TransactionStatus` đều là `00`.
> - IPN VNPay trả JSON `{ RspCode, Message }`:
>   - `97` khi sai chữ ký;
>   - `01` khi không thấy đơn;
>   - `02` khi đơn đã xử lý;
>   - `04` khi lệch số tiền;
>   - `99` khi lỗi DB, để VNPay gọi lại.
> - Webhook Stripe:
>   - Xử lý `payment_intent.succeeded` và `payment_intent.payment_failed`, tra đơn theo PaymentIntent id thay vì "payment pending đầu tiên của hoá đơn".
>   - Sự kiện trùng, không khớp đơn hoặc lệch số tiền trả 200 kèm log. Lỗi DB trả 500.
> - `lib/modules/payments/service.ts` (`requireInvoicePayer`): `create` và `confirm-transfer` yêu cầu vai trò phụ huynh lấy từ membership, giám hộ `verified` còn hiệu lực, và hoá đơn cùng `school_id`. Hai route này được bọc `api()` + `jsonBody` + `requireSameOrigin`.
> - Sửa thêm:
>   - `create` trước đây đọc hoá đơn bằng client theo session, trong khi `invoices` không có policy RLS nào, nên luôn trả 404. Nay dùng admin client sau khi đã kiểm quyền.
>   - Payment mới có `school_id`.
>   - Không gửi tên học sinh sang Stripe.
>   - Tạo lần thanh toán không còn đổi hoá đơn sang `pending`; `pending` chỉ còn nghĩa là "đã báo chuyển khoản, chờ admin duyệt".
>   - Thông báo dùng đúng cột `is_read`; code cũ ghi `read` nên lệnh insert bị lỗi mà không ai biết.
> - **Ảnh hưởng khi triển khai:**
>   - Body của `create` và `confirm-transfer` đổi sang `{ ok, data | error }`; trang phụ huynh đã cập nhật theo.
>   - Webhook Stripe cần bật thêm sự kiện `payment_intent.payment_failed`.
>   - Payment Stripe tạo trước bản này có `provider_order_id` dạng cũ nên webhook sẽ không khớp; cần đối soát tay nếu còn đơn đang treo.
> - Chưa làm (P1): `parent/invoices`, `admin/data` và `admin/actions` vẫn đọc quyền từ `users.role` và không lọc theo `school_id`; `invoices`, `payments` và `fee_plans` chưa có policy RLS.
> - Test: `tests/unit/payment_webhooks.test.ts`, `tests/unit/payment_service.test.ts`, `tests/integration/payment_confirmation.test.ts`.

| Vấn đề | Vị trí | Hệ quả |
|---|---|---|
| `vnp_CreateDate` và `vnp_ExpireDate` lấy từ `toISOString()`, tức giờ UTC, trong khi VNPay yêu cầu GMT+7 | `lib/vnpay.ts` | Thời hạn gửi sang VNPay bị lùi khoảng 6 giờ 45 phút về quá khứ, nên giao dịch rất có thể bị báo hết hạn ngay |
| `vnp_TxnRef = orderId.slice(0, 8)`, tức 8 ký tự đầu của `invoiceId` | `lib/vnpay.ts`, `api/payment/create` | Mọi lần thử thanh toán cùng một hoá đơn có chung TxnRef. VNPay có thể từ chối vì trùng đơn, và IPN `like 'txnRef%'` có thể khớp nhầm bản ghi |
| IPN không so `vnp_Amount` với số tiền trong DB, và không trả mã `02` khi đơn đã xác nhận | `api/payment/vnpay/ipn` | Vi phạm quy tắc B17 và B18 |
| Webhook Stripe bỏ qua lỗi khi `update`, và trả 404 khi không còn payment `pending` | `api/payment/stripe/webhook` | Ghi DB lỗi mà vẫn trả 200 thì mất giao dịch. Lần Stripe gửi lại hợp lệ thì nhận 404 và Stripe tiếp tục gửi lại nhiều ngày |
| Cập nhật `payments` và `invoices` không nằm trong một transaction | Cả hai webhook | Có thể lệch trạng thái giữa hai bảng |
| `confirm-transfer` đọc quyền từ `users.role`, không kiểm `verification_status`, hiệu lực hay `school_id` của `parent_students` | `api/payment/parent/confirm-transfer` | Yếu hơn hẳn policy ở DB |

**Cách sửa:**
- Định dạng ngày theo `Asia/Ho_Chi_Minh`.
- Dùng TxnRef riêng cho mỗi lần thanh toán (chữ và số, tối đa 100 ký tự).
- Viết một RPC `confirm_payment(provider, order_id, amount, txn_id)` có `SECURITY DEFINER`, khoá dòng, kiểm số tiền và cập nhật hai bảng trong một transaction. Ghi `event.id` vào bảng `idempotency_keys` đã có sẵn.
- Webhook trả 200 khi sự kiện đã xử lý rồi.

## P1 — Nên làm trong đợt tới

### 4. Dependency (`npm audit --omit=dev`: 40 lỗ hổng, gồm 1 critical và 22 high)

- `npm audit fix` sửa được phần lớn: `zod` (high, GHSA-mrhx-c7xc-m3w5) và các gói đi kèm `@modelcontextprotocol/sdk` như `express`, `proxy-addr` (critical), `hono`.
- **`xlsx@0.18.5`** đã bị bỏ rơi trên npm và có 2 lỗi high (prototype pollution, ReDoS) chưa có bản vá. Gói này đang được dùng để **đọc file Excel do người dùng tải lên** (4 file), nên lỗi khai thác được. Nên chuyển sang bản SheetJS 0.20.x từ CDN chính thức, hoặc sang `exceljs`.
- **`next-pwa@5.6`** không còn được duy trì, kéo theo các lỗ hổng của `workbox` và `serialize-javascript`, và là lý do dự án phải chạy `--webpack`. Nên chuyển sang Serwist (`@serwist/next`).
- `@google/generative-ai`: không còn file nào import. Gỡ đi.
- `shadcn` là CLI nhưng đang nằm trong `dependencies`. Chuyển sang `devDependencies`.

### 5. Công cụ kiểm tra đang hỏng trên máy

- `npm run typecheck` lỗi `TS6053`: `tsconfig.json` nhận `.next/dev/types/**/*.ts`, mà file `.next/dev/types/app/(auth)/layout.ts` đã cũ hoặc không còn. CI clone mới nên không gặp lỗi này. Ở máy, xoá `.next/dev` hoặc bỏ pattern đó khỏi `include`.
- `tests/integration/clean_reset.test.ts`: bước `beforeAll` hết thời gian ở mức mặc định 10 giây, nên 6 test bị bỏ qua. Cần tăng `hookTimeout` cho suite này, vì dựng PGlite với schema đầy đủ mất khoảng 20 giây.
- Lint: 0 lỗi, 87 cảnh báo, phần lớn từ nhóm `react-hooks/*` đang để mức warn.

### 6. Không có error boundary

Cả repo không có file `error.tsx`, `global-error.tsx` hay `not-found.tsx`. Chỉ cần một Server Component ném lỗi là người dùng thấy trang lỗi mặc định bằng tiếng Anh. Nên thêm các file này ở `app/`, ở `app/(dashboard)/` và ở từng portal, viết bằng tiếng Việt, có nút "Thử lại" và có ghi log `digest`.

### 7. Security headers và giới hạn tần suất

- Chưa có `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` hay HSTS. Thêm bằng `headers()` trong `next.config.ts`, hoặc đặt trong `proxy.ts` nếu cần CSP có nonce.
- Chỉ 4 route có giới hạn tần suất. Các route và action gọi Gemini, `loginAction`, kích hoạt tài khoản và tra mã mời đều cần giới hạn theo user và IP. Có thể dùng một bảng đếm trong Postgres; chưa cần thêm Redis.

## P2 — Hiệu năng và nợ kỹ thuật

- Các mục P1 hiệu năng trong bản 04/11 **vẫn chưa xử lý**. `admin/page.tsx` vẫn gom mọi nguồn vào một `Promise.all` với `range = 'all'` mặc định. `analytics-actions.ts` vẫn phân trang `auth.admin.listUsers`. Dashboard phụ huynh vẫn có nhiều `await` nối tiếp.
- `lib/actions` có 49 file kiểu cũ, file lớn nhất là `attendance.ts` với 1.872 dòng. Chuyển dần sang `lib/modules/<domain>` sẽ sửa luôn được P0.1, vì service mới kiểm quyền ngay bên trong. Nên bắt đầu từ các file có rủi ro cao: `users`, `parentStudent`, `profile`, `schedule`, `attendance`.
- Dọn repo:
  - Hai file `202609240000_schema_baseline.sql` và `202609260000_schema_baseline.sql` giống hệt nhau. File 260000 và bốn file `phase*_full_migration.sql` không có trong `migration-order.json`, nên chuyển sang `supabase/archive/`.
  - Thư mục gốc có file nhị phân (`Tiểu luận E-Learning.docx` 13 MB, ảnh drawio), `report.html`, `extracted_doc.txt` và `schema.sql` rỗng.
  - Có 31 lệnh `console.log`, một số in email người dùng.
- Ba route giữ chỗ trả JSON giả: `api/ai`, `api/notifications`, `api/payment`. Nên xoá hoặc trả 404.

## Thứ tự đề xuất

| Đợt | Việc | Xong khi |
|---|---|---|
| 1 | P0.1: guard cho các action ở phụ lục A, bắt đầu từ `users`, `parentStudent`, `profile`, `ai-review`, các action xoá dữ liệu và các action gọi Gemini; thêm test quét vào CI | Test quét đạt; gọi action khi chưa đăng nhập hoặc sai vai trò bị từ chối (403) |
| 2 | P0.2 và P0.3: key trường ngẫu nhiên; sửa VNPay và Stripe bằng RPC trong transaction | Thử trên sandbox VNPay và Stripe CLI: thanh toán, gửi lại, sai số tiền, sai chữ ký |
| 3 | P1.4 và P1.5: cập nhật dependency, sửa typecheck và test | `npm audit --omit=dev` không còn critical/high có bản vá; CI và máy cùng đạt |
| 4 | P1.6 và P1.7: error boundary, security headers, giới hạn tần suất | Kiểm tra header bằng `curl -I`; E2E cho trang lỗi |
| 5 | P2: hiệu năng dashboard theo bản 04/11; chuyển `lib/actions` sang module | Theo các mốc ở bản 04/11 |

## Phụ lục A — Hàm bị script đánh dấu thiếu kiểm quyền

`ADMIN` nghĩa là hàm có gọi `createAdminClient()`. Các hàm còn lại không gọi admin client trực tiếp; nhiều hàm trong số đó chuyển tiếp sang `lib/modules`, nơi đã có guard (ví dụ `academic.ts`, `grading.ts`), nên cần kiểm tay.

**Trong `app/` (đều có `ADMIN`):**
- `(auth)/login/actions.ts`: `loginAction` (công khai có chủ đích)
- `admin/analytics-actions.ts`: `fetchAdminAttendanceSessionsToday`, `fetchDailyActiveUsers`, `fetchDailyAttendanceData`, `fetchDailyStudentPresenceAndAttendance`, `fetchGradeOverviewByGradeAndClass`, `fetchGradesDistribution`, `fetchHomeworkCompletionByGradeAndClass`, `fetchMonthlyRevenueData`, `fetchSmartActionableBehaviorBriefing`, `fetchSubmissionStatus`
- `admin/classes/[id]/students/actions.ts`: `addStudentToClass`, `bulkEnrollStudents`, `fetchAvailableStudents`, `fetchClassEnrollments`, `removeStudentFromClass`, `updateEnrollmentStatus`
- `admin/classes/actions.ts`: `createClass`, `createGrade`, `deleteClass`, `fetchClasses`, `fetchDropdownData`, `updateClass`
- `admin/courses/actions.ts`: `createCourse`, `deleteCourse`, `fetchCourses`, `updateCourse`
- `admin/users/actions.ts`: `bulkCreateUsers`, `createUser`, `fetchUsers`
- `teacher/actions.ts`: `fetchTeacherClasses`, `fetchTeacherNotifications`, `fetchTeacherStats`
- `teacher/classes/[id]/actions.ts`: `fetchClassDetails`, `fetchClassStudents`, `fetchStudentProgressForClass`, `getTodayAttendance`
- `teacher/progress-actions.ts`: `fetchTasksStatus`, `sendProgressReminder`

**Trong `lib/actions/` (`ADMIN`):**
- `admin-announcements.ts`: `fetchAdminAnnouncements`, `fetchCoursesAndClasses`, `getAnnouncementReadDetails`
- `ai-review.ts`: `applyApprovedInterventionAction`, `approveAiJobAction`, `rejectAiJobAction`
- `announcement.ts`: `fetchClassAnnouncements`
- `attendance-points.ts`: `getClassAttendancePoints`, `getClassAttendanceSessions`
- `attendance.ts`: `getAbsenceRequests`, `getAllClassesForAdmin`, `getApprovedAbsencesForDate`, `getAttendanceHistory`, `getAttendanceOverview`, `getAttendanceRecords`, `getAttendanceTrendData`, `getDailyAttendanceOverview`, `getStudentAttendanceHistory`, `getStudentClasses`, `getStudentCrossClassAttendance`, `getTeacherAttendanceStats`
- `class-students.ts`: `fetchClassScoreReport`, `generateClassAIReport`, `getClassStudentsWithStats`, `loadSavedAIReport`, `sendReminderAction`
- `contact.ts`: `submitContactRequest` (công khai có chủ đích, nhưng cần giới hạn tần suất)
- `daily-activity.ts`: `fetchStudentDailyActivity`
- `gemini-analysis.ts`: `generateStudentInsight`
- `goals-habits.ts`: `fetchStudentGoals`, `fetchStudentHabits`
- `notifications.ts`: `createSystemNotification`
- `parentStudent.ts`: `bulkLinkParentStudents`, `canParentViewStudent` (helper), `fetchLinkedParents`, `fetchStudentsForLinking`, `generateInviteCode`, `linkParentToStudent`, `lookupInviteCode`, `searchParents`, `unlinkParent`
- `profile.ts`: `fetchUserProfile`, `updateUserProfile`
- `schedule.ts`: `assignSubstituteTeacher`, `createRoom`, `deleteClassSchedule`, `deleteRoom`, `fetchTeacherAllSessions`, `generateClassSessions`, `getAvailableRooms`, `getClassSchedules`, `getGeneratedSessions`, `getRooms`, `getRoomsWithSchedules`, `reindexClassSessions`, `resetClassSessions`, `updateRoom`, `updateSessionContent`, `upsertClassSchedule`
- `surveys.ts`: `fetchSurveyAnalytics`, `fetchSurveyDetail`, `toggleSurveyActive`
- `teacher-leave.ts`: `getAvailableTeachersForSubstitute`, `getTeacherLeaveRequests`
- `teacher.ts`: `fetchClassSections`

**Trong `lib/actions/` (không gọi admin client trực tiếp, cần kiểm tay):**
- `activation.ts`: `completeAccountActivationAction`
- `attendance-batch.ts`: `saveBatchAttendanceAction`
- `class-students.ts`: `generateImprovementTasks`
- `discussion.ts`: `getDiscussionMessages`
- `exam.ts`: `saveManualGrades`
- `homework.ts`: `gradeSubmission`
- `notifications.ts`: `markNotificationAsRead`
- `parent-progress.ts`: `generateParentAIInsight`
- `teacher.ts`: `createAssignment`, `fetchAssignmentsForLesson`, `fetchQuestions`, `saveBulkQuestions`
- `academic.ts`, `grading.ts`: chuyển tiếp sang `lib/modules`, có guard
