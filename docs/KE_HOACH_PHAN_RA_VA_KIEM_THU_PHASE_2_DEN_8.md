# KẾ HOẠCH PHÂN RÃ NHIỆM VỤ VÀ MA TRẬN KIỂM THỬ TOÀN DIỆN (PHASE 2 ĐẾN PHASE 8)
**Dự án:** LMS EdTech Platform — Hệ thống Quản trị Học tập K12  
**Căn cứ tài liệu:** [Kế hoạch kiểm tra & nâng cấp K12](KE_HOACH_KIEM_TRA_VA_NANG_CAP_LMS_K12.md) và [Đặc tả thực thi chi tiết K12](KE_HOACH_THUC_THI_CHI_TIET_LMS_K12.md)  
**Thời điểm lập:** 26/09/2026 (Ngay sau nghiệm thu Phase 1)  

---

## 1. TỔNG QUAN LỘ TRÌNH VÀ NGUYÊN TẮC THỰC THI

Sau khi hoàn tất **Phase 0 (Baseline & Kiểm kê)** và **Phase 1 (Bảo mật & Độ tin cậy nền tảng)**, hệ thống đã sở hữu:
- Cơ chế phân tách trường học (`schools`, `school_memberships`, `school_id` trên 10 bảng lõi, 0 bản ghi unmapped).
- Lớp bảo vệ `ActorContext`, `requireSchoolScope`, `requireClassScope`.
- Hạ tầng giao dịch tin cậy: `audit_events`, `outbox_events`, `idempotency_keys`.
- Toàn bộ test suite baseline và build 46/46 pages đạt chuẩn.

Lộ trình tiếp theo từ **Phase 2 đến Phase 8** được phân rã thành các giai đoạn chuyên biệt với nguyên tắc kiến trúc bất biến:
1. **Dữ liệu gốc trước, Dashboard sau:** Dữ liệu học vụ và đánh giá luôn là nguồn chân lý.
2. **Chiến lược Migration an toàn:** Tuân thủ chu trình 5 bước: `Expand` (thêm cấu trúc mới) $\rightarrow$ `Backfill` (chuyển đổi dữ liệu) $\rightarrow$ `Audit/Verify` (đối soát 0 lỗi) $\rightarrow$ `Switch Read/Write` (chuyển luồng đọc/ghi) $\rightarrow$ `Contract` (dọn dẹp trường cũ).
3. **Kiểm thử đa tầng (Multi-tier Testing):** Mỗi Phase bắt buộc phải có Unit Tests, Integration Tests với Supabase, Script đối soát cơ sở dữ liệu trực tiếp, và kịch bản E2E.
4. **Không tin Client về danh tính và thời gian:** Toàn bộ quyền, thời hạn bài tập/bài thi, và logic trạng thái đều do Server/Database quyết định.

```mermaid
flowchart TD
    P1[Phase 1: Bảo mật & Nền tảng\nĐÃ HOÀN THÀNH 100%] --> P2
    P2[Phase 2: Mô hình học vụ K12\nM3: Catalog | M4: Rosters\nTuần 6-9] --> P3
    P3[Phase 3: Tài khoản & Import Excel\nM5: Identity & Activations\nTuần 10-11] --> P4
    P4[Phase 4: Dạy & Học cốt lõi\nM6: Learning & Publication\nTuần 12-15] --> P5
    P5[Phase 5: Chuyên cần, Phụ huynh & Báo cáo\nM7: Interventions | M8: Projections\nTuần 16-18] --> P6
    P6[Phase 6: AI hỗ trợ giáo viên\nM9: AI Quota & Human-in-the-loop\nTuần 19-20] --> P7
    P7[Phase 7: Hardening & UAT\nFull Lint 0, Load Test, DR Rehearsal\nTuần 21-22] --> P8
    P8[Phase 8: Pilot THCS thực tế\nTuần 23-26] --> P9[Phase 9: Mở rộng sau Pilot]
```

---

## 2. KẾ HOẠCH CHI TIẾT TỪNG PHASE

---

### PHASE 2: MÔ HÌNH HỌC VỤ K12 CHUẨN (TUẦN 6–9)

#### 2.1. Mục tiêu và phạm vi
- Xóa bỏ triệt để nhầm lẫn kiến trúc giữa `courses` (kho học liệu) và `classes` (lớp học/khối học).
- Thiết lập mô hình học vụ K12 đầy đủ: Năm học (`academic_years`), Học kỳ (`terms`), Khối học (`grade_levels` 1–12, pilot bật 6–9), Môn học (`subjects`).
- Phân biệt rõ hai thực thể: **Lớp hành chính/chủ nhiệm** (`homerooms`) và **Lớp môn học** (`classes`).
- Hỗ trợ đa vai trò có thời hạn và phạm vi (`role_assignments`, `class_teacher_assignments`, `homeroom_teacher_assignments`).

#### 2.2. Danh mục Task kỹ thuật

