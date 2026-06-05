# PRD - LMS EdTech Platform

Last reviewed: 2026-05-27

## 1. Mục tiêu sản phẩm

LMS EdTech Platform là hệ thống quản lý học tập và vận hành trung tâm giáo dục, tập trung vào bốn nhóm người dùng: Admin, Teacher, Student và Parent. Mục tiêu của dự án là gom các nghiệp vụ đang rời rạc như quản lý lớp, lịch học, học liệu, bài tập, bài kiểm tra, điểm danh, học phí, thông báo và theo dõi tiến bộ vào một nền tảng thống nhất.

Hệ thống hiện đã có codebase Next.js App Router, Supabase, AI Gemini, Stripe, VNPay, PWA, realtime sync và nhiều phân hệ học vụ. Tài liệu này dùng làm điểm neo để phát triển sâu hơn mà không làm lệch hướng kiến trúc hiện tại.

## 2. Người dùng mục tiêu

| Vai trò | Nhu cầu chính | Khu vực trong app |
|---|---|---|
| Admin | Điều hành trung tâm, quản lý user, course, class, schedule, attendance, finance, survey, feedback, analytics | `/admin/*` |
| Teacher | Vận hành lớp, tạo học liệu, giao bài, điểm danh, chấm điểm, phân tích tiến bộ, gửi nhận xét | `/teacher/*` |
| Student | Học theo lớp, làm homework/exam/quiz, xem điểm, lịch, thông báo, tiến bộ cá nhân | `/student/*` |
| Parent | Theo dõi con, xem lịch/điểm/chuyên cần/tiến bộ, xin nghỉ, thanh toán, gửi phản hồi | `/parent/*` |
| AI/System | Sinh nội dung, phân tích bài làm, tạo feedback, gợi ý can thiệp, cảnh báo hành vi | `/api/ai/*`, `lib/actions/*analysis*` |

## 3. Phạm vi hiện tại

### Đã có trong codebase

- Xác thực và phân quyền theo role qua Supabase Auth, `proxy.ts`, bảng `users`.
- Dashboard riêng cho Admin, Teacher, Student, Parent.
- Quản lý khóa học, lớp học, ghi danh, giáo viên, học sinh.
- Quản lý phòng học, lịch học, buổi học, giáo viên thay thế.
- Course builder với cây nội dung, item content, quiz/video/document/link.
- Homework, exams, submissions, grading, analytics.
- Điểm danh, xin nghỉ, báo cáo chuyên cần, attendance points.
- Thông báo, announcements, read tracking, realtime sync.
- Phụ huynh liên kết học sinh bằng invite code hoặc admin linking.
- Payment module với invoice/payment, Stripe và VNPay.
- Survey, feedback, student reviews.
- AI Gemini cho sinh câu hỏi, phân tích quiz, feedback cá nhân/lớp, admin insights, behavior analysis.
- Activity tracking, page sessions, behavior scores, behavior alerts.
- PWA với service worker và caching cơ bản.

### Chưa nên coi là hoàn thiện

- Chuẩn hóa migration Supabase thành một pipeline duy nhất.
- Rà soát RLS, vì một số migration cũ có đoạn disable RLS hoặc policy rộng.
- Bộ test tự động còn chưa thể hiện rõ trong `package.json`.
- Quan sát sản phẩm production: logging, error tracking, metrics, audit logs.
- Quy trình release và rollback cần được đóng gói.

## 4. MVP phát triển tiếp

MVP tiếp theo nên ưu tiên độ ổn định và khả năng mở rộng thay vì thêm thật nhiều tính năng mới.

| Ưu tiên | Mục tiêu | Tiêu chí hoàn thành |
|---|---|---|
| P0 | Chuẩn hóa auth/RBAC/RLS | Mọi route dashboard đúng role; API/server action kiểm quyền server-side; không dùng service role ngoài vùng admin/server an toàn |
| P0 | Ổn định data model | Có tài liệu DB, migration thứ tự rõ, không tạo bảng trùng ý nghĩa |
| P0 | Kiểm thử workflow lõi | Có test hoặc checklist xác minh login, lớp học, học liệu, bài kiểm tra, điểm danh, thanh toán |
| P1 | Nâng cấp UX role portals | Các flow chính ít bước, có empty/loading/error state rõ |
| P1 | AI an toàn hơn | Prompt/output có schema, retry/rate-limit, không tự ghi nhận xét quan trọng khi chưa có duyệt nếu cần |
| P1 | Reporting | Admin/Teacher có báo cáo học tập, chuyên cần, tài chính có thể export |
| P2 | Automation | Nhắc hạn, cảnh báo sớm, lịch chạy định kỳ, báo cáo định kỳ cho phụ huynh |

## 5. Nguyên tắc phát triển

- Mỗi thay đổi lớn phải gắn với một actor, một workflow và một bảng dữ liệu chính.
- Ưu tiên Server Actions cho nghiệp vụ nội bộ; API routes dùng cho webhook, AI, activity tracking, payment hoặc tích hợp ngoài.
- Không tin UI để phân quyền. Quyền phải được kiểm ở server action/API và RLS.
- Không thêm bảng mới nếu có thể mở rộng bảng hiện có một cách rõ ràng.
- AI output phải được validate, parse, lưu trace tối thiểu và có fallback khi lỗi.
- Feature mới phải cập nhật ít nhất một trong các file: `ARCHITECTURE.md`, `DB_SCHEMA.md`, `API_SPEC.md`, `TEST_PLAN.md`.

## 6. Success metrics

| Nhóm | Metric đề xuất |
|---|---|
| Học tập | Tỷ lệ hoàn thành bài, điểm trung bình, tiến bộ theo lớp/cá nhân, số học sinh cần can thiệp |
| Vận hành | Tỷ lệ điểm danh đầy đủ, lịch học không xung đột, số tác vụ admin thủ công giảm |
| Phụ huynh | Tỷ lệ phụ huynh liên kết con, mở thông báo, xem tiến bộ, thanh toán đúng hạn |
| Tài chính | Tỷ lệ invoice paid/overdue, thời gian đối soát, lỗi webhook/IPN |
| Kỹ thuật | Build pass, lint pass, API error rate, AI parse/rate-limit error rate |

