# Use Case Diagram Tổng Quan - LMS EdTech Platform

Tài liệu này mô tả các nhóm người dùng chính và các chức năng lớn của hệ thống LMS EdTech Platform dưới dạng Use Case Diagram tổng quan. Vì Mermaid chưa hỗ trợ trực tiếp ký hiệu UML Use Case chuẩn, sơ đồ dưới đây dùng `flowchart` để mô phỏng: actor được biểu diễn bằng nút tròn, use case được biểu diễn bằng nút bo góc, và phần `LMS EdTech Platform` đóng vai trò system boundary.

## 1. Use Case Diagram Tổng Quan

```mermaid
flowchart LR
    Admin((Admin))
    Teacher((Teacher))
    Student((Student))
    Parent((Parent))
    AISystem((AI/System))
    PaymentGateway((Payment Gateway))

    subgraph LMS["LMS EdTech Platform"]
        UCAuth(["Xác thực và điều hướng theo vai trò"])
        UCUser(["Quản lý người dùng và phân quyền"])
        UCAcademic(["Quản lý khóa học, lớp học, lịch học"])
        UCFinanceAdmin(["Quản lý học phí và hóa đơn"])
        UCDashboard(["Xem dashboard và báo cáo tổng quan"])

        UCClassOperate(["Vận hành lớp học"])
        UCContent(["Quản lý học liệu và lộ trình học"])
        UCAssessment(["Tạo bài tập, quiz, exam"])
        UCAttendance(["Điểm danh và duyệt đơn xin nghỉ"])
        UCFeedbackReport(["Chấm điểm, nhận xét, báo cáo học tập"])

        UCLearn(["Học theo lộ trình"])
        UCSubmit(["Làm bài kiểm tra và nộp bài"])
        UCViewProgress(["Xem điểm, tiến độ, chuyên cần"])
        UCStudyGoal(["Theo dõi mục tiêu và thói quen học tập"])

        UCFollowChild(["Theo dõi tình hình học tập của con"])
        UCAbsence(["Gửi đơn xin nghỉ"])
        UCPayment(["Xem và thanh toán học phí"])
        UCParentFeedback(["Gửi phản hồi và tham gia khảo sát"])
        UCNotifications(["Nhận và đọc thông báo"])

        UCAIGenerate(["AI sinh câu hỏi và quiz"])
        UCAIAnalyze(["AI phân tích kết quả học tập"])
        UCAIEarlyIntervention(["AI hỗ trợ can thiệp sớm"])
        UCRealtime(["Đồng bộ realtime và thông báo tự động"])
    end

    Admin --> UCAuth
    Admin --> UCUser
    Admin --> UCAcademic
    Admin --> UCFinanceAdmin
    Admin --> UCDashboard
    Admin --> UCNotifications

    Teacher --> UCAuth
    Teacher --> UCClassOperate
    Teacher --> UCContent
    Teacher --> UCAssessment
    Teacher --> UCAttendance
    Teacher --> UCFeedbackReport
    Teacher --> UCNotifications

    Student --> UCAuth
    Student --> UCLearn
    Student --> UCSubmit
    Student --> UCViewProgress
    Student --> UCStudyGoal
    Student --> UCNotifications

    Parent --> UCAuth
    Parent --> UCFollowChild
    Parent --> UCAbsence
    Parent --> UCPayment
    Parent --> UCParentFeedback
    Parent --> UCNotifications

    AISystem --> UCAIGenerate
    AISystem --> UCAIAnalyze
    AISystem --> UCAIEarlyIntervention
    AISystem --> UCRealtime

    PaymentGateway --> UCPayment

    UCAssessment -.->|include| UCAIGenerate
    UCFeedbackReport -.->|include| UCAIAnalyze
    UCAIAnalyze -.->|extend| UCAIEarlyIntervention
    UCAttendance -.->|include| UCNotifications
    UCAbsence -.->|include| UCNotifications
    UCPayment -.->|include| UCFinanceAdmin
```

## 2. Giải Thích Actor