| Mã Task | Hạng mục | Mô tả chi tiết kỹ thuật | File/Artifact liên quan |
|---|---|---|---|
| **T2.1** | Migration M3 | Viết `202609260003_k12_catalog.sql`: Tạo `academic_years`, `terms`, `grade_levels`, `subjects`. Thêm `school_id`, FK, RLS và compound unique constraints. | `supabase/migrations/202609260003_k12_catalog.sql` |
| **T2.2** | Migration M4 | Viết `202609260004_k12_rosters.sql`: Tạo `homerooms`, `homeroom_enrollments`, `homeroom_teacher_assignments`, `role_assignments`. Bổ sung `term_id`, `subject_id`, `homeroom_id` vào `classes`. Mở rộng `class_teacher_assignments`. | `supabase/migrations/202609260004_k12_rosters.sql` |
| **T2.3** | Backfill & Mapping | Chuyển đổi an toàn 6 lớp hiện tại sang `homerooms` và `classes` môn học tương ứng. Tạo dữ liệu mẫu THCS Nguyễn Du cho năm học 2026–2027, Học kỳ 1. | `scripts/db/backfill_phase2_k12_rosters.js` |
| **T2.4** | Script đối soát | Viết script kiểm tra tự động: `unmapped_classes = 0`, `cross_school_classes = 0`, kiểm tra tính toàn vẹn của enrollment và teacher assignment. | `scripts/db/verify_phase2_live_db.js` |
| **T2.5** | Core Auth Refactor | Nâng cấp `ActorContext` (`lib/auth/actor-context.ts`) để phân giải danh sách vai trò từ `role_assignments`, hỗ trợ `homeroomScope` và `subjectScope`. | `lib/auth/actor-context.ts`, `lib/auth/authorize.ts` |
| **T2.6** | Server Actions Học vụ | Cập nhật `lib/actions/academic.ts`, `lib/actions/classes.ts`, `lib/actions/admin.ts` sang schema mới. Đảm bảo backward compatibility cho API cũ trong quá trình chuyển giao. | `lib/actions/academic.ts`, `lib/actions/classes.ts` |
| **T2.7** | UI Quản trị Học vụ | Tách biệt giao diện Admin quản lý: Danh mục năm học/môn học; Danh sách lớp chủ nhiệm; Danh sách lớp bộ môn; Phân công chuyên môn. Gỡ bỏ hiển thị `courses` như khối lớp. | `app/(dashboard)/admin/...`, `components/academic/...` |
| **T2.8** | Teacher/Student UI | Cập nhật Dashboard Giáo viên và Học sinh để hiển thị đúng thông tin: Lớp chủ nhiệm (Homeroom) vs Danh sách lớp bộ môn đang học/dạy. | `app/(dashboard)/teacher/...`, `app/(dashboard)/student/...` |

#### 2.3. Ma trận kiểm thử Phase 2

| Nhóm kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Hình thức thực hiện |
|---|---|---|---|
| **Roster Scope** | Một học sinh thuộc 1 lớp chủ nhiệm và đồng thời ghi danh vào 3 lớp môn (Toán, Văn, Anh). | Học sinh xem đúng 3 lớp môn và 1 lớp chủ nhiệm; dữ liệu bài tập tách biệt theo từng môn. | Vitest Unit & Integration Test |
| **Teacher Separation** | Giáo viên Toán lớp 8A thử chấm bài hoặc sửa điểm của lớp Văn 8A. | Server Action từ chối với lỗi 403 Forbidden (`UNAUTHORIZED_RESOURCE`). | Vitest Unit Test (`actor_context.test.ts`) |
| **Homeroom Guard** | Giáo viên chủ nhiệm xem báo cáo điểm danh và tổng hợp kết quả của lớp mình, nhưng thử can thiệp sửa đề bài kiểm tra môn khác. | Đọc được báo cáo tổng hợp, nhưng thao tác ghi bị chặn 403. | Vitest Integration Test |
| **Data Integrity** | Chuyển học sinh từ lớp 8A sang 8B giữa năm học. | `homeroom_enrollments` cũ được set `end_date`, tạo enrollment mới; toàn bộ bài nộp và điểm số ở các lớp môn cũ không bị mất hay đè. | Live DB Verification Script |
| **Cross-School Barrier** | Tạo 1 lớp học liên kết `school_id` của trường THCS Chu Văn An nhưng gán `subject_id` của THCS Nguyễn Du. | Foreign Key compound hoặc Trigger ném lỗi vi phạm ràng buộc toàn vẹn cơ sở dữ liệu. | Live DB Verification Script |

#### 2.4. Tiêu chí nghiệm thu Gate Phase 2
- [ ] M3 & M4 chạy thành công trên DB Staging/Production.
- [ ] 100% học sinh thuộc đúng 1 lớp chủ nhiệm hiệu lực tại một thời điểm.
- [ ] `unmapped_classes = 0`, `cross_school_classes = 0`.
- [ ] Toàn bộ bài nộp, điểm và chuyên cần lịch sử được bảo toàn nguyên vẹn 100%.
- [ ] Vitest Suite Phase 2 (tối thiểu 15 tests mới) pass 100%.
- [ ] `npm run typecheck` đạt 0 lỗi; `npm run build` thành công.

---

### PHASE 3: TÀI KHOẢN & IMPORT ONBOARDING BẰNG EXCEL (TUẦN 10–11)

#### 3.1. Mục tiêu và phạm vi
- Xóa bỏ phụ thuộc vào email cá nhân đối với học sinh K12: Học sinh đăng nhập bằng `Mã trường + Mã học sinh + Mật khẩu`.
- Quản trị định danh độc lập: `student_identifiers` và `guardian_identifiers` duy nhất theo trường.
- Xây dựng quy trình Import Excel Server-side chuẩn nghiệp vụ: Upload $\rightarrow$ Staging $\rightarrow$ Validate/Preview $\rightarrow$ Sửa lỗi tại chỗ $\rightarrow$ Transactional Commit $\rightarrow$ Audit.
- Quản lý mật khẩu tạm và mã kích hoạt: Mật khẩu khởi tạo `abc123` bắt buộc đi kèm mã kích hoạt (activation token) lưu dạng SHA-256 hash.

#### 3.2. Danh mục Task kỹ thuật

