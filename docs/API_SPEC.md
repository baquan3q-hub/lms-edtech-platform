# API Spec - LMS EdTech Platform

Last reviewed: 2026-05-27

## 1. Phạm vi

Codebase dùng hai kiểu backend interface:

- Server Actions trong `lib/actions/`: dùng cho nghiệp vụ nội bộ từ UI.
- Route Handlers trong `app/api/`: dùng cho AI, payment, activity tracking, webhook/IPN và một số endpoint tiện ích.

Tài liệu này mô tả các API route hiện thấy trong codebase. Server Actions được liệt kê theo module ở cuối file.

## 2. Quy ước chung

| Nội dung | Quy ước |
|---|---|
| Auth | API đọc/ghi dữ liệu nhạy cảm phải gọi Supabase server/admin client và kiểm session/role |
| Response thành công | JSON object có dữ liệu hoặc trạng thái |
| Response lỗi | JSON object có `error`/`message`, HTTP status phù hợp |
| AI output | Phải parse/validate JSON trước khi lưu |
| Payment callback | Phải verify signature/hash và xử lý idempotent |

Lưu ý: `proxy.ts` bỏ qua `/api`, vì vậy không được dựa vào proxy để bảo vệ API routes.

## 3. Activity APIs

| Method | Route | Mục đích | Data chính |
|---|---|---|---|
| POST | `/api/activity/log` | Ghi event học tập/hành vi của student | `student_activity_logs` |
| POST | `/api/activity/page-session` | Ghi phiên truy cập trang | `user_page_sessions` |

Checklist khi mở rộng:

- Chỉ cho user ghi log của chính mình, trừ system/admin job.
- Không lưu payload quá lớn hoặc dữ liệu nhạy cảm không cần thiết.
- Có cơ chế chống spam nếu client gửi quá nhiều event.

## 4. AI APIs

| Method | Route | Mục đích | Ghi chú |
|---|---|---|---|
| POST | `/api/ai` | Endpoint AI tổng quát/placeholder | Cần giữ rõ contract nếu dùng tiếp |
| POST | `/api/ai/generate-questions` | Sinh câu hỏi bằng Gemini | Validate schema câu hỏi |
| POST | `/api/ai/generate-quiz` | Sinh quiz | Nên giới hạn số câu, độ khó, format |
| POST | `/api/ai/generate-supplementary-quiz` | Sinh quiz bổ trợ | Gắn với improvement/analysis |
| POST | `/api/ai/analyze-quiz-class` | Phân tích kết quả lớp | Lưu `quiz_class_analysis` |
| POST | `/api/ai/analyze-quiz-individual` | Phân tích cá nhân từng student | Có batch/retry/rate limit |
| POST | `/api/ai/send-feedback` | Gửi feedback từ AI/teacher | Kiểm quyền teacher/admin |
| POST | `/api/ai/behavior-analysis` | Phân tích hành vi học tập | Gắn với behavior score/alert |
| POST | `/api/ai/admin-insights` | Sinh insight cho admin dashboard | Không gửi raw PII quá mức cần thiết |

AI helpers liên quan:

- `lib/gemini.ts`: Gemini client, key rotation, retry, JSON parsing.
- `lib/actions/quiz-analysis.ts`: đọc/lưu analysis, approve/edit/send supplementary quiz.
- `lib/actions/behavior-analysis.ts`: tính metrics, AI analysis, behavior score/alert.

## 5. Payment APIs

| Method | Route | Mục đích | Provider |
|---|---|---|---|
| POST | `/api/payment` | Payment endpoint tổng quát/placeholder | Internal |
| POST | `/api/payment/create` | Tạo payment flow | Stripe/VNPay/manual tùy payload |
| GET | `/api/payment/parent/invoices` | Parent lấy danh sách invoice | Internal |
| POST | `/api/payment/parent/confirm-transfer` | Parent xác nhận chuyển khoản | Manual transfer |
| GET | `/api/payment/admin/data` | Admin lấy dữ liệu payment/finance | Internal |
| POST | `/api/payment/admin/actions` | Admin cập nhật/duyệt payment action | Internal |
| POST | `/api/payment/stripe/webhook` | Nhận webhook Stripe | Stripe |
| GET | `/api/payment/vnpay/ipn` | Nhận IPN từ VNPay | VNPay |

Trang return:

- `/payment/vnpay/return`: trang nhận người dùng quay lại sau VNPay.

Helpers:

- `lib/stripe.ts`: tạo Stripe PaymentIntent.
- `lib/vnpay.ts`: tạo payment URL, verify VNPay return/IPN.

Checklist payment:

- Verify `STRIPE_WEBHOOK_SECRET` cho Stripe webhook.
- Verify `vnp_SecureHash` cho VNPay.
- Mọi update payment/invoice phải idempotent theo transaction/order id.
- Không tin amount/status từ client.

## 6. Notification API

| Method | Route | Mục đích |
|---|---|---|
| POST | `/api/notifications` | Tạo/gửi notification hoặc trigger notification flow |

Server Actions liên quan:

- `lib/actions/notifications.ts`
- `lib/actions/admin-announcements.ts`
- `lib/actions/announcement.ts`
- `lib/notifications/send-notification.ts`

## 7. Improvement quiz API

| Method | Route | Mục đích | Data chính |
|---|---|---|---|
| POST | `/api/improvement-quiz/submit` | Student nộp quiz bổ trợ/cải thiện | `improvement_quiz_results`, `improvement_progress` |

## 8. Server Actions theo module

| Module | File chính | Chức năng |
|---|---|---|
| Admin/user | `admin.ts`, `admin-grades.ts`, `admin-announcements.ts` | User, grade overview, announcement |
| Academic | `academic.ts`, `class-students.ts`, `teacherStudents.ts` | Course, class, enrollment, student stats |
| Attendance | `attendance.ts`, `attendance-points.ts`, `point.ts` | Session, records, absence, points, reports |
| Schedule | `schedule.ts`, `class-sessions.ts`, `teacher-leave.ts` | Rooms, schedules, sessions, substitute teacher |
| Content | `teacher.ts`, `courseBuilder.ts`, `resourceBank.ts`, `discussion.ts` | Lessons, sections, item content, resource bank, discussion |
| Assessment | `homework.ts`, `exam.ts`, `quiz-analysis.ts` | Homework, exams, submissions, grading, AI feedback |
| Parent | `parentStudent.ts`, `parent-progress.ts`, `parent-views.ts`, `parentAnnouncements.ts` | Link student, progress, schedule, child announcements |
| Feedback/survey | `feedback.ts`, `surveys.ts`, `student-reviews.ts` | User feedback, survey, reviews |
| AI/behavior | `gemini-analysis.ts`, `behavior-analysis.ts`, `daily-activity.ts` | AI insight, behavior analytics, activity |
| Profile | `profile.ts` | User profile |

## 9. Khi thêm API mới

Mỗi API mới phải ghi rõ:

- Method, route, request body, response body.
- Ai được gọi endpoint.
- Bảng nào bị đọc/ghi.
- Có dùng admin client không, vì sao.
- Test case thành công, unauthorized, forbidden, invalid input, provider error.

