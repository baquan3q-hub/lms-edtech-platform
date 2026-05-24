# Phân tích tổng hợp phần mềm LMS EdTech

Tài liệu này tổng hợp hệ thống LMS EdTech từ góc nhìn business, nghiệp vụ, kỹ thuật và dữ liệu người học. Nội dung được viết theo hướng đi từ phạm vi lớn đến nhỏ: toàn hệ thống, nhóm người dùng, phân hệ chức năng, luồng dữ liệu người học, AI và can thiệp sớm.

Nguồn đối chiếu chính gồm `README.md`, `motaweblms.md`, `user-stories.md`, `KnowledgeBehavior.md`, `ML_Research_Proposal.md`, các tài liệu trong `docs/`, route trong `app/`, server actions trong `lib/actions/`, Supabase migrations và `types/database.ts`.

Ghi chú hiện trạng: tài liệu gốc có nơi ghi Next.js 14, nhưng `package.json` hiện tại dùng Next.js 16.1.6, React 19.2.3, TypeScript 5, Supabase, Google Gemini, Stripe, VNPay, TanStack Query, Zustand, Recharts và shadcn/ui.

## 1. Giới thiệu phần mềm

Hệ thống là một nền tảng LMS dành cho trung tâm tiếng Anh, nhưng phạm vi thực tế rộng hơn một website học online. Nó kết hợp các năng lực của hệ quản trị học tập, hệ quản trị học vụ, cổng phụ huynh, hệ thống giao tiếp nội bộ, quản lý tài chính và phân tích học tập bằng AI.

Mục tiêu sản phẩm là số hóa toàn bộ chuỗi vận hành của trung tâm:

| Trục giá trị | Ý nghĩa |
|---|---|
| Học tập | Học sinh học theo lớp, theo lộ trình, làm bài tập, làm quiz/exam, nhận phản hồi. |
| Vận hành | Admin quản lý user, khóa học, lớp học, phòng học, lịch học, điểm danh, học phí. |
| Giảng dạy | Giáo viên tạo học liệu, tổ chức lớp, điểm danh, giao bài, chấm điểm, nhận xét. |
| Phụ huynh | Phụ huynh theo dõi con, gửi đơn xin nghỉ, nhận thông báo, xem học phí và phản hồi. |
| Dữ liệu | Hệ thống tập trung dữ liệu học vụ, tiến trình, điểm số, chuyên cần, hành vi và thanh toán. |
| AI | AI hỗ trợ tạo nội dung, phân tích kết quả, phát hiện tín hiệu rủi ro và gợi ý can thiệp. |

Điểm khác biệt chính của phần mềm là nó không chỉ lưu điểm và học liệu. Hệ thống quan sát cả quá trình học: học sinh mở bài nào, tiến độ ra sao, làm bài trong bao lâu, đổi tab bao nhiêu lần, điểm số biến động thế nào, chuyên cần có ổn định không. Những dữ liệu này được chuyển thành tín hiệu hỗ trợ giáo viên, phụ huynh và quản trị viên can thiệp sớm.

## 2. Bối cảnh business và bài toán cần giải quyết

Một trung tâm tiếng Anh thường có nhiều quy trình phân tán: quản lý lớp trên Excel, trao đổi phụ huynh qua Zalo, điểm danh bằng giấy hoặc file riêng, học phí qua chuyển khoản thủ công, bài tập qua nhiều kênh khác nhau. Khi quy mô lớp tăng, các vấn đề sau xuất hiện:

| Vấn đề vận hành | Hậu quả | Cách hệ thống xử lý |
|---|---|---|
| Dữ liệu học sinh, lớp, điểm danh, điểm số rời rạc | Khó kiểm soát, khó truy vết, dễ sai lệch | Gom vào Supabase PostgreSQL theo các miền dữ liệu liên kết. |
| Giáo viên mất thời gian hành chính | Giảm thời gian cho chuyên môn và hỗ trợ học sinh | Tự động hóa điểm danh, báo cáo, thông báo, phân tích bài kiểm tra. |
| Phụ huynh thiếu thông tin liên tục | Chỉ biết vấn đề khi đã muộn hoặc qua trao đổi không chính thức | Cổng phụ huynh cho lịch học, điểm, tiến độ, chuyên cần, học phí, nhận xét. |
| Trung tâm khó phát hiện học sinh có nguy cơ tụt lại | Can thiệp muộn, khó giữ chân học viên | Theo dõi hành vi, điểm số, tiến độ, chuyên cần và tạo cảnh báo mềm. |
| Học phí và hóa đơn xử lý thủ công | Khó theo dõi nợ, khó đối soát thanh toán | Phân hệ `fee_plans`, `invoices`, `payments`, Stripe, VNPay và webhook. |

Từ góc nhìn business, hệ thống giúp trung tâm chuyển từ vận hành dựa vào con người và công cụ rời rạc sang vận hành dựa trên quy trình và dữ liệu. Từ góc nhìn học thuật, hệ thống chuyển trọng tâm từ "chỉ dạy và chấm" sang "quan sát, phản hồi, hỗ trợ và cải thiện liên tục".