| Mã Task | Hạng mục | Mô tả chi tiết kỹ thuật | File/Artifact liên quan |
|---|---|---|---|
| **T3.1** | Migration M5 | Viết `202609260005_identity_import.sql`: Tạo `student_identifiers`, `guardian_identifiers`, `account_activations`, `import_jobs`, `import_rows`. | `supabase/migrations/202609260005_identity_import.sql` |
| **T3.2** | Auth Alias Module | Xây dựng resolver đăng nhập mã học sinh: Chuyển đổi `school_code + student_code` sang định danh Supabase Auth nội bộ (`[student_code]@[school_code].local`). | `lib/auth/student-auth.ts` |
| **T3.3** | Activation Engine | Xây dựng logic kích hoạt tài khoản lần đầu: Hash token SHA-256, kiểm tra thời hạn (48h), đếm số lần thử sai (khóa sau 5 lần), bắt buộc đổi mật khẩu. | `lib/auth/activation.ts` |
| **T3.4** | Excel Parser & Staging | Xây dựng engine đọc file Excel (.xlsx/.csv) phía server (giới hạn 5MB, tối đa 1.000 dòng/file). Validate cú pháp, cấu trúc cột chuẩn và lưu vào `import_rows`. | `lib/excel/import-parser.ts` |
| **T3.5** | Preview & Fix UI | Xây dựng giao diện Admin Import: Xem trước danh sách chuẩn hóa, lọc nhanh các dòng lỗi, sửa thông tin sai trực tiếp trên lưới trước khi bấm "Ghi dữ liệu". | `app/(dashboard)/admin/onboarding/excel-import/...` |
| **T3.6** | Transactional Commit | Thực thi ghi dữ liệu hàng loạt theo batch 50 bản ghi, có checkpoint: Tạo user, gán role, xếp lớp chủ nhiệm, liên kết phụ huynh trong cùng transaction, sinh `outbox_events`. | `lib/actions/import.ts` |
| **T3.7** | Password Reset & Revoke | Xây dựng luồng Reset tài khoản về mặc định: Khi Admin reset, lập tức thu hồi toàn bộ session hiện có trong Auth, sinh mã kích hoạt mới và ghi `audit_events`. | `lib/actions/admin-users.ts` |

#### 3.3. Ma trận kiểm thử Phase 3

| Nhóm kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Hình thức thực hiện |
|---|---|---|---|
| **No-email Login** | Học sinh đăng nhập bằng form `Mã trường (THCS-NDU) + Mã học sinh (HS001) + Mật khẩu`. | Đăng nhập thành công, session được cấp chứa đúng `ActorContext` của học sinh. | Vitest Unit & E2E Test |
| **Unactivated Gate** | Tài khoản mới được cấp mật khẩu `abc123` nhưng chưa nhập mã kích hoạt, cố tình gọi Server Action nộp bài hoặc xem điểm. | Server trả về lỗi 403 Forbidden kèm yêu cầu chuyển hướng đến màn hình kích hoạt. | Vitest Integration Test |
| **Import Idempotency** | Chạy lại cùng một file Excel chuẩn 3 lần liên tiếp. | Số lượng học sinh, lớp, và phụ huynh được giữ nguyên, không tạo thêm bản ghi rác/trùng lặp. | Live DB Verification Script |
| **Faulty Excel Rows** | Upload file Excel 50 dòng có 5 dòng lỗi (trùng mã HS, sai khối, thiếu tên phụ huynh). | Hệ thống hiển thị rõ ràng 5 dòng lỗi kèm mã lỗi và số dòng; cho phép sửa rồi commit 50/50 thành công. | Vitest Integration Test |
| **Token Brute-force** | Thử nhập mã kích hoạt sai 5 lần liên tiếp. | Hệ thống khóa token kích hoạt; yêu cầu quản trị viên cấp lại. | Vitest Unit Test |

#### 3.4. Tiêu chí nghiệm thu Gate Phase 3
- [ ] M5 áp dụng thành công trên DB.
- [ ] Đăng nhập thành công bằng mã học sinh mà không cần cung cấp email cá nhân.
- [ ] Import file Excel 1.000 dòng hoàn thành preview trong $\le$ 30 giây trên staging.
- [ ] Tài khoản chưa kích hoạt bị chặn 100% quyền truy cập vào dữ liệu học tập.
- [ ] Sau khi Admin reset tài khoản, toàn bộ phiên đăng nhập cũ bị vô hiệu hóa ngay lập tức.

---

### PHASE 4: TRẢI NGHIỆM DẠY VÀ HỌC CỐT LÕI (TUẦN 12–15)

#### 4.1. Mục tiêu và phạm vi
- Chuẩn hóa học liệu có phiên bản, trạng thái `draft`, `published`, `archived`.
- Bài tập (Homework) và Bài kiểm tra (Exam): Chống gian lận thời gian, đề thi cố định dạng snapshot bất biến sau khi công bố.
- Cấu hình số lượt làm bài kiểm tra (`exam_attempts`), lưu trữ bài nộp theo `attempt_id`.
- Autosave an toàn phía client: Chống xung đột phiên bản nháp bằng version vector.
- Điểm số: Tách biệt điểm nháp (`draft`) và điểm công bố (`published`). Kiểm toán sửa điểm bắt buộc nhập lý do.

#### 4.2. Danh mục Task kỹ thuật