| Actor | Vai trò trong hệ thống | Nhóm chức năng liên quan |
| --- | --- | --- |
| Admin | Quản trị toàn bộ hệ thống, dữ liệu học vụ và vận hành. | Người dùng, khóa học, lớp học, phòng học, lịch học, điểm danh, điểm số, tài chính, khảo sát, phản hồi, hành vi học tập. |
| Teacher | Tổ chức hoạt động dạy học và theo dõi quá trình học của học sinh. | Lớp học, học liệu, bài tập, bài kiểm tra, điểm danh, chấm điểm, báo cáo, cảnh báo hành vi học tập. |
| Student | Tham gia học tập, làm bài và theo dõi kết quả cá nhân. | Lớp học, lộ trình học, bài tập, bài kiểm tra, bài nộp, điểm số, tiến độ, lịch học. |
| Parent | Theo dõi quá trình học của con và phối hợp với nhà trường. | Tiến độ học tập, lịch học, điểm danh, đơn xin nghỉ, học phí, thông báo, phản hồi. |
| AI/System | Hỗ trợ tự động hóa, phân tích dữ liệu học tập và cảnh báo mềm. | Sinh câu hỏi, phân tích quiz/exam, phân tích hành vi học tập, thông báo realtime, hỗ trợ can thiệp sớm. |
| Payment Gateway | Hệ thống bên ngoài xử lý giao dịch thanh toán học phí. | Thanh toán qua Stripe/VNPay, cập nhật trạng thái hóa đơn và giao dịch. |

## 3. Giải Thích Use Case Chính

| Nhóm use case | Nội dung nghiệp vụ | Actor chính |
| --- | --- | --- |
| Xác thực và phân quyền | Người dùng đăng nhập, hệ thống xác định vai trò và điều hướng đến dashboard phù hợp. | Admin, Teacher, Student, Parent |
| Quản trị học vụ | Quản lý người dùng, khóa học, lớp học, phòng học, lịch học và dữ liệu tổng quan. | Admin |
| Vận hành lớp học | Giáo viên quản lý học liệu, bài tập, bài kiểm tra, điểm danh, nhận xét và báo cáo lớp. | Teacher |
| Học tập của học sinh | Học sinh học theo lộ trình, xem nội dung, làm bài, nộp bài, xem điểm và theo dõi tiến độ. | Student |
| Đồng hành của phụ huynh | Phụ huynh xem tình hình học tập của con, gửi đơn xin nghỉ, thanh toán học phí và phản hồi với hệ thống. | Parent |
| AI và phân tích học tập | Hệ thống sinh câu hỏi, phân tích kết quả, phát hiện dấu hiệu cần hỗ trợ và tạo cảnh báo mềm cho giáo viên/phụ huynh. | AI/System, Teacher, Parent |
| Thanh toán học phí | Phụ huynh xem hóa đơn, chọn phương thức thanh toán và hệ thống cập nhật trạng thái giao dịch qua cổng thanh toán. | Parent, Payment Gateway, Admin |
| Thông báo | Hệ thống gửi thông báo về lịch học, điểm danh, học phí, phản hồi, cảnh báo mềm và các thay đổi quan trọng. | Admin, Teacher, Student, Parent, AI/System |

## 4. Ghi Chú Khi Đưa Vào Báo Cáo

Use Case Diagram tổng quan cho thấy hệ thống LMS EdTech Platform được sử dụng bởi nhiều nhóm actor với mục tiêu khác nhau. Admin chịu trách nhiệm quản trị dữ liệu và vận hành toàn hệ thống; Teacher trực tiếp tổ chức lớp học, giao bài, kiểm tra và theo dõi kết quả; Student tương tác với hệ thống để học tập, làm bài và xem tiến độ; Parent theo dõi quá trình học của con, gửi xin nghỉ, thanh toán học phí và phản hồi; AI/System hỗ trợ sinh câu hỏi, phân tích dữ liệu học tập và đề xuất can thiệp sớm; Payment Gateway là hệ thống ngoài phục vụ xử lý thanh toán. Các quan hệ `include` và `extend` trong sơ đồ được dùng ở mức tổng quan để thể hiện một số chức năng có liên kết chặt chẽ, không đi sâu vào từng màn hình hoặc API chi tiết.