## 3. Nhóm người dùng và vai trò

| Actor | Mục tiêu chính | Dữ liệu nhìn thấy | Thao tác chính |
|---|---|---|---|
| Admin | Điều hành toàn hệ thống | Toàn bộ user, lớp, khóa học, lịch, chuyên cần, điểm, phản hồi, học phí, analytics | Quản lý user, lớp, phòng, lịch, học phí, khảo sát, dashboard, báo cáo. |
| Teacher | Tổ chức dạy học và theo dõi học sinh | Lớp mình dạy, học sinh trong lớp, học liệu, bài nộp, điểm, điểm danh, cảnh báo | Tạo nội dung, giao homework/exam, điểm danh, chấm điểm, gửi nhận xét, xử lý xin nghỉ. |
| Student | Học tập và theo dõi tiến độ cá nhân | Lớp đã ghi danh, bài học, bài tập, điểm, lịch, thông báo, feedback cá nhân | Học bài, làm quiz/exam, nộp homework, xem điểm, xem tiến độ, nhận gợi ý. |
| Parent | Đồng hành với con và giao tiếp với trung tâm | Dữ liệu của con đã liên kết: lịch, điểm, chuyên cần, tiến độ, học phí, thông báo | Liên kết con, xem dashboard, gửi xin nghỉ, thanh toán, gửi phản hồi, xem khảo sát. |
| AI/System | Hỗ trợ tự động hóa và phân tích | Dữ liệu học tập, điểm số, hành vi, chuyên cần, bài nộp | Sinh câu hỏi, phân tích bài kiểm tra, tạo feedback, tạo bài bổ trợ, cảnh báo hành vi. |
| Payment Gateway | Xử lý thanh toán bên ngoài | Thông tin giao dịch tối thiểu | Thanh toán qua Stripe/VNPay, trả webhook/IPN để cập nhật trạng thái. |

Hệ thống đặt phụ huynh thành một actor độc lập, không chỉ là người nhận tin nhắn. Phụ huynh có quyền xem dữ liệu con em qua quan hệ `parent_students`, nhưng không can thiệp vào điểm, học liệu hoặc đánh giá chuyên môn.

## 4. Phạm vi chức năng toàn hệ thống

| Phân hệ | Chức năng chính | Route/action/API tiêu biểu | Dữ liệu chính |
|---|---|---|---|
| Xác thực và phân quyền | Đăng nhập, lấy role, điều hướng đúng dashboard | `app/(auth)/login`, `proxy.ts`, `lib/supabase/*` | `users`, Supabase Auth |
| Quản trị user | CRUD user, hồ sơ, phân quyền, liên kết phụ huynh | `app/(dashboard)/admin/users`, `lib/actions/admin.ts`, `parentStudent.ts` | `users`, `profiles`, `parent_students` |
| Học vụ | Khóa học, lớp học, ghi danh học sinh | `admin/classes`, `admin/courses`, `lib/actions/academic.ts` | `courses`, `classes`, `enrollments` |
| Lịch học | Phòng, lịch lớp, buổi học, giáo viên thay thế | `teacher/classes/[id]/schedule`, `lib/actions/schedule.ts` | `rooms`, `class_schedules`, `class_sessions`, `teacher_leave_requests` |
| Học liệu | Cây bài học, nội dung, tài nguyên giáo viên | `teacher/classes/[id]/content`, `student/classes/[id]/learn`, `courseBuilder.ts` | `course_items`, `item_contents`, `teacher_resources`, `student_progress` |
| Bài tập và kiểm tra | Homework, exam, câu hỏi, bài nộp, chấm điểm | `lib/actions/homework.ts`, `exam.ts`, API AI | `homework`, `homework_submissions`, `exams`, `exam_submissions` |
| Điểm danh | Mở phiên, ghi nhận từng học sinh, lịch sử, export | `teacher/classes/[id]/AttendanceClient`, `lib/actions/attendance.ts` | `attendance_sessions`, `attendance_records`, `absence_requests` |
| Gamification | Điểm chuyên cần, bảng xếp hạng, điểm lớp | `attendance-points.ts`, `point.ts` | `student_points`, `attendance_points`, `student_achievements` |
| Thông báo | In-app notification, announcement, read tracking | `notifications.ts`, `admin-announcements.ts`, `useRealtimeSync.ts` | `notifications`, `announcements`, `announcement_reads` |
| Phụ huynh | Theo dõi con, lịch, tiến độ, feedback, xin nghỉ | `app/(dashboard)/parent`, `parentStudent.ts`, `parent-progress.ts` | `parent_students`, `attendance_records`, `exam_submissions`, `homework_submissions` |
| Tài chính | Học phí, hóa đơn, thanh toán, webhook | `app/api/payment/*`, `lib/stripe.ts`, `lib/vnpay.ts` | `fee_plans`, `fee_schedules`, `invoices`, `payments` |
| Khảo sát và phản hồi | Survey, response, feedback user, trạng thái xử lý | `surveys.ts`, `feedback.ts` | `surveys`, `survey_questions`, `survey_responses`, `user_feedback` |
| AI học tập | Sinh câu hỏi, phân tích lớp/cá nhân, gửi feedback | `app/api/ai/*`, `quiz-analysis.ts`, `gemini.ts` | `quiz_class_analysis`, `quiz_individual_analysis`, `supplementary_quizzes`, `improvement_progress` |
| Hành vi và can thiệp sớm | Activity tracking, behavior score, alert | `useActivityTracker.ts`, `/api/activity/log`, `behavior-analysis.ts` | `student_activity_logs`, `user_page_sessions`, `student_behavior_scores`, `behavior_alerts` |