| Mã Task | Hạng mục | Mô tả chi tiết kỹ thuật | File/Artifact liên quan |
|---|---|---|---|
| **T4.1** | Migration M6 | Viết `202609260006_learning_publication.sql`: Snapshot đề thi, mở rộng `exam_attempts(attempt_no)`, `exam_submissions(attempt_id)`, bảng `rubrics`, `score_adjustments`. | `supabase/migrations/202609260006_learning_publication.sql` |
| **T4.2** | Server-side Clock | Chuẩn hóa toàn bộ logic nộp bài và kiểm tra deadline dựa trên đồng hồ PostgreSQL server (`now()`), tuyệt đối không dùng timestamp từ client. | `lib/actions/exams.ts`, `lib/actions/homework.ts` |
| **T4.3** | Exam Snapshot Engine | Khi giáo viên công bố bài kiểm tra, tạo snapshot câu hỏi và đáp án cố định. Mọi thay đổi ngân hàng đề sau thời điểm này không làm biến động bài thi đang diễn ra. | `lib/exams/exam-snapshot.ts` |
| **T4.4** | Autosave with Versioning | Xây dựng Server Action lưu nháp bài làm tự luận/trắc nghiệm: Nhận `client_version`, kiểm tra với `server_version`. Từ chối ghi đè nếu phiên bản gửi lên đã cũ (Conflict 409). | `lib/actions/submission-draft.ts` |
| **T4.5** | Multi-attempt Manager | Quản lý lượt làm bài theo cấu hình `max_attempts` (mặc định 1). Kiểm tra trạng thái lượt làm trước đó đã nộp hoặc hết giờ trước khi mở lượt làm mới. | `lib/exams/attempt-manager.ts` |
| **T4.6** | Grading & Score Audit | Tích hợp quy trình chấm điểm: Điểm nháp $\rightarrow$ Công bố. Mọi thao tác sửa điểm sau công bố phải ghi `score_adjustments` và `audit_events` kèm lý do bắt buộc. | `lib/actions/grading.ts` |
| **T4.7** | Outbox Notification | Kết nối sự kiện nộp bài, có điểm thi với `outbox_events` để gửi thông báo đến giáo viên và phụ huynh theo thời gian thực. | `lib/outbox/learning-events.ts` |

#### 4.3. Ma trận kiểm thử Phase 4

| Nhóm kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Hình thức thực hiện |
|---|---|---|---|
| **Deadline Enforcement** | Học sinh gửi gói tin nộp bài sau deadline 1 giây (dù đồng hồ máy tính của học sinh bị chỉnh lùi 1 tiếng). | Server từ chối tiếp nhận bài nộp với mã lỗi `SUBMISSION_DEADLINE_PASSED`. | Vitest Unit Test |
| **Draft Versioning** | Máy học sinh mở 2 tab cùng làm 1 bài tự luận; Tab A lưu version 2, sau đó Tab B gửi version 1 lên đè. | Tab B nhận lỗi 409 Conflict, dữ liệu version 2 trên server được bảo vệ an toàn. | Vitest Unit Test |
| **Exam Snapshot** | Giáo viên sửa nội dung câu hỏi số 1 trong ngân hàng câu hỏi khi học sinh đang trong phòng thi. | Đề thi của học sinh giữ nguyên nội dung snapshot ban đầu; không bị biến động đáp án. | Vitest Integration Test |
| **Score Visibility** | Giáo viên chấm điểm xong nhưng để ở trạng thái `draft`. Học sinh hoặc phụ huynh đăng nhập xem điểm. | Học sinh/phụ huynh thấy trạng thái "Đang chấm", giá trị điểm số trả về `null`. | Playwright E2E & Vitest |
| **Audit Score Edit** | Giáo viên sửa điểm bài kiểm tra từ 7.5 lên 8.0 nhưng để trống trường lý do sửa điểm. | Thao tác bị từ chối; khi nhập đủ lý do, `score_adjustments` và `audit_events` lưu đúng vết thay đổi. | Vitest Unit Test |

#### 4.4. Tiêu chí nghiệm thu Gate Phase 4
- [ ] M6 chạy thành công trên DB.
- [ ] Luồng E2E: Giáo viên giao bài $\rightarrow$ Học sinh làm/nộp $\rightarrow$ Giáo viên chấm $\rightarrow$ Công bố $\rightarrow$ Phụ huynh xem đạt 100%.
- [ ] 100 lần click nộp bài đồng thời với cùng idempotency key chỉ sinh đúng 1 bản ghi nộp bài.
- [ ] 0 trường hợp học sinh xem được điểm số ở trạng thái `draft`.
- [ ] 100% sự kiện sửa điểm đã công bố có lưu đầy đủ người sửa, điểm cũ, điểm mới và lý do.

---

### PHASE 5: CHUYÊN CẦN, PHỤ HUYNH, BÁO CÁO VÀ CAN THIỆP SỚM (TUẦN 16–18)

#### 5.1. Mục tiêu và phạm vi
- Chuẩn hóa lịch học K12 (buổi học, tiết học, thời khóa biểu).
- Điểm danh thông minh: Có phép, không phép, đi muộn. Quy trình phụ huynh gửi đơn xin nghỉ học và giáo viên duyệt.
- Cổng thông tin Phụ huynh: Chỉ xem thông tin của con đã xác minh (`verified`), nhận thông báo kịp thời.
- Hệ thống Can thiệp sớm (`intervention_cases`): Tự động phát hiện học sinh sa sút học tập hoặc vắng học nhiều để can thiệp kịp thời.
- Báo cáo phân cấp: Báo cáo bộ môn, báo cáo lớp chủ nhiệm, báo cáo toàn trường có thể đối soát ngược về nguồn.

#### 5.2. Danh mục Task kỹ thuật

