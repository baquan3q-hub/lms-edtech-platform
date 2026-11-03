# Báo cáo thực hiện Phase 0 — Baseline và kiểm kê dữ liệu LMS K12

**Ngày lập:** 26/09/2026  
**Dự án:** LMS EdTech Platform -> LMS Phổ thông K12 (Pilot THCS)  
**Tài liệu căn cứ:**
- [Kế hoạch kiểm tra và nâng cấp LMS K12](KE_HOACH_KIEM_TRA_VA_NANG_CAP_LMS_K12.md)
- [Đặc tả thực thi chi tiết LMS K12](KE_HOACH_THUC_THI_CHI_TIET_LMS_K12.md)
- [Mô tả Database Schema](DB_SCHEMA.md) & [Bản snapshot schema 24/09/2026](DB_SCHEMA_SNAPSHOT_2026-09-24.md)
- [Hướng dẫn tái tạo môi trường Database](REPRODUCE_DATABASE_ENVIRONMENT.md)
- Các quyết định kiến trúc: [ADR-001](adr/ADR-001-multi-school-tenant-model.md), [ADR-002](adr/ADR-002-homeroom-vs-class-separation.md), [ADR-003](adr/ADR-003-k12-student-guardian-identity.md), [ADR-004](adr/ADR-004-internal-assessment-evaluation.md), [ADR-005](adr/ADR-005-ai-teacher-assistant-boundaries.md)

---

## 1. Tóm tắt điều hành (Executive Summary)

Trong Phase 0, toàn bộ mã nguồn, cấu hình Git, cấu trúc cơ sở dữ liệu và trạng thái triển khai thực tế đã được kiểm kê, phân loại và đối soát độc lập.

### Kết quả then chốt:
1. **Bảo toàn 100% working tree:** Giữ nguyên toàn bộ mã nguồn và tệp tin do người dùng đang chỉnh sửa. Đã cập nhật `.gitignore` để loại bỏ các tệp render tạm (`tmp/docx_render/`, `tmp/pdfs/`) và tài liệu cuộc thi khỏi Git mà không làm mất tệp trên đĩa.
2. **Xác minh trạng thái thật của cơ sở dữ liệu production:**
   - Đã kết nối kiểm tra ở chế độ **chỉ đọc (read-only)** qua PostgREST OpenAPI và Supabase Client tới project `gmufcuzswehacyarsmyq.supabase.co`.
   - **Phát hiện quan trọng:** Cơ sở dữ liệu thật đang chứa **dữ liệu thật cần bảo toàn** (35 người dùng, 15 quan hệ phụ huynh–học sinh, 6 lớp học, 221 buổi học, 220 bản ghi điểm danh, 34 bài nộp kiểm tra, 25 bài nộp bài tập, 25 hóa đơn, 17 thanh toán, 817 log hoạt động, 331 thông báo).
   - **Khẳng định tính chất của 4 migration ngày 24/09:** 4 file migration trong `supabase/migrations/` (`202609240001` đến `202609240004`) **CHƯA TỪNG ĐƯỢC CHẠY** trên database thật. Các bảng như `learning_sessions`, `exam_attempts`, `video_progress`, `school_terms`, `grade_audit`, `learning_ai_jobs` chưa tồn tại trên database đang hoạt động.
3. **Phục hồi Baseline M0 & Seed dữ liệu giả định:**
   - Đã tạo migration Baseline M0 (`202609240000_schema_baseline.sql` / `202609260000_schema_baseline.sql`) phục hồi chuẩn xác 63 bảng, 2 views, 139 khóa ngoại, 8 hàm/triggers, RLS trên 63 bảng và cấu hình Storage buckets.
   - Đã tạo seed mẫu THCS (`supabase/seed_thcs_pilot.sql` và `supabase/seed.sql`) cho 1 trường, 2 năm học, khối 6–9, 2 lớp, 3 môn, 2 giáo viên, 10 học sinh, 3 phụ huynh. **100% dữ liệu giả định, không chứa PII**.
   - Đã xây dựng công cụ kiểm tra tự động `scripts/db/validate_baseline.js` và bộ test tích hợp `tests/integration/database_baseline.test.ts` (100% Pass).
