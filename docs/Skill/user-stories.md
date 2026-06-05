# User Stories — Hệ thống LMS cho Trung tâm Tiếng Anh

> **Đề tài:** Nghiên cứu mô hình học tập số và xây dựng hệ thống LMS cho trung tâm tiếng Anh theo hướng cá nhân hóa và can thiệp sớm  
> **Nhóm:** Bùi Anh Quân (24010853) · Lê Ngọc Đạt (24010369)  
> **Lớp:** EDT4006 1 — Trường Đại học Giáo dục — Khoa Công nghệ Giáo dục

---

## Mục lục

1. [Vai trò Admin (Quản trị viên)](#1-vai-trò-admin-quản-trị-viên)
2. [Vai trò Teacher (Giáo viên)](#2-vai-trò-teacher-giáo-viên)
3. [Vai trò Student (Học sinh)](#3-vai-trò-student-học-sinh)
4. [Vai trò Parent (Phụ huynh)](#4-vai-trò-parent-phụ-huynh)
5. [AI / System (Hệ thống tự động)](#5-ai--system-hệ-thống-tự-động)

---

## 1. Vai trò Admin (Quản trị viên)

Admin là người quản lý toàn bộ hệ thống, có quyền truy cập cao nhất. Mục tiêu chính: vận hành trung tâm hiệu quả, ra quyết định dựa trên dữ liệu.

### Epic: Quản lý người dùng & phân quyền

| ID | User Story | Acceptance Criteria |
|---|---|---|
| AD-01 | As an **Admin**, I want to **create user accounts with specific roles** so that **each person can access the right portal** | Account created with correct role (admin/teacher/student/parent); user can login and see role-specific dashboard |
| AD-02 | As an **Admin**, I want to **view and search all users** so that **I can manage the user base efficiently** | Search by name/email/role; results display in paginated table |
| AD-03 | As an **Admin**, I want to **edit user profiles and reset passwords** so that **I can help users who have issues** | Profile updated successfully; password reset email sent |
| AD-04 | As an **Admin**, I want to **link parents to students** so that **parents can view their children's data** | Parent-student relationship created; parent sees child in dashboard |

### Epic: Quản lý học vụ & lớp học

| ID | User Story | Acceptance Criteria |
|---|---|---|
| AD-05 | As an **Admin**, I want to **create courses and classes** so that **the curriculum is organized** | Course and class created; teacher assigned; appears in course list |
| AD-06 | As an **Admin**, I want to **enroll students into classes** so that **they can access class content** | Student appears in class roster; can see lesson tree |
| AD-07 | As an **Admin**, I want to **manage rooms and schedules** so that **classes have proper time/space allocation** | Room assigned; schedule visible to teacher, student, parent |
| AD-08 | As an **Admin**, I want to **view class status and student counts** so that **I can monitor capacity** | Active/completed/cancelled status shown; counts accurate |

### Epic: Tài chính & học phí

| ID | User Story | Acceptance Criteria |
|---|---|---|
| AD-09 | As an **Admin**, I want to **create fee plans for classes** so that **tuition is systematized** | Fee plan created with amount, due date; linked to class |
| AD-10 | As an **Admin**, I want to **generate invoices for students** so that **billing is automated** | Invoices generated with unique number; visible to parent |
| AD-11 | As an **Admin**, I want to **track payment status** so that **I can follow up on overdue accounts** | Dashboard shows paid/unpaid/overdue counts; filter by status |

### Epic: Thông báo & khảo sát

| ID | User Story | Acceptance Criteria |
|---|---|---|
| AD-12 | As an **Admin**, I want to **send system-wide announcements** so that **all users receive important information** | Announcement delivered to targeted groups; read status tracked |
| AD-13 | As an **Admin**, I want to **create and manage surveys** so that **I can collect feedback from stakeholders** | Survey created; responses collected; analytics available |
| AD-14 | As an **Admin**, I want to **view feedback from parents** so that **issues can be addressed promptly** | Feedback list with status (pending/reviewed/resolved) |

### Epic: Dashboard & Analytics

| ID | User Story | Acceptance Criteria |
|---|---|---|
| AD-15 | As an **Admin**, I want to **see an overview dashboard** so that **I can monitor the entire center at a glance** | Dashboard shows: total users, active classes, today's sessions, revenue |
| AD-16 | As an **Admin**, I want to **view attendance analytics** so that **I can identify attendance trends** | Charts showing attendance rates by class, time period |
| AD-17 | As an **Admin**, I want to **monitor student behavior alerts** so that **I can support early intervention** | Alert list with severity levels; filter by class/student |

---

## 2. Vai trò Teacher (Giáo viên)

Teacher vận hành lớp học hàng ngày: dạy, điểm danh, tạo đề, chấm bài, phản hồi. Mục tiêu: giảm tải hành chính, tăng thời gian cho chuyên môn sư phạm.

### Epic: Quản lý học liệu số

| ID | User Story | Acceptance Criteria |
|---|---|---|
| TC-01 | As a **Teacher**, I want to **create a lesson tree with folders and items** so that **content is organized by structure** | Tree renders correctly with drag-drop ordering; nested folders work |
| TC-02 | As a **Teacher**, I want to **add videos, documents, and audio to lessons** so that **students have diverse learning materials** | Content uploaded; student can view/play media |
| TC-03 | As a **Teacher**, I want to **set prerequisite relationships between items** so that **students follow a mastery-based path** | Locked items show unlock condition; unlocked after prerequisite completed |
| TC-04 | As a **Teacher**, I want to **publish/unpublish lesson items** so that **I control what students see** | Unpublished items hidden from student view; visible in teacher editor |

### Epic: Đánh giá & kiểm tra

| ID | User Story | Acceptance Criteria |
|---|---|---|
| TC-05 | As a **Teacher**, I want to **create quizzes with multiple choice questions** so that **students can self-assess** | Quiz created with questions, options, correct answers, points |
| TC-06 | As a **Teacher**, I want to **create homework assignments with deadlines** so that **students practice regularly** | Homework visible to students; deadline enforced; late submissions marked |
| TC-07 | As a **Teacher**, I want to **create exams with time limits** so that **formal evaluation is possible** | Exam starts/ends on time; auto-submit when time expires |
| TC-08 | As a **Teacher**, I want to **use AI to generate quiz questions** so that **content creation is faster** | AI generates relevant questions from lesson content; teacher can edit |
| TC-09 | As a **Teacher**, I want to **view class-level and individual analytics** so that **I can identify knowledge gaps** | Charts showing score distribution, completion rates, trends |

### Epic: Điểm danh & chuyên cần

| ID | User Story | Acceptance Criteria |
|---|---|---|
| TC-10 | As a **Teacher**, I want to **open an attendance session for a class** so that **I can record who's present** | Session created for today; student list loaded |
| TC-11 | As a **Teacher**, I want to **mark students as present/absent/late/excused** so that **records are accurate** | Status saved per student; totals updated |
| TC-12 | As a **Teacher**, I want to **review and approve absence requests** so that **parent requests are handled** | Request list with approve/reject actions; notification sent back |
| TC-13 | As a **Teacher**, I want to **view attendance history for a class** so that **I can spot patterns** | Calendar view or table with filter by date range |

### Epic: Phản hồi & giao tiếp

| ID | User Story | Acceptance Criteria |
|---|---|---|
| TC-14 | As a **Teacher**, I want to **send class announcements** so that **students and parents stay informed** | Announcement delivered; read status tracked |
| TC-15 | As a **Teacher**, I want to **view student progress across the lesson tree** so that **I know who's falling behind** | Progress bars per student; completion percentage |
| TC-16 | As a **Teacher**, I want to **provide feedback on student submissions** so that **students can improve** | Feedback text saved; student notified |

---

## 3. Vai trò Student (Học sinh)

Student là chủ thể học tập. Mục tiêu: có lộ trình học rõ ràng, phản hồi nhanh, động lực học tập được duy trì.

### Epic: Học tập theo lộ trình

| ID | User Story | Acceptance Criteria |
|---|---|---|
| ST-01 | As a **Student**, I want to **see my enrolled classes** so that **I can access all my courses** | Class list shows name, teacher, schedule; click to enter |
| ST-02 | As a **Student**, I want to **navigate the lesson tree** so that **I learn content in the right order** | Tree displays with folders, items; locked items shown with lock icon |
| ST-03 | As a **Student**, I want to **view videos, documents, and text content** so that **I can study at my pace** | Content renders correctly; progress tracked when opened |
| ST-04 | As a **Student**, I want to **see my completion progress** so that **I know how far I am** | Progress bar per course; completed items marked with checkmark |

### Epic: Đánh giá & nộp bài

| ID | User Story | Acceptance Criteria |
|---|---|---|
| ST-05 | As a **Student**, I want to **take quizzes** so that **I can test my knowledge** | Quiz starts; answers submitted; score shown immediately |
| ST-06 | As a **Student**, I want to **submit homework** so that **I complete assignments on time** | File/text submitted; timestamp recorded; late indicator if past deadline |
| ST-07 | As a **Student**, I want to **take exams** so that **I can be formally evaluated** | Exam timer shown; auto-submit on timeout; results after teacher review |
| ST-08 | As a **Student**, I want to **view my scores and feedback** so that **I can improve** | Score, teacher feedback, AI feedback all visible |

### Epic: Thông báo & tiến độ

| ID | User Story | Acceptance Criteria |
|---|---|---|
| ST-09 | As a **Student**, I want to **see my schedule** so that **I know when classes are** | Calendar or list view showing upcoming sessions |
| ST-10 | As a **Student**, I want to **receive notifications** so that **I don't miss deadlines or announcements** | Notification bell shows unread count; click to see list |
| ST-11 | As a **Student**, I want to **view my attendance record** so that **I track my own consistency** | Attendance history with present/absent/late counts |
| ST-12 | As a **Student**, I want to **see study suggestions** so that **I know what to focus on next** | Prioritized list of pending homework, upcoming exams, unfinished lessons |

---

## 4. Vai trò Parent (Phụ huynh)

Parent đồng hành với quá trình học của con. Mục tiêu: minh bạch thông tin, can thiệp sớm khi cần, giao tiếp thuận tiện với trung tâm.

### Epic: Liên kết & theo dõi con em

| ID | User Story | Acceptance Criteria |
|---|---|---|
| PR-01 | As a **Parent**, I want to **link to my child's account** so that **I can see their learning data** | Link established; child appears in parent dashboard |
| PR-02 | As a **Parent**, I want to **see a dashboard overview of my child** so that **I know their current status** | Dashboard shows: classes, recent scores, attendance rate, upcoming schedule |
| PR-03 | As a **Parent**, I want to **view my child's attendance** so that **I know if they're attending regularly** | Attendance calendar showing present/absent/late per day |
| PR-04 | As a **Parent**, I want to **view my child's scores and progress** so that **I can track their improvement** | Score list by subject; progress percentage; trend chart |

### Epic: Giao tiếp với trung tâm

| ID | User Story | Acceptance Criteria |
|---|---|---|
| PR-05 | As a **Parent**, I want to **submit absence requests** so that **my child's absence is excused** | Request submitted; teacher notified; status visible (pending/approved/rejected) |
| PR-06 | As a **Parent**, I want to **send feedback to the center** so that **issues are addressed** | Feedback submitted with type (general/complaint/suggestion/praise) |
| PR-07 | As a **Parent**, I want to **read class announcements** so that **I stay informed about class activities** | Announcement list; read status tracked |
| PR-08 | As a **Parent**, I want to **receive notifications** so that **I'm alerted to important events** | Push/in-app notifications for grades, attendance issues, deadlines |

### Epic: Tài chính

| ID | User Story | Acceptance Criteria |
|---|---|---|
| PR-09 | As a **Parent**, I want to **view invoices** so that **I know how much and when to pay** | Invoice list with amount, due date, status |
| PR-10 | As a **Parent**, I want to **pay tuition online** so that **payment is convenient** | VNPay/Stripe payment flow; invoice status updated to "paid" |
| PR-11 | As a **Parent**, I want to **view payment history** so that **I have records of all transactions** | Transaction list with date, amount, provider, status |

### Epic: Khảo sát & phản hồi

| ID | User Story | Acceptance Criteria |
|---|---|---|
| PR-12 | As a **Parent**, I want to **participate in surveys** so that **my opinions contribute to improvement** | Survey questions displayed; responses submitted; thank you screen |
| PR-13 | As a **Parent**, I want to **view teacher feedback on my child** so that **I understand their performance** | Feedback from teacher visible; AI analysis summary available |

---

## 5. AI / System (Hệ thống tự động)

Lớp AI và hệ thống tự động hỗ trợ ra quyết định, không thay thế con người.

### Epic: AI hỗ trợ giáo viên

| ID | Story | Mô tả |
|---|---|---|
| AI-01 | Sinh câu hỏi quiz | AI phân tích nội dung bài giảng và sinh câu hỏi trắc nghiệm; giáo viên review trước khi sử dụng |
| AI-02 | Phân tích kết quả lớp | AI phân tích điểm số theo lớp, phát hiện câu hỏi khó, đề xuất nội dung cần ôn tập |
| AI-03 | Tạo nhận xét cá nhân | AI sinh nhận xét cá nhân hóa cho từng học sinh dựa trên điểm mạnh/yếu; giáo viên chỉnh sửa trước khi gửi |

### Epic: AI hỗ trợ học sinh

| ID | Story | Mô tả |
|---|---|---|
| AI-04 | Phản hồi sau bài kiểm tra | AI tạo bản phân tích kết quả cho học sinh: câu đúng/sai, kiến thức cần ôn |
| AI-05 | Gợi ý bài ôn tập | AI đề xuất bài ôn tập bổ sung dựa trên điểm yếu qua bài kiểm tra |

### Epic: Hệ thống tự động

| ID | Story | Mô tả |
|---|---|---|
| SY-01 | Realtime sync | Dữ liệu điểm danh, thông báo, progress được đồng bộ realtime qua Supabase Realtime |
| SY-02 | Sinh buổi học tự động | Từ class_schedules, hệ thống sinh class_sessions cho các buổi trong tương lai |
| SY-03 | Sinh hóa đơn tự động | Từ fee_plans, hệ thống tạo invoices cho từng học sinh enrolled |
| SY-04 | Đánh dấu hóa đơn quá hạn | Function tự động chuyển invoice status từ "unpaid" sang "overdue" |
| SY-05 | Ghi nhận hành vi | Client SDK ghi activity logs (lesson view, quiz answer, tab switch, idle) |
| SY-06 | Phân tích hành vi | Aggregation job tính behavior scores, gaming detection, risk level |
| SY-07 | Tạo cảnh báo | Khi behavior score vượt ngưỡng, tạo behavior_alert và thông báo teacher |

---

## Thống kê tổng hợp

| Vai trò | Số User Stories | Nhóm chức năng chính |
|---|---|---|
| **Admin** | 17 | Users, Classes, Finance, Surveys, Dashboard |
| **Teacher** | 16 | Lessons, Assessment, Attendance, Communication |
| **Student** | 12 | Learning, Assessment, Progress, Schedule |
| **Parent** | 13 | Tracking, Communication, Finance, Surveys |
| **AI/System** | 7 | Quiz generation, Analysis, Automation |
| **Tổng** | **65** | |

---

*Tài liệu này mô tả các user stories chính của hệ thống. Mỗi story được thiết kế để bám sát nhu cầu thực tế của trung tâm tiếng Anh và có thể mở rộng thêm khi hệ thống phát triển.*