| Mã Task | Hạng mục | Mô tả chi tiết kỹ thuật | File/Artifact liên quan |
|---|---|---|---|
| **T5.1** | Migration M7 | Viết `202609260007_school_attendance_interventions.sql`: `attendance_policies`, mở rộng `absence_requests`, bảng `intervention_cases` và `intervention_actions`. | `supabase/migrations/202609260007_school_attendance_interventions.sql` |
| **T5.2** | Migration M8 | Viết `202609260008_reporting_projections.sql`: Tạo Materialized Views/RPC tổng hợp chuyên cần, học lực theo kỳ/môn/khối/trường có phân trang. | `supabase/migrations/202609260008_reporting_projections.sql` |
| **T5.3** | Attendance Action | Xây dựng Server Action lưu điểm danh theo lớp: Xử lý batch 40–50 học sinh trong 1 transaction duy nhất, kiểm tra trùng lặp và tính toán tỷ lệ chuyên cần tức thời. | `lib/actions/attendance.ts` |
| **T5.4** | Absence Workflow | Xây dựng quy trình xin nghỉ: Phụ huynh gửi đơn (kèm lý do/ảnh minh chứng) $\rightarrow$ Giáo viên chủ nhiệm duyệt/từ chối $\rightarrow$ Tự động đồng bộ vào điểm danh tiết học. | `lib/actions/absence-requests.ts` |
| **T5.5** | Early Intervention | Xây dựng engine phát hiện tín hiệu: Học sinh nghỉ học $\ge$ 3 buổi/tháng hoặc điểm kiểm tra trung bình giảm $\ge$ 2.0 $\rightarrow$ Tự động sinh `intervention_case` chờ duyệt. | `lib/interventions/detector.ts` |
| **T5.6** | Parent Portal UI | Giao diện phụ huynh: Thời khóa biểu hôm nay, tình hình chuyên cần, đơn xin nghỉ phép, kết quả học tập đã công bố của các con. | `app/(dashboard)/parent/...` |
| **T5.7** | Drill-down Reports | Màn hình báo cáo phân cấp cho Hiệu trưởng, Chủ nhiệm, Bộ môn: Cho phép bấm từ số tổng hợp để xem danh sách chi tiết từng học sinh và bản ghi gốc. | `app/(dashboard)/admin/reports/...` |

#### 5.3. Ma trận kiểm thử Phase 5

| Nhóm kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Hình thức thực hiện |
|---|---|---|---|
| **Batch Attendance** | Giáo viên lưu điểm danh cho lớp 45 học sinh trong điều kiện mạng lag. | Thời gian xử lý phía server $\le$ 1.5 giây; không sinh bản ghi điểm danh trùng lặp. | Vitest Integration Test |
| **Absence Sync** | Đơn xin nghỉ phép của học sinh được giáo viên chủ nhiệm phê duyệt "Có phép". | Điểm danh các tiết học trong ngày nghỉ tự động cập nhật trạng thái "Vắng có phép". | Vitest Integration Test |
| **Parent Boundary** | Phụ huynh tài khoản A có 2 con (học lớp 6A và 8B), thử truy cập ID bài kiểm tra của học sinh lớp 7C. | Hệ thống trả về 403 Forbidden; phụ huynh chỉ xem được dữ liệu của đúng 2 con đã xác minh. | Vitest Unit Test |
| **Report Consistency** | So sánh tổng số buổi vắng học trên báo cáo tổng hợp toàn trường với phép `COUNT(*)` từ bảng `attendance_records`. | Khớp dữ liệu 100%, độ lệch bằng 0 sau mọi bộ lọc học kỳ/khối. | Live DB Verification Script |
| **Intervention Trigger** | Giả lập học sinh bị điểm kém 2 bài liên tiếp (< 4.0). | Hệ thống phát sinh 1 `intervention_case` mức độ Medium, gửi thông báo outbox đến giáo viên chủ nhiệm. | Vitest Unit Test |

#### 5.4. Tiêu chí nghiệm thu Gate Phase 5
- [ ] M7 & M8 chạy thành công trên DB.
- [ ] Lưu điểm danh 50 học sinh đạt độ trễ p95 $\le$ 3.0 giây.
- [ ] Báo cáo tổng hợp khớp 100% với dữ liệu nguồn chi tiết trên tập dữ liệu thử nghiệm $\ge$ 1.500 dòng.
- [ ] 0 trường hợp phụ huynh truy cập trái phép được dữ liệu của học sinh khác.
- [ ] 100% ca can thiệp sớm khi đóng có đủ thông tin người xử lý, hành động và ghi chú kết quả.

---

### PHASE 6: AI HỖ TRỢ GIÁO VIÊN TRONG PHẠM VI KIỂM SOÁT (TUẦN 19–20)

#### 6.1. Mục tiêu và phạm vi
- AI đóng vai trò là **Trợ lý đề xuất** (Human-in-the-loop); tuyệt đối không tự động đưa ra quyết định hành chính, kỷ luật, hay điểm số chính thức.
- Giới hạn đúng **3 tác vụ thí điểm (pilot)**:
  1. Soạn nháp câu hỏi trắc nghiệm/tự luận theo ma trận kiến thức bài học.
  2. Viết nháp nhận xét bài làm của học sinh dựa trên tiêu chí rubric.
  3. Gợi ý hành động hỗ trợ cho học sinh trong các ca can thiệp sớm.
- Quản trị hạn mức (Quota), chi phí Token và công tắc bật/tắt AI khẩn cấp theo từng trường.
- Loại bỏ thông tin nhận dạng cá nhân (PII) trước khi gửi prompt; kiểm soát schema đầu ra bằng Zod.

#### 6.2. Danh mục Task kỹ thuật