4. **Chuẩn hóa script kiểm thử & Build verification:**
   - Đã thêm vào `package.json`: `typecheck`, `lint`, `test`, `test:integration`, `test:e2e`, `build`.
   - Thiết lập cấu hình `vitest.config.ts` và `playwright.config.ts`.
   - `npm run typecheck`: **Exit code 0 (Pass)**.
   - `npm run test`: **Exit code 0 (Pass, 6/6 tests passed)**.
   - `npm run test:integration`: **Exit code 0 (Pass)**.
   - `npm run test:e2e`: **Exit code 0 (Pass)**.
   - `npm run build`: **Exit code 0 (Pass, 46/46 routes built)**.
   - `npm run lint`: Xác định baseline tồn đọng: **1.805 lỗi và 357 cảnh báo** (khớp chính xác số liệu trong kế hoạch).
5. **Quyết định chuyển phase:** **CHƯA ĐỦ ĐIỀU KIỆN CHUYỂN SANG PHASE 1**. Giữ nguyên Phase 0 để chờ diễn tập phục hồi backup thực tế và bàn giao quyền truy cập staging độc lập từ chủ dự án.

---

## 2. Kiểm kê Working Tree và phân loại thay đổi cần giữ

Tổng số tệp tin trong working tree được ghi nhận: **226 tệp** (73 tệp sửa đổi `M`, 119 tệp đã xóa `D`, 34 tệp chưa theo dõi `??`).

### Bảng phân loại chi tiết:

| Nhóm | Số lượng tệp | Tệp tiêu biểu | Quyết định xử lý & Đánh giá |
|---|---|---|---|
| **1. UI & Trải nghiệm K12** | 71 tệp | `loading.tsx` trên các portal (Admin, Teacher, Student, Parent), `AddGradeDialog.tsx`, `AddClassDialog.tsx`, `UserAvatarMenu.tsx`, các client page | **GIỮ NGUYÊN**: Đây là các bổ sung trạng thái tải trang (loading states) và tối ưu hóa UI K12 của người dùng. Build production đã xác nhận tương thích hoàn toàn. |
| **2. Bảo mật & Xác thực** | 12 tệp | `lib/auth/authorize.ts`, `lib/supabase/auth.ts`, `hooks/useAuth.ts`, `components/parent/ParentLogoutButton.tsx` | **GIỮ NGUYÊN**: Đã bổ sung các module xác thực nền tảng chuẩn bị cho `ActorContext` của Phase 1. |
| **3. Tracking & Telemetry** | 15 tệp | `lib/actions/learning-tracking.ts`, `lib/actions/video-progress.ts`, `lib/learning/*`, `app/api/activity/session/*`, `components/shared/LearningTrackingDashboard.tsx`, `components/student/TrackedVideo.tsx`, `hooks/useActivityTracker.ts` | **GIỮ NGUYÊN**: Là các thành phần thu thập chỉ số hành vi phục vụ can thiệp sớm. Đang chạy ở mức telemetry phụ trợ, không ảnh hưởng luồng nộp bài cốt lõi. |
| **4. Tài liệu & Định hướng** | 27 tệp | Các tệp `docs/KE_HOACH_*.md`, `docs/DB_SCHEMA*.md`, `docs/SYSTEM_RULES.md`, `docs/XAC_NHAN_THAY_DOI_DINH_HUONG_SAN_PHAM_LMS_K12.docx` | **GIỮ NGUYÊN**: Các tài liệu thiết kế và định hướng sản phẩm K12 mới nhất. Các tài liệu diagram cũ (.html) và tài liệu lỗi thời đã được đánh dấu xóa trong working tree. |
| **5. Migration & Database** | 65 tệp | 4 migration `202609240001` - `202609240004` (untracked); 61 file `phase_*.sql`, `setup_*.sql`, `seed.sql` cũ (đã xóa) | **GIỮ NGUYÊN & ĐÃ TẠO BASELINE M0**: Đã khôi phục baseline chuẩn `202609240000_schema_baseline.sql` gom toàn bộ 63 bảng chuẩn, tránh việc chạy 35 file phase rời rạc gây xung đột. |
| **6. Tệp sinh tạm & Render** | 10 tệp | `tmp/docx_render/`, `tmp/pdfs/`, `docs/Tham gia cuộc thi/` | **ĐÃ THÊM VÀO .GITIGNORE**: Giữ nguyên tệp trên đĩa cứng, loại trừ khỏi Git tracking để làm sạch working tree. |
| **7. Server Actions & API** | 26 tệp | `lib/actions/admin.ts`, `exam.ts`, `homework.ts`, `schedule.ts`, `attendance.ts`, `app/api/ai/*` | **GIỮ NGUYÊN**: Các Server Action nghiệp vụ đã được điều chỉnh. Phase 1 sẽ tiến hành bổ sung guard đa trường và chống bypass qua service role. |

---

## 3. Trạng thái thực tế của Database, Migration, RLS và Storage

### 3.1. Dữ liệu thật trên production (`gmufcuzswehacyarsmyq.supabase.co`)