## 5. User flow chart bằng mô tả chữ

### 5.1. Luồng tổng quan sau đăng nhập

| Bước | Actor/System | Hành động | Dữ liệu phát sinh hoặc sử dụng | Kết quả |
|---|---|---|---|---|
| 1 | Người dùng | Truy cập hệ thống và đăng nhập | Email/password, Supabase Auth session | Hệ thống xác thực danh tính. |
| 2 | System | Đọc role trong bảng `users` | `users.role` | Điều hướng vào `/admin`, `/teacher`, `/student` hoặc `/parent`. |
| 3 | User theo vai trò | Thực hiện nghiệp vụ | Lớp, bài học, điểm danh, bài nộp, hóa đơn, thông báo | Dữ liệu được lưu vào Supabase. |
| 4 | System | Đồng bộ dữ liệu và cache | Supabase Realtime, TanStack Query | UI cập nhật cho người liên quan. |
| 5 | AI/System | Tổng hợp tín hiệu học tập | Điểm, tiến độ, chuyên cần, activity logs | Sinh phân tích, feedback, cảnh báo hoặc gợi ý. |
| 6 | Teacher/Parent/Admin | Nhận dashboard hoặc thông báo | `notifications`, reports, analytics | Con người quyết định hành động hỗ trợ. |

### 5.2. Luồng Admin

Admin -> Tạo user/role -> Lưu `users`, `profiles` -> User đăng nhập được đúng portal.

Admin -> Tạo course/class -> Lưu `courses`, `classes` -> Có đơn vị học vụ để xếp lịch, ghi danh, giao học liệu.

Admin -> Ghi danh học sinh -> Lưu `enrollments` -> Student thấy lớp, Teacher thấy danh sách lớp, Parent xem được nếu đã liên kết.

Admin -> Quản lý phòng/lịch -> Lưu `rooms`, `class_schedules`, sinh `class_sessions` -> Lịch hiển thị cho teacher/student/parent.

Admin -> Tạo học phí/hóa đơn -> Lưu `fee_plans`, `invoices` -> Parent thấy khoản cần thanh toán.

Admin -> Theo dõi dashboard -> Đọc dữ liệu tổng hợp từ lớp, điểm danh, điểm, học phí, behavior -> Ra quyết định vận hành.

### 5.3. Luồng Teacher

Teacher -> Vào lớp phụ trách -> Đọc `classes`, `enrollments`, `class_sessions` -> Thấy lịch, học sinh và hoạt động lớp.

Teacher -> Xây dựng học liệu -> Lưu `course_items`, `item_contents`, `teacher_resources` -> Student học theo cây nội dung.

Teacher -> Tạo homework/exam -> Lưu `homework`, `exams`, câu hỏi JSON hoặc `questions` -> Student nhận bài.

Teacher -> Điểm danh -> Lưu `attendance_sessions`, `attendance_records` -> Parent/Admin/Student cập nhật chuyên cần.

Teacher -> Xem bài nộp và chấm điểm -> Cập nhật `homework_submissions`, `exam_submissions` -> Student và Parent xem kết quả.

Teacher -> Chạy AI analysis -> Lưu `quiz_class_analysis`, `quiz_individual_analysis` -> Teacher duyệt feedback trước khi gửi.

Teacher -> Gửi nhận xét/can thiệp -> Lưu `notifications`, `improvement_progress`, có thể sinh `supplementary_quizzes` -> Student nhận bài cải thiện, Parent được thông báo.

### 5.4. Luồng Student

Student -> Đăng nhập vào dashboard -> Đọc `enrollments`, `classes`, `class_sessions` -> Thấy lớp và lịch học.

Student -> Mở bài học -> Đọc `course_items`, `item_contents` -> Nội dung hiển thị.

Student -> Tương tác với bài học/quiz/exam/homework -> `useActivityTracker` ghi nhận event -> `/api/activity/log` lưu `student_activity_logs`.

Student -> Hoàn thành nội dung -> Cập nhật `student_progress`, `quiz_attempts` -> Tiến độ cá nhân tăng.

Student -> Nộp homework/exam -> Lưu `homework_submissions` hoặc `exam_submissions` -> Teacher chấm hoặc hệ thống tự chấm phần trắc nghiệm.

Student -> Nhận feedback AI/teacher -> Đọc `quiz_individual_analysis`, `improvement_progress`, `supplementary_quizzes` -> Làm bài bổ trợ và cải thiện.

### 5.5. Luồng Parent