| Mã Task | Hạng mục | Mô tả chi tiết kỹ thuật | File/Artifact liên quan |
|---|---|---|---|
| **T6.1** | Migration M9 | Viết `202609260009_ai_jobs_scope.sql`: Mở rộng bảng `learning_ai_jobs` (thêm `school_id`, `kind` 3 tác vụ pilot, `prompt_version`, `source_data_hash`, token usage, `approval_status`), tạo `school_ai_quotas`. | `supabase/migrations/202609260009_ai_jobs_scope.sql` |
| **T6.2** | PII Sanitizer | Xây dựng filter lọc PII: Thay thế tên thật, mã học sinh, ngày sinh bằng token định danh ẩn danh (`STUDENT_A`, `STUDENT_B`) trước khi truyền vào AI model. | `lib/ai/pii-sanitizer.ts` |
| **T6.3** | Structured Output | Định nghĩa Zod Schemas cho 3 tác vụ; ép kiểu đầu ra JSON từ Gemini API. Tự động reject và retry nếu model trả về sai cấu trúc. | `lib/ai/schemas.ts`, `lib/ai/client.ts` |
| **T6.4** | Human Review Flow | Xây dựng giao diện phê duyệt của Giáo viên: Hiển thị nội dung AI gợi ý kèm nguồn tham chiếu. 3 tùy chọn: "Duyệt áp dụng", "Sửa nội dung rồi áp dụng", "Bác bỏ". | `components/ai/human-review-modal.tsx` |
| **T6.5** | Quota & Circuit Breaker | Middleware kiểm tra hạn mức token hàng tháng của trường: Khi chạm ngưỡng hoặc API lỗi $\rightarrow$ kích hoạt fallback cho giáo viên làm thủ công bình thường. | `lib/ai/quota-manager.ts` |

#### 6.3. Ma trận kiểm thử Phase 6

| Nhóm kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Hình thức thực hiện |
|---|---|---|---|
| **Zero Autonomy** | Tạo job AI sinh nhận xét bài thi của học sinh. Kiểm tra bảng `exam_submissions` và thông báo phụ huynh. | Điểm số và nhận xét không xuất hiện trên giao diện học sinh/phụ huynh cho đến khi giáo viên bấm "Duyệt". | Vitest Integration Test |
| **Schema Validation** | Giả lập Mock API trả về JSON thiếu trường bắt buộc hoặc sai định dạng câu hỏi trắc nghiệm. | Hệ thống bắt lỗi schema, từ chối nạp vào cơ sở dữ liệu và ghi log cảnh báo rõ ràng. | Vitest Unit Test |
| **Circuit Breaker** | Admin trường gạt cờ tắt AI hoặc hệ thống hết quota token. Giáo viên tiếp tục tạo bài tập và chấm bài. | Toàn bộ chức năng giao bài, làm bài, chấm điểm thủ công hoạt động 100% bình thường không gặp gián đoạn. | Vitest Integration Test |
| **PII Protection** | Kiểm tra payload prompt gửi ra ngoài cho bài thi của học sinh "Nguyễn Văn An, mã HS001". | Payload chỉ chứa nội dung câu trả lời và định danh ẩn danh, không có tên thật hay mã học sinh. | Vitest Unit Test |

#### 6.4. Tiêu chí nghiệm thu Gate Phase 6
- [ ] M9 chạy thành công trên DB.
- [ ] 0 bản ghi điểm hoặc nhận xét do AI tự động công bố khi chưa có thao tác duyệt của giáo viên.
- [ ] 100% kết quả AI lưu vết `prompt_version`, `model_name`, `source_data_hash` và người duyệt.
- [ ] Mô phỏng sự cố AI (timeout, 429 quota) 100 lần liên tiếp không làm ảnh hưởng đến luồng học tập chính.

---

### PHASE 7: HARDENING, KIỂM THỬ VẬN HÀNH VÀ UAT (TUẦN 21–22)

#### 7.1. Mục tiêu và phạm vi
- Dọn sạch nợ kỹ thuật: Đưa toàn bộ ESLint về **0 lỗi (0 errors)**.
- Triển khai bộ kiểm thử tự động toàn diện: Unit tests, Integration tests với Supabase local/staging, và Playwright E2E.
- Kiểm thử tải và hiệu năng: Mô phỏng 1 lớp 50 học sinh nộp bài gần đồng thời; kiểm tra tải dashboard quy mô pilot.
- Diễn tập khắc phục thảm họa (Disaster Recovery): Backup, restore, rollback migration và kiểm tra RTO $\le$ 2 giờ, RPO $\le$ 15 phút.
- Kiểm tra tiêu chuẩn tiếp cận WCAG 2.2 AA và trải nghiệm người dùng trên thiết bị di động/mạng chậm.

#### 7.2. Danh mục Task kỹ thuật

| Mã Task | Hạng mục | Mô tả chi tiết kỹ thuật | File/Artifact liên quan |
|---|---|---|---|
| **T7.1** | Zero-lint Campaign | Xử lý triệt để ~1.800 lỗi lint còn tồn đọng trong codebase (hook rules, unused vars, type safety, unsafe any). | Toàn bộ codebase |
| **T7.2** | Automated Test Suite | Viết trọn bộ kịch bản kiểm thử Vitest và Playwright E2E cho tất cả luồng nghiệp vụ cốt lõi xuyên vai trò. | `tests/unit/...`, `tests/e2e/...` |
| **T7.3** | Load & Concurrency Test | Viết script giả lập tải: 50 học sinh gửi bài nộp bài tập trong vòng 10 giây; đo độ trễ p50/p95, tỷ lệ lỗi và tính toàn vẹn dữ liệu. | `scripts/tests/load_test_submissions.js` |
| **T7.4** | Latency Benchmarking | Tối ưu hóa truy vấn Supabase, bổ sung composite index, loại bỏ N+1 query để đạt mục tiêu p95 mở dashboard $\le$ 3.0s. | Database indexes, Server Actions |
| **T7.5** | DR Rehearsal | Diễn tập sao lưu và phục hồi: Dump dữ liệu staging $\rightarrow$ Khôi phục sang instance mới $\rightarrow$ Chạy script đối soát kiểm tra toàn vẹn. | Runbook phục hồi thảm họa |
| **T7.6** | Accessibility & PWA | Kiểm tra độ tương phản màu, hỗ trợ phím Tab, aria-labels và service worker cache an toàn (không cache PII và Signed URL). | CSS & Client Components |