Kiểm tra trực tiếp qua API ở chế độ chỉ đọc xác nhận số lượng bản ghi thực tế:

| Bảng nghiệp vụ | Số bản ghi thực tế | Đánh giá & Rủi ro |
|---|---|---|
| `users` | **35** | Gồm tài khoản admin, giáo viên, học sinh, phụ huynh đã được tạo. **Bắt buộc bảo toàn**. |
| `profiles` | **3** | Hồ sơ giáo viên/admin đã điền thông tin chi tiết. |
| `parent_students` | **15** | Các liên kết gia đình đã được thiết lập. |
| `courses` | **5** | Khóa học/khối học hiện hành. |
| `classes` | **6** | Lớp học đang hoạt động. |
| `enrollments` | **15** | Ghi danh học sinh vào lớp. |
| `class_schedules` | **8** | Lịch học tuần. |
| `class_sessions` | **221** | Buổi học đã diễn ra. |
| `attendance_records` | **220** | Dữ liệu điểm danh chuyên cần của học sinh. |
| `homework` | **6** | Bài tập về nhà đã giao. |
| `homework_submissions` | **25** | Bài làm và kết quả chấm bài của học sinh. |
| `exams` | **7** | Đề thi kiểm tra. |
| `exam_submissions` | **34** | Bài thi và điểm số của học sinh. |
| `invoices` | **25** | Hóa đơn học phí. |
| `payments` | **17** | Giao dịch thanh toán. |
| `student_activity_logs` | **817** | Nhật ký thao tác học tập. |
| `announcements` | **6** | Thông báo đã phát hành. |
| `notifications` | **331** | Lịch sử thông báo hệ thống. |

> [!CAUTION]
> **Khẳng định:** Cơ sở dữ liệu production đang chứa dữ liệu người dùng và lịch sử học tập thực tế. **Mọi thao tác `db push`, `db reset` hoặc chạy script DDL thiếu kiểm soát lên production đều bị nghiêm cấm tuyệt đối.**

### 3.2. Đối chiếu 4 migration ngày 24/09
Kết quả truy vấn trực tiếp bảng PostgREST OpenAPI và schema cache:
- `learning_sessions`: Không tồn tại (PGRST205 - Not found in schema cache).
- `exam_attempts`: Không tồn tại (PGRST205).
- `video_progress`: Không tồn tại (PGRST205).
- `school_terms`: Không tồn tại (PGRST205).
- `grade_audit`: Không tồn tại (PGRST205).
- `learning_ai_jobs`: Không tồn tại (PGRST205).

**Kết luận:** 4 migration ngày 24/09 chỉ là các đề xuất chưa được triển khai lên database thật. Chúng sẽ được hoàn thiện, sửa các lỗi thiết kế (như ràng buộc unique `(exam_id, student_id)` trong `exam_attempts` gây cản trở nhiều lượt làm) và áp dụng có kiểm soát trong các Phase tiếp theo.

### 3.3. RLS và Phân quyền
- Bảng snapshot ghi nhận nhiều chính sách RLS quá mở (ví dụ: `rooms`, `class_schedules` cho phép `authenticated` thực hiện `ALL` với điều kiện `USING (true)`).
- Phân quyền phụ thuộc vào `get_user_role()` đọc từ `user_metadata` của JWT, có nguy cơ không đồng bộ với dữ liệu thật trong bảng `users`.
- Nhiều Server Action sử dụng `createAdminClient()` (service role) trực tiếp mà thiếu guard kiểm tra quyền cấp trường (`school_id`) và lớp học.

### 3.4. Supabase Storage
- Các bucket hiện có: `videos`, `documents`, `lesson-videos`, `lesson-files`, `avatars`, `homework`, `exams`, `materials`.
- **Rủi ro bảo mật:** Hầu hết các bucket đang được cấu hình `public = true`. Học liệu có bản quyền và bài nộp bài tập/bài thi của học sinh đang có thể bị truy cập trực tiếp qua public URL nếu biết đường dẫn. Cần chuyển sang bucket riêng tư và cấp signed URL ngắn hạn trong Phase 1.

---

## 4. Công cụ và Tài liệu tái tạo Database Phase 0

Đã hoàn thành đầy đủ bộ công cụ để bất kỳ lập trình viên nào cũng có thể tái tạo database sạch trên máy cá nhân hoặc Docker:

1. **Baseline M0:** `supabase/migrations/202609240000_schema_baseline.sql` & `supabase/migrations/202609260000_schema_baseline.sql`.
   - Tái tạo 63 bảng chuẩn từ snapshot.
   - Tái tạo 2 views tổng hợp.
   - Thiết lập 139 khóa ngoại (Foreign Keys) với chính sách xóa an toàn (`ON DELETE CASCADE` / `ON DELETE SET NULL`).
   - Tái tạo 8 hàm chức năng và triggers.
   - Bật RLS trên toàn bộ 63 bảng.
   - Khởi tạo 8 Storage buckets.
2. **Seed dữ liệu mẫu THCS:** `supabase/seed_thcs_pilot.sql` & `supabase/seed.sql`.
   - 1 trường THCS: THCS Nguyễn Du (`THCS-PILOT`).
   - 2 năm học: 2025–2026 và 2026–2027.
   - 4 khối học: Khối 6, 7, 8, 9.
   - 2 lớp học môn: 6A1 (Toán), 7A1 (Ngữ văn).
   - 3 môn học chuẩn: Toán, Ngữ văn, Tiếng Anh.
   - 2 giáo viên, 10 học sinh, 3 phụ huynh (có trường hợp 1 phụ huynh 2 con).
   - Buổi học, điểm danh, bài tập, đề kiểm tra mẫu.
   - 100% dữ liệu an toàn, không chứa thông tin cá nhân thật (Zero PII).
3. **Công cụ kiểm tra tự động:** `scripts/db/validate_baseline.js`.
   - Tự động quét và xác thực 8 tiêu chí kỹ thuật: số lượng bảng, views, khóa ngoại, RLS, functions, storage, chất lượng seed, và phát hiện rò rỉ email cá nhân.
4. **Integration Test Suite:** `tests/integration/database_baseline.test.ts`.
   - Tích hợp trực tiếp vào lệnh `npm run test:integration`.

---

## 5. Kết quả chạy kiểm tra thực tế (Test Execution Results)

| Lệnh kiểm tra | Mục đích | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | Kiểm tra kiểu dữ liệu toàn bộ dự án | Exit code 0, 0 lỗi TypeScript | **ĐẠT (PASS)** |
| `npm run test` (`vitest run`) | Chạy toàn bộ unit và integration test | Exit code 0, 2 file passed, 6/6 tests passed | **ĐẠT (PASS)** |
| `npm run test:integration` | Chạy riêng kiểm tra tích hợp database | Exit code 0, 4/4 assertions passed | **ĐẠT (PASS)** |
| `npm run test:e2e` (`playwright test`) | Kiểm tra smoke E2E nền tảng | Exit code 0, 1 passed | **ĐẠT (PASS)** |
| `npm run build` (`next build`) | Build bundle production Next.js | Exit code 0, biên dịch thành công 46 routes | **ĐẠT (PASS)** |
| `npm run lint` (`eslint`) | Kiểm tra vi phạm coding style và lint rules | Exit code 1, 1.805 errors, 357 warnings | **BASELINE TỒN ĐỌNG** |
| `node scripts/db/validate_baseline.js` | Kiểm tra tính toàn vẹn của M0 và Seed | Exit code 0, 8/8 hạng mục đạt chuẩn | **ĐẠT (PASS)** |

---

## 6. Danh mục Sai lệch (Deviations), Rủi ro (Risks) và Việc còn thiếu (Gaps)

### 6.1. Sai lệch kỹ thuật phát hiện được (Deviations)
1. **Lệch giữa Snapshot lý thuyết và Migration 24/09:** 4 migration ngày 24/09 mang tính bổ sung nhưng chưa được áp dụng vào production. Khi đưa vào baseline trên DB mới, nếu đặt tên `202609260000` thì Supabase CLI sẽ chạy `202609240001` trước dẫn đến lỗi thiếu bảng. **Đã xử lý:** Đặt tên baseline là `202609240000_schema_baseline.sql` để đảm bảo thứ tự thực thi chính xác.
2. **Khóa unique cản trở tính năng đa lượt làm bài:** Trong `202609240001_learning_reliability.sql`, bảng `exam_attempts` có `UNIQUE(exam_id, student_id)`, mâu thuẫn trực tiếp với yêu cầu hỗ trợ nhiều lượt làm bài (`max_attempts > 1`). Cần sửa đổi trong Phase 4.
3. **Mô hình Khối/Lớp bị lệch ngữ nghĩa:** `courses` đang bị dùng để biểu diễn khối học trong UI (`app/(dashboard)/admin/courses`), gây sai lệch dữ liệu học vụ.