Parent -> Liên kết con -> Tạo hoặc xác nhận `parent_students` -> Parent có quyền xem dữ liệu con.

Parent -> Xem dashboard con -> Đọc lớp, lịch, điểm, chuyên cần, tiến độ, nhận xét -> Có bức tranh học tập liên tục.

Parent -> Gửi đơn xin nghỉ -> Lưu `absence_requests` -> Teacher/Admin duyệt, thông báo quay lại phụ huynh.

Parent -> Thanh toán học phí -> Tạo `payments`, cập nhật `invoices` qua Stripe/VNPay -> Parent thấy trạng thái thanh toán, Admin đối soát được.

Parent -> Gửi phản hồi hoặc khảo sát -> Lưu `user_feedback`, `survey_responses` -> Admin/Teacher xử lý dịch vụ.

## 6. Use case diagram bằng bảng

| Actor | Use case | Hệ thống liên quan | Dữ liệu chính |
|---|---|---|---|
| Admin | Quản lý người dùng và phân quyền | Admin dashboard, server actions admin, Supabase Auth | `users`, `profiles` |
| Admin | Quản lý khóa học, lớp học, ghi danh | Admin courses/classes, academic actions | `courses`, `classes`, `enrollments` |
| Admin | Quản lý lịch, phòng, buổi học | Admin rooms, schedule actions | `rooms`, `class_schedules`, `class_sessions` |
| Admin | Quản lý học phí và hóa đơn | Payment admin API, finance page | `fee_plans`, `invoices`, `payments` |
| Admin | Theo dõi analytics và cảnh báo | Admin dashboard, behavior dashboard | `attendance_records`, `student_behavior_scores`, `behavior_alerts` |
| Teacher | Vận hành lớp học | Teacher class pages | `classes`, `enrollments`, `class_sessions` |
| Teacher | Tạo học liệu và lộ trình | Course builder, resource bank | `course_items`, `item_contents`, `teacher_resources` |
| Teacher | Tạo bài tập, quiz, exam | Homework/exam actions, AI generate routes | `homework`, `exams`, `questions`, `exam_submissions` |
| Teacher | Điểm danh và duyệt xin nghỉ | Attendance actions, absence requests page | `attendance_sessions`, `attendance_records`, `absence_requests` |
| Teacher | Phân tích kết quả và gửi nhận xét | AI quiz routes, quiz-analysis actions | `quiz_class_analysis`, `quiz_individual_analysis`, `notifications` |
| Student | Học theo lộ trình | Student learn pages | `course_items`, `item_contents`, `student_progress` |
| Student | Làm bài và nộp bài | Student exam/homework pages | `exam_submissions`, `homework_submissions`, `quiz_attempts` |
| Student | Xem điểm, lịch, thông báo | Student dashboard, schedule, grades | `class_sessions`, `notifications`, `exam_submissions`, `homework_submissions` |
| Student | Nhận bài cải thiện | Feedback page, improvement quiz API | `improvement_progress`, `supplementary_quizzes`, `improvement_quiz_results` |
| Parent | Theo dõi con | Parent dashboard/progress/schedule | `parent_students`, `attendance_records`, `student_progress`, submissions |
| Parent | Gửi đơn xin nghỉ | Parent absence request | `absence_requests`, `notifications` |
| Parent | Thanh toán học phí | Parent payments, payment API | `invoices`, `payments` |
| Parent | Gửi phản hồi và khảo sát | Parent feedback/surveys | `user_feedback`, `surveys`, `survey_responses` |
| AI/System | Sinh câu hỏi và quiz | Gemini API routes | `exams`, generated questions, `teacher_resources` |
| AI/System | Phân tích lớp và cá nhân | `analyze-quiz-class`, `analyze-quiz-individual` | `quiz_class_analysis`, `quiz_individual_analysis` |
| AI/System | Phân tích hành vi và cảnh báo | Activity APIs, behavior actions | `student_activity_logs`, `student_behavior_scores`, `behavior_alerts` |
| Payment Gateway | Xử lý giao dịch | Stripe webhook, VNPay IPN | `payments`, `invoices`, raw provider response |

## 7. Sơ đồ kỹ thuật hệ thống bằng mô tả chữ

### 7.1. Kiến trúc lớp

| Lớp | Thành phần | Trách nhiệm |
|---|---|---|
| UI | Next.js App Router, React, shadcn/ui, Tailwind, Recharts | Hiển thị dashboard theo vai trò, form nghiệp vụ, bảng, biểu đồ, mobile/PWA. |
| Client state | Zustand, TanStack Query | Quản lý notification store, cache server data, invalidate khi có realtime event. |
| Server application | Server Components, Server Actions trong `lib/actions`, API routes trong `app/api` | Xử lý nghiệp vụ, xác thực server-side, gọi Supabase, gọi AI/payment. |
| Auth/RBAC | Supabase Auth, `proxy.ts`, RLS | Xác thực session, đọc role, redirect đúng dashboard, giới hạn quyền dữ liệu. |
| Data | Supabase PostgreSQL | Lưu dữ liệu quan hệ về user, lớp, học liệu, điểm, chuyên cần, học phí, AI. |
| Realtime | Supabase Realtime, `useRealtimeSync` | Cập nhật điểm danh, thông báo, stats, announcement, attendance points. |
| Storage | Supabase Storage | Lưu file học liệu, video, tài liệu, đính kèm. |
| AI | Google Gemini qua `lib/gemini.ts` | Sinh quiz, phân tích bài kiểm tra, tạo feedback, phân tích hành vi, fallback/rate handling. |
| Payment | Stripe, VNPay | Tạo payment intent/URL, xác thực webhook/IPN, cập nhật hóa đơn và giao dịch. |
| Notification/Email | `notifications`, Resend định hướng | Gửi thông báo in-app, có thể mở rộng email/PDF invoice/report. |