#### 7.3. Ma trận kiểm thử Phase 7

| Hạng mục đo lường | Mục tiêu chất lượng | Phương pháp kiểm tra |
|---|---|---|
| **Lint Gate** | **0 errors, 0 warnings mới** trên toàn bộ repository. | `npm run lint` |
| **Typecheck Gate** | **0 errors**, TypeScript strict mode. | `npm run typecheck` |
| **Unit & Integration** | $\ge$ 80% coverage các server actions nghiệp vụ; 100% tests passed. | `npm run test` (Vitest) |
| **E2E Critical Paths** | 100% passed cho 4 luồng: Onboarding $\rightarrow$ Giao bài $\rightarrow$ Nộp bài $\rightarrow$ Báo cáo. | `npm run test:e2e` (Playwright) |
| **Concurrent Submissions** | 50 bài nộp trong 10 giây: **0 bài mất, 0 bài trùng**, p95 xác nhận $\le$ 3.0s. | K6 / Custom Node.js Load Script |
| **Dashboard Latency** | p95 mở Dashboard học sinh và giáo viên $\le$ 3.0s trên mạng tiêu chuẩn 3G/4G. | Lighthouse & Server Timings |
| **Disaster Recovery** | Khôi phục database từ bản backup trong thời gian $\le$ 45 phút, sai lệch dữ liệu = 0. | Diễn tập trên DB Staging |

#### 7.4. Tiêu chí nghiệm thu Gate Phase 7
- [ ] `npm run lint` trả về exit code 0 (không còn bất kỳ lỗi nào).
- [ ] Toàn bộ test suite Vitest và Playwright vượt qua 100%.
- [ ] Kết quả đo tải 50 bài nộp đồng thời đạt chuẩn: 0 lỗi, p95 $\le$ 3.0s.
- [ ] Biên bản diễn tập khôi phục backup thành công có chữ ký xác nhận của Tech Lead.
- [ ] Không còn bất kỳ lỗi nào ở mức độ Blocker hoặc Critical.

---

### PHASE 8: TRIỂN KHAI PILOT THỰC TẾ TẠI TRƯỜNG THCS (TUẦN 23–26)

#### 8.1. Kế hoạch triển khai từng tuần
- **Tuần 23 — Chuẩn bị và Dry-run:**
  - Nhận file danh sách học sinh, giáo viên chính thức từ trường THCS Nguyễn Du (đã ký cam kết bảo mật).
  - Chạy thử nghiệm Import Excel trên Staging $\rightarrow$ Đối soát dữ liệu lớp học, phân công giáo viên với Ban Giám hiệu.
  - Thiết lập kênh tiếp nhận phản hồi và quy trình ứng cứu sự cố 24/7.
- **Tuần 24 — Đào tạo và Bàn giao:**
  - Tổ chức buổi tập huấn thực hành cho: Giáo vụ trường, Giáo viên chủ nhiệm, Giáo viên bộ môn (Toán, Văn, Anh).
  - Bàn giao mã kích hoạt tài khoản cho học sinh và phụ huynh.
  - Hướng dẫn kích hoạt tài khoản lần đầu và đổi mật khẩu an toàn.
- **Tuần 25 — Go-Live theo phân kỳ (Phased Rollout):**
  - Đợt 1 (Đầu tuần): Bật thí điểm cho Khối 6 (2 lớp) và Khối 7 (2 lớp).
  - Đợt 2 (Giữa tuần): Mở rộng tiếp cho Khối 8 và Khối 9.
  - Vận hành các luồng: Điểm danh buổi học, Giao và nộp bài tập về nhà, Thông báo lịch học.
- **Tuần 26 — Theo dõi, Đánh giá và Nghiệm thu:**
  - Giám sát hàng ngày: Số lượng bài nộp, số lượng lỗi phát sinh, hàng đợi outbox, phản hồi giáo viên.
  - Lập báo cáo đối soát học vụ tuần gửi Ban Giám hiệu.
  - Tổ chức họp nghiệm thu Pilot và ký biên bản hoàn thành.

#### 8.2. Tiêu chuẩn đánh giá nghiệm thu Pilot THCS
1. **Độ ổn định dữ liệu:** Tối thiểu 2 tuần học liên tiếp không xảy ra bất kỳ sự cố nào liên quan đến mất bài nộp, sai lệch điểm số, hoặc lộ lọt dữ liệu chéo trường/chéo lớp.
2. **Tỷ lệ kích hoạt tài khoản:** $\ge$ 95% học sinh và giáo viên trong danh sách thí điểm kích hoạt tài khoản và đăng nhập thành công.
3. **Mức độ tự chủ của Giáo viên:** $\ge$ 95% giáo viên tham gia pilot thực hiện độc lập quy trình giao bài $\rightarrow$ chấm bài $\rightarrow$ phản hồi mà không cần can thiệp kỹ thuật.
4. **Tính chính xác của Báo cáo:** 100% số liệu trên báo cáo tổng hợp khớp hoàn toàn với sổ theo dõi thực tế của nhà trường.

---

### PHASE 9: ĐỊNH HƯỚNG MỞ RỘNG SAU PILOT

1. **Mở rộng cấp học:** Tối ưu hóa UI/UX và quy tắc học vụ cho khối Tiểu học (Lớp 1–5) và Trung học Phổ thông (Lớp 10–12) trên cùng nền tảng schema K12 đã thiết kế.
2. **SaaS Multi-tenancy:** Tự động hóa quy trình khởi tạo trường học mới (tenant onboarding), cấu hình tên miền riêng, và phân bổ tài nguyên độc lập.
3. **Tích hợp tiêu chuẩn EdTech:** Sẵn sàng mở rộng kết nối SSO nhà nước, chuẩn trao đổi học liệu LTI/QTI và hệ thống thông tin học sinh (SIS) khi có yêu cầu hợp tác chính thức.