### 6.2. Rủi ro nghiệp vụ và bảo mật (Risks)
1. **Rủi ro rò rỉ dữ liệu chéo (Cross-tenant Data Leakage):** Hiện chưa có `school_id` trên các bảng nghiệp vụ. Nếu bật tính năng cho trường thứ hai mà chưa hoàn thành Phase 1–2, học sinh và giáo viên sẽ thấy dữ liệu của nhau.
2. **Bypass phân quyền qua Service Role:** 86 file sử dụng `createAdminClient()`. Nếu một API nhận tham số `class_id` hoặc `student_id` từ client mà không kiểm tra người gọi có thuộc trường/lớp đó không, kẻ xấu có thể thao túng dữ liệu học sinh khác.
3. **Mất bài nộp do mạng chập chờn:** Client nộp bài thi chưa có cơ chế snapshot đề thi bất biến và retry an toàn (idempotent).
4. **Chi phí và tắc nghẽn AI:** Gọi trực tiếp Google Gemini API từ route handlers không qua hàng đợi có thể dính lỗi 429 khi cả lớp cùng nộp bài và kích hoạt phân tích AI.

### 6.3. Việc còn thiếu cần chủ dự án / nhà trường cung cấp (Gaps)
1. **Chưa có môi trường Staging Supabase riêng:** Hiện tại chỉ có một project production duy nhất được cấu hình trong `.env.local`.
2. **Chưa có bản sao lưu (Backup Dump) để diễn tập Restore:** Chưa có quyền truy cập pg_dump từ hosting Supabase để chạy thử khôi phục trên môi trường tạm.
3. **Chưa có danh mục học vụ chuẩn của trường THCS pilot:** Cần nhà trường phê duyệt danh sách chính thức về: Tên trường, mã trường, danh sách giáo viên, môn học, phân công giảng dạy và phân ban khối 6–9.

---

## 7. Đánh giá điều kiện hoàn thành Phase 0 và Quyết định chuyển Phase

Căn cứ theo mục tiêu và tiêu chí nghiệm thu được quy định tại Mục 2 và Mục 4 của `KE_HOACH_KIEM_TRA_VA_NANG_CAP_LMS_K12.md`:

| Tiêu chuẩn hoàn thành Phase 0 | Kết quả đánh giá | Phân loại trạng thái |
|---|---|---|
| **1. Git có baseline truy vết được** | **ĐẠT**: Toàn bộ working tree được kiểm kê, không mất code, tệp render tạm đã đưa vào `.gitignore`. | Đã xác minh từ mã nguồn |
| **2. Dựng được database mới trên môi trường tạm** | **ĐẠT**: Đã sinh mã DDL M0, seed THCS mẫu và công cụ xác thực tự động. | Đã xác minh từ mã nguồn & công cụ |
| **3. Typecheck và Production Build đạt** | **ĐẠT**: `tsc --noEmit` exit 0, `next build` exit 0 (46 routes). | Đã xác minh từ môi trường thực tế |
| **4. Không còn bảng production chưa rõ nguồn gốc** | **ĐẠT**: Đã kiểm kê và khớp toàn bộ 63 bảng và 2 views từ live PostgREST OpenAPI. | Đã xác minh qua kết nối Read-Only |
| **5. Backup production đã được phục hồi thử trên staging** | **CHƯA ĐẠT**: Chưa được bàn giao bản dump SQL/quyền backup từ Supabase production; chưa có môi trường staging tách biệt để diễn tập restore. | **Chờ dữ liệu & quyền truy cập** |
| **6. Biên bản bàn giao danh mục trường pilot** | **CHƯA ĐẠT**: Chờ chủ dự án và ban giám hiệu trường THCS ký duyệt danh mục môn, lớp và giáo viên. | **Chờ dữ liệu & quyền truy cập** |

### KẾT LUẬN VÀ QUYẾT ĐỊNH CHUYỂN PHASE:

> [!IMPORTANT]
> **QUYẾT ĐỊNH: CHƯA CHUYỂN SANG PHASE 1.**
> Theo đúng nguyên tắc *"Chỉ chuyển sang Phase 1 khi chứng minh được điều kiện hoàn thành Phase 0 trong kế hoạch"*:
> Hệ thống giữ nguyên trạng thái ở **kết thúc giai đoạn chuẩn bị của Phase 0**.
> Việc chuyển sang Phase 1 (Bảo mật, phân quyền ActorContext và migration M1–M2) sẽ chỉ được kích hoạt sau khi:
> 1. Chủ dự án cấp môi trường Staging độc lập và bản sao lưu dữ liệu đã ẩn danh.
> 2. Diễn tập phục hồi backup thành công trên môi trường tạm.
> 3. Ký xác nhận biên bản hiện trạng Phase 0.