### 7.2. Luồng request kỹ thuật tổng quát

Browser -> Next.js route/page -> Server Component hoặc Client Component -> Server Action/API Route -> Supabase hoặc dịch vụ ngoài -> Lưu dữ liệu -> Realtime/cache invalidation -> UI cập nhật cho đúng vai trò.

Ví dụ điểm danh:

Teacher UI -> `saveAttendanceRecords` -> `attendance_records` + `attendance_points` + `notifications` -> Supabase Realtime -> Admin dashboard, Parent dashboard, Student attendance history cập nhật.

Ví dụ AI feedback:

Teacher analytics page -> `/api/ai/analyze-quiz-individual` -> đọc `exams` và `exam_submissions` -> gọi Gemini -> lưu `quiz_individual_analysis` -> Teacher duyệt -> `/api/ai/send-feedback` -> tạo `improvement_progress` và `notifications` cho student/parent.

Ví dụ thanh toán:

Parent payments page -> `/api/payment/create` hoặc VNPay URL -> Stripe/VNPay xử lý -> webhook/IPN -> cập nhật `payments`, `invoices` -> gửi notification cho phụ huynh và admin theo dõi.

## 8. Mô hình dữ liệu hệ thống

Mô hình dữ liệu nên được đọc theo trục `users -> classes -> learning activity -> analytics/intervention`.

| Miền dữ liệu | Bảng tiêu biểu | Vai trò |
|---|---|---|
| Danh tính và quyền | `users`, `profiles` | Định danh người dùng, role, thông tin cá nhân. |
| Quan hệ phụ huynh - học sinh | `parent_students` | Cho phép phụ huynh xem dữ liệu con trong phạm vi được liên kết. |
| Học vụ | `courses`, `classes`, `enrollments` | Tổ chức chương trình, lớp, giáo viên và học sinh. |
| Lịch và buổi học | `rooms`, `class_schedules`, `class_sessions`, `teacher_leave_requests` | Quản lý phòng, lịch, buổi học cụ thể, nghỉ dạy và dạy thay. |
| Học liệu | `lessons`, `course_items`, `item_contents`, `teacher_resources` | Lưu bài giảng, cây nội dung, video, tài liệu, quiz, resource bank. |
| Tiến trình | `student_progress`, `quiz_attempts`, `student_class_stats` | Ghi nhận học sinh học đến đâu, hoàn thành gì, thống kê theo lớp. |
| Đánh giá | `homework`, `homework_submissions`, `exams`, `exam_submissions`, `assignments`, `questions` | Tạo bài, nộp bài, điểm số, bài kiểm tra. |
| Chuyên cần | `attendance_sessions`, `attendance_records`, `absence_requests`, `attendance_points` | Điểm danh, xin nghỉ, điểm chuyên cần, báo cáo chuyên cần. |
| Giao tiếp | `announcements`, `announcement_reads`, `notifications`, `discussion_messages` | Thông báo, xác nhận đã đọc, trao đổi trong lớp/nội dung. |
| Tài chính | `fee_plans`, `fee_schedules`, `invoices`, `payments` | Học phí, hóa đơn, lịch thu, giao dịch thanh toán. |
| Phản hồi/dịch vụ | `user_feedback`, `surveys`, `survey_questions`, `survey_responses`, `student_reviews` | Thu phản hồi, khảo sát, nhận xét định kỳ. |
| AI và can thiệp | `quiz_class_analysis`, `quiz_individual_analysis`, `supplementary_quizzes`, `improvement_progress`, `improvement_quiz_results` | Phân tích bài kiểm tra, bài cải thiện, tiến độ cải thiện. |
| Hành vi học tập | `student_activity_logs`, `user_page_sessions`, `student_behavior_scores`, `behavior_alerts` | Ghi telemetry, tổng hợp hành vi, risk/gaming score, cảnh báo mềm. |

Quan hệ dữ liệu cốt lõi:

1. `users` là điểm bắt đầu của mọi vai trò.
2. `classes` là trung tâm học vụ vì nối `courses`, `teacher_id`, `enrollments`, lịch, học liệu, bài kiểm tra và điểm danh.
3. `enrollments` nối học sinh với lớp, từ đó mở quyền học và phát sinh dữ liệu học tập.
4. `parent_students` nối phụ huynh với học sinh để phụ huynh xem dữ liệu con.
5. `exam_submissions`, `homework_submissions`, `student_progress`, `attendance_records`, `student_activity_logs` là nhóm dữ liệu phản ánh hành trình người học.
6. `quiz_*_analysis`, `student_behavior_scores`, `behavior_alerts`, `improvement_progress` là nhóm biến dữ liệu học tập thành hành động hỗ trợ.

## 9. Luồng dữ liệu người học

Luồng dữ liệu người học là phần quan trọng nhất của hệ thống vì nó biến hoạt động học thành dữ liệu, sau đó biến dữ liệu thành hỗ trợ.

### 9.1. Từ hồ sơ đến lớp học

Student account -> `users(role=student)` -> ghi danh vào lớp qua `enrollments` -> lớp có lịch `class_sessions` -> học sinh thấy lớp, lịch và nội dung.

Nếu phụ huynh được liên kết:

Parent account -> `parent_students(parent_id, student_id)` -> parent có quyền đọc dữ liệu con -> cổng phụ huynh hiển thị lịch, điểm, chuyên cần, feedback, hóa đơn.

### 9.2. Từ học liệu đến tiến trình

Teacher tạo cây nội dung -> `course_items` và `item_contents` -> Student mở nội dung -> hệ thống cập nhật `student_progress` và có thể ghi `student_activity_logs`.

Dữ liệu phát sinh:

| Hành động học sinh | Dữ liệu tạo ra | Ý nghĩa |
|---|---|---|
| Mở bài/video/tài liệu | `student_activity_logs`, `user_page_sessions` | Biết học sinh có tương tác thật với nội dung không. |
| Hoàn thành item | `student_progress` | Theo dõi tiến độ học theo từng lớp/nội dung. |
| Làm quiz | `quiz_attempts`, activity logs | Đo mức hiểu bài và hành vi làm bài. |
| Làm exam | `exam_submissions`, activity logs | Đánh giá chính thức, dùng cho phân tích AI. |
| Nộp homework | `homework_submissions` | Theo dõi luyện tập, deadline và điểm. |

### 9.3. Từ điểm danh đến chuyên cần

Teacher mở phiên điểm danh -> tạo hoặc lấy `attendance_sessions` -> lưu `attendance_records` cho từng học sinh -> cập nhật điểm chuyên cần hoặc thống kê -> gửi `notifications` khi cần.

Nếu phụ huynh xin nghỉ:

Parent tạo `absence_requests` -> Teacher/Admin duyệt -> khi điểm danh có thể ghi trạng thái `excused` -> Parent nhận thông báo kết quả.

### 9.4. Từ đánh giá đến phản hồi

Teacher tạo exam/homework -> Student làm bài -> hệ thống lưu bài nộp -> Teacher chấm hoặc hệ thống tự tính điểm phần trắc nghiệm -> AI phân tích -> Teacher duyệt feedback -> Student và Parent nhận thông báo.

Luồng chi tiết:

Exam -> `exam_submissions` -> `/api/ai/analyze-quiz-class` tạo phân tích lớp -> `/api/ai/analyze-quiz-individual` tạo phân tích cá nhân -> Teacher duyệt/sửa -> `/api/ai/send-feedback` gửi cho Student/Parent -> `improvement_progress` theo dõi nhiệm vụ cải thiện -> Student làm bài bổ trợ -> `improvement_quiz_results`.

### 9.5. Từ dữ liệu thô đến dashboard

Các dashboard không chỉ đọc dữ liệu gốc. Chúng tổng hợp nhiều nguồn:

| Dashboard | Dữ liệu chính |
|---|---|
| Student dashboard | lớp đang học, lịch, tiến độ, bài tập, điểm, thông báo, gợi ý học tiếp. |
| Teacher dashboard | lớp phụ trách, danh sách học sinh, bài nộp, chuyên cần, cảnh báo, phân tích lớp. |
| Parent dashboard | danh sách con, lịch, điểm danh, điểm, feedback, học phí, thông báo. |
| Admin dashboard | tổng user, lớp, lịch hôm nay, điểm danh toàn hệ thống, doanh thu, behavior analytics. |

## 10. AI và can thiệp sớm

### 10.1. Tư duy thiết kế

AI trong hệ thống là lớp hỗ trợ quyết định, không phải lớp ra quyết định cuối cùng. AI không dùng để kết luận học sinh "kém" hoặc "gian lận". Nó dùng để tạo tín hiệu sớm, giúp giáo viên và phụ huynh có thêm dữ liệu trước khi vấn đề trở nên nghiêm trọng.

Nguyên tắc:

1. AI gợi ý, giáo viên quyết định.
2. Cảnh báo là cảnh báo mềm, không phải phán quyết.
3. Phụ huynh nhận thông tin theo ngôn ngữ hỗ trợ, không gây hoang mang.
4. Học sinh nhận feedback cải thiện, không nhận nhãn rủi ro thô.
5. Dữ liệu hành vi cần được giải thích trong bối cảnh học tập.

### 10.2. Tín hiệu đầu vào của can thiệp sớm