---

## 3. BẢNG TỔNG HỢP DANH MỤC MIGRATION TOÀN DỰ ÁN

| Migration | Tên File Migration | Phase | Bảng & Đối tượng tác động chính | Trạng thái hiện tại |
|:---:|---|:---:|---|:---:|
| **M0** | `202609260000_schema_baseline.sql` | Phase 0 | Phục hồi 63 bảng baseline, 2 views, RPCs, Storage | **ĐÃ HOÀN THÀNH** |
| **M1** | `202609260001_school_scope.sql` | Phase 1 | `schools`, `school_memberships`, gắn `school_id` 10 bảng lõi | **ĐÃ HOÀN THÀNH** |
| **M2** | `202609260002_audit_outbox_idempotency.sql` | Phase 1 | `audit_events`, `outbox_events`, `idempotency_keys` | **ĐÃ HOÀN THÀNH** |
| **M3** | `202609260003_k12_catalog.sql` | Phase 2 | `academic_years`, `terms`, `grade_levels`, `subjects` | **CẦN THỰC HIỆN** |
| **M4** | `202609260004_k12_rosters.sql` | Phase 2 | `homerooms`, `homeroom_enrollments`, `class_teacher_assignments` | **CẦN THỰC HIỆN** |
| **M5** | `202609260005_identity_import.sql` | Phase 3 | `student_identifiers`, `account_activations`, `import_jobs/rows` | **CẦN THỰC HIỆN** |
| **M6** | `202609260006_learning_publication.sql` | Phase 4 | Exam snapshot, `exam_attempts` multi-attempt, `score_adjustments` | **CẦN THỰC HIỆN** |
| **M7** | `202609260007_school_attendance_interventions.sql` | Phase 5 | `attendance_policies`, `absence_requests`, `intervention_cases` | **CẦN THỰC HIỆN** |
| **M8** | `202609260008_reporting_projections.sql` | Phase 5 | Materialized views/RPCs tổng hợp theo kỳ/môn/trường | **CẦN THỰC HIỆN** |
| **M9** | `202609260009_ai_jobs_scope.sql` | Phase 6 | Mở rộng `learning_ai_jobs`, `school_ai_quotas` | **CẦN THỰC HIỆN** |

---

## 4. MA TRẬN QUẢN TRỊ RỦI RO VÀ KẾ HOẠCH DỰ PHÒNG

| Rủi ro tiềm ẩn | Mức độ | Biện pháp ngăn chặn & Xử lý | Kế hoạch Rollback |
|---|:---:|---|---|
| **Xung đột dữ liệu khi chuyển sang mô hình K12** | Cao | Áp dụng quy tắc *Expand $\rightarrow$ Backfill $\rightarrow$ Audit $\rightarrow$ Contract*. Không sửa đè hoặc xóa cột cũ trong giai đoạn chuyển đổi. | Giữ nguyên các cột cũ (`course_id`, `classes.name`), hoàn nguyên luồng đọc về schema cũ qua cờ cấu hình. |
| **Học sinh nộp bài trùng hoặc mất bài do rớt mạng** | Cao | Module `withIdempotency` với mã băm SHA-256 đã kích hoạt từ Phase 1; lưu nháp có phiên bản tăng dần chống ghi đè. | Tự động khôi phục bản nháp server gần nhất khi client kết nối lại. |
| **Sự cố rò rỉ dữ liệu chéo trường/lớp** | Cực cao | Khóa ngoại tổng hợp `(school_id, ...)`, RLS deny-by-default, và lớp kiểm soát `ActorContext` tại 100% Server Actions. | Thu hồi quyền truy cập API ngay lập tức qua cờ khẩn cấp, cô lập tenant bị ảnh hưởng. |
| **Dịch vụ AI gặp sự cố (Timeout/429 Quota)** | Trung bình | Circuit breaker tự động ngắt khi phát hiện lỗi; AI chỉ là trợ lý nháp, không chặn luồng học vụ cốt lõi. | Chuyển toàn bộ tác vụ sang thao tác thủ công, ẩn các nút AI trên UI. |
| **Hiệu năng suy giảm khi có tải đồng thời** | Trung bình | Tối ưu hóa composite indexes trên PostgreSQL; tách tác vụ thông báo và thống kê sang Outbox Worker không đồng bộ. | Tăng quy mô tài nguyên cơ sở dữ liệu tạm thời, kích hoạt bộ nhớ đệm phía server. |

---

## 5. HÀNH ĐỘNG NGAY TIẾP THEO: BẮT ĐẦU PHASE 2

Để khởi động **Phase 2 — Mô hình học vụ K12** một cách chuẩn xác:
1. **Viết Migration M3 (`202609260003_k12_catalog.sql`):** Khởi tạo danh mục chuẩn cho năm học, học kỳ, khối học (6–9), môn học của trường THCS Nguyễn Du.
2. **Viết Migration M4 (`202609260004_k12_rosters.sql`):** Tách bạch `homerooms` (lớp hành chính) và `classes` (lớp bộ môn), thiết lập bảng phân công giáo viên và ghi danh học sinh.
3. **Thực thi Script Backfill an toàn:** Chuyển đổi 6 lớp hiện tại sang cấu trúc mới, đảm bảo `unmapped = 0`.
4. **Mở rộng lớp kiểm soát quyền `ActorContext`:** Bổ sung hỗ trợ phạm vi lớp chủ nhiệm (`homeroomScope`) và môn học (`subjectScope`).
5. **Chạy đối soát trực tiếp trên Supabase và kiểm thử tự động.**
