# Test Plan - LMS EdTech Platform

Last reviewed: 2026-05-27

## 1. Mục tiêu kiểm thử

Đảm bảo các workflow lõi của LMS hoạt động đúng theo role, không rò rỉ dữ liệu giữa người dùng, và các tích hợp AI/payment có fallback rõ khi lỗi.

Hiện `package.json` có `dev`, `build`, `start`, `lint`; chưa có script test tự động. Trước mắt dùng checklist thủ công + lint/build, sau đó bổ sung unit/integration/e2e.

## 2. Lệnh kiểm tra hiện có

```bash
npm run lint
npm run build
```

Khuyến nghị thêm sau:

```bash
npm run test
npm run test:e2e
npm run typecheck
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
| Tạo Stripe payment | PaymentIntent tạo server-side, amount không tin từ client |
| Stripe webhook thành công | Payment/invoice cập nhật idempotent |
| VNPay return/IPN | Verify hash trước khi cập nhật |
| Manual transfer | Admin duyệt trước khi invoice paid |

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