| Nhóm tín hiệu | Dữ liệu lấy từ | Cách hiểu |
|---|---|---|
| Tiến độ | `student_progress`, `course_items` | Học sinh học chậm, bỏ qua nội dung, chưa hoàn thành lộ trình. |
| Điểm số | `exam_submissions`, `homework_submissions`, `quiz_attempts` | Điểm giảm, biến động mạnh, sai tập trung vào nhóm kiến thức. |
| Chuyên cần | `attendance_records`, `absence_requests`, `attendance_points` | Nghỉ nhiều, đi trễ, vắng không phép, mất streak học tập. |
| Hành vi phiên học | `student_activity_logs`, `user_page_sessions` | Thời gian học thấp, idle cao, đổi tab, trả lời quá nhanh. |
| Tương tác | `notifications`, `announcement_reads`, `discussion_messages` | Ít đọc thông báo, ít trao đổi, phụ huynh ít tương tác. |
| Tài chính/dịch vụ | `invoices`, `payments`, `user_feedback` | Không trực tiếp đánh giá học lực, nhưng giúp admin nhìn rủi ro dịch vụ/giữ chân. |

### 10.3. Pipeline can thiệp sớm bằng mô tả chữ

Student học/làm bài/điểm danh -> hệ thống lưu dữ liệu thô -> hệ thống tổng hợp tín hiệu -> AI hoặc heuristic phân tích -> tạo score/analysis/alert -> Teacher/Admin/Parent nhận thông tin phù hợp -> con người can thiệp -> Student thay đổi hành vi -> dữ liệu mới quay lại pipeline.

### 10.4. AI hỗ trợ giáo viên

| Năng lực | Code/API | Kết quả |
|---|---|---|
| Sinh câu hỏi/quiz | `/api/ai/generate-questions`, `/api/ai/generate-quiz`, `lib/gemini.ts` | Giáo viên tạo đề nhanh hơn, vẫn có quyền chỉnh sửa. |
| Phân tích lớp | `/api/ai/analyze-quiz-class` | Tóm tắt điểm mạnh, điểm yếu, knowledge gaps, gợi ý dạy lại. |
| Phân tích cá nhân | `/api/ai/analyze-quiz-individual` | Tạo feedback cá nhân, nhiệm vụ cải thiện hoặc gợi ý nâng cao. |
| Tạo bài bổ trợ | `/api/ai/generate-supplementary-quiz` | Tạo câu hỏi bổ sung theo kiến thức hổng. |
| Phân tích hành vi | `/api/ai/behavior-analysis`, `behavior-analysis.ts` | Gaming score, risk level, behavior alert, recommendation cho giáo viên. |

### 10.5. AI hỗ trợ học sinh

Học sinh nhận được AI ở dạng phản hồi học tập:

| Tình huống | Phản hồi cho học sinh |
|---|---|
| Làm bài tốt | Nhận xét tích cực, gợi ý chủ đề nâng cao, nhắc nhẹ câu sai nếu có. |
| Cần cải thiện | Nhận xét động viên, knowledge gaps, lý thuyết ngắn, mini quiz, deadline cải thiện. |
| Chưa hoàn thành | Thông báo nhắc nhiệm vụ, gợi ý bài cần làm tiếp. |

Điểm quan trọng là hệ thống không chỉ báo điểm. Nó biến điểm thành "việc cần làm tiếp theo".

### 10.6. AI hỗ trợ phụ huynh và admin

Phụ huynh nhận thông báo về kết quả, nhận xét và bài cải thiện của con. Admin nhìn dữ liệu tổng hợp: lớp nào có tỷ lệ chuyên cần thấp, nhóm học sinh nào có behavior alerts, phản hồi nào chưa xử lý, học phí nào quá hạn.

Admin không cần đọc từng bài làm của học sinh. Admin cần nhìn xu hướng để điều phối giáo viên, lớp, lịch và chăm sóc dịch vụ.

## 11. Luồng nghiệp vụ kỹ thuật quan trọng

### 11.1. Luồng học và làm bài

1. Admin/Teacher tạo lớp và nội dung.
2. Student vào lớp, mở cây bài học.
3. Student đọc/xem/làm quiz, hệ thống ghi `student_progress` và activity log.
4. Student làm exam/homework, hệ thống lưu submission.
5. Teacher chấm hoặc hệ thống tự chấm phần có đáp án.
6. AI phân tích lớp/cá nhân.
7. Teacher duyệt feedback.
8. Student/Parent nhận thông báo.
9. Student làm bài cải thiện.

### 11.2. Luồng điểm danh và xin nghỉ

1. Parent có thể tạo `absence_requests` trước buổi học.
2. Teacher vào lớp và mở phiên điểm danh.
3. Hệ thống tải danh sách học sinh đang enrolled.
4. Teacher lưu trạng thái present/absent/late/excused.
5. Hệ thống cập nhật `attendance_records`, điểm chuyên cần và notifications.
6. Admin nhìn tổng quan hôm nay, Parent xem chuyên cần của con, Student xem lịch sử cá nhân.

### 11.3. Luồng thông báo

1. Admin/Teacher/System tạo thông báo hoặc announcement.
2. Hệ thống xác định target theo role, lớp, học sinh hoặc phụ huynh liên kết.
3. Dữ liệu lưu vào `notifications` hoặc `announcements`.
4. `useRealtimeSync` subscribe thay đổi ở `notifications`, `announcements`, `attendance_records` và các bảng quan trọng.
5. UI invalidate cache hoặc cập nhật notification store.
6. Người nhận đọc và trạng thái có thể được ghi vào `announcement_reads` hoặc `is_read`.

### 11.4. Luồng học phí

1. Admin tạo fee plan hoặc invoice.
2. Parent xem invoice trên cổng phụ huynh.
3. Parent chọn thanh toán qua Stripe/VNPay hoặc xác nhận chuyển khoản.
4. Payment API tạo payment record và redirect/intent.
5. Gateway trả webhook/IPN.
6. Hệ thống xác thực chữ ký, cập nhật `payments` và `invoices`.
7. Parent/Admin nhận trạng thái mới.

## 12. Bảo mật và kiểm soát dữ liệu

Hệ thống có nhiều lớp bảo vệ:

| Lớp bảo vệ | Thành phần | Ý nghĩa |
|---|---|---|
| Xác thực | Supabase Auth | Xác định user hiện tại ở server và client. |
| Điều hướng theo role | `proxy.ts` | User chỉ vào đúng dashboard theo role. |
| Server-side access | Server Actions/API Routes | Logic nhạy cảm chạy trên server, không expose service role. |
| Admin client | `createAdminClient` | Chỉ dùng phía server cho tác vụ cần bypass RLS như tạo user, phân tích tổng hợp. |
| Database RLS | Supabase policies | Giới hạn dữ liệu theo admin/teacher/student/parent. |
| Quan hệ phụ huynh | `parent_students` | Parent chỉ xem con đã liên kết. |
| Theo dõi trạng thái | read status, logs, payments status | Có truy vết nghiệp vụ khi cần kiểm tra. |

Về đạo đức dữ liệu, cần giữ nguyên nguyên tắc trong `KnowledgeBehavior.md`: AI không đưa phán quyết cuối cùng, risk score không nên hiển thị thô cho học sinh/phụ huynh, cảnh báo cần đi kèm bối cảnh và quyền quyết định thuộc về giáo viên/quản trị viên.

## 13. Đánh giá hiện trạng codebase

| Hạng mục | Nhận xét |
|---|---|
| Độ bao phủ nghiệp vụ | Rộng, đã có đầy đủ admin, teacher, student, parent, AI, payment, attendance, survey, feedback. |
| Tổ chức route | Rõ theo role trong `app/(dashboard)/admin`, `teacher`, `student`, `parent`. |
| Tổ chức nghiệp vụ | `lib/actions` chia theo domain, dễ map sang phân hệ. |
| Dữ liệu | Supabase migrations thể hiện nhiều miền dữ liệu, đủ nền cho phân tích học tập và vận hành. |
| AI | Có cả tạo nội dung, phân tích quiz, feedback cá nhân, bài bổ trợ, behavior analysis. |
| Can thiệp sớm | Có nền tảng telemetry, behavior score, alert và notification. |
| Realtime | Có provider/hook trung tâm, đang subscribe các bảng quan trọng. |
| Thanh toán | Có Stripe/VNPay, invoice/payment APIs và webhook/IPN. |
| Điểm cần lưu ý | Một số tài liệu là feature spec/prompt, cần phân biệt với code đã triển khai; một số schema cũ và schema mới cùng tồn tại. |

## 14. Kết luận

Hệ thống LMS EdTech này là một nền tảng vận hành trung tâm tiếng Anh theo hướng dữ liệu. Nó bao phủ chuỗi nghiệp vụ từ quản trị lớp học, tổ chức lịch, học liệu, bài tập, điểm danh, phụ huynh, thông báo, phản hồi, học phí đến phân tích AI.

Giá trị business nằm ở việc giảm thủ công, tăng minh bạch với phụ huynh, hỗ trợ thu học phí, tăng kiểm soát vận hành và tạo dashboard ra quyết định. Giá trị kỹ thuật nằm ở kiến trúc Next.js + Supabase có phân quyền, server actions theo domain, realtime sync, payment integration và AI integration. Giá trị giáo dục nằm ở việc biến dữ liệu học tập thành vòng lặp hỗ trợ: ghi nhận -> phân tích -> phản hồi -> can thiệp -> cải thiện.

Trọng tâm nổi bật nhất là luồng dữ liệu người học. Học sinh không chỉ là người dùng cuối mà là trung tâm của dữ liệu: hồ sơ, lớp học, tiến độ, điểm số, chuyên cần, hành vi, feedback và bài cải thiện đều quay quanh mục tiêu phát hiện sớm khó khăn và hỗ trợ đúng thời điểm. Đây là nền tảng tốt để phát triển tiếp các mô hình adaptive learning, knowledge tracing và recommendation trong tương lai.
