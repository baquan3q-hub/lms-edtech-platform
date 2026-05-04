# UML Knowledge Reference

Tài liệu này lưu lại kiến thức nền về UML để sử dụng làm tham chiếu khi thiết kế, phân tích hoặc viết tài liệu kỹ thuật cho hệ thống LMS EdTech Platform.

Khi có yêu cầu liên quan đến UML, mô hình kỹ thuật, mô hình dữ liệu, mô hình quy trình, Use Case, Class Diagram, Sequence Diagram hoặc Activity Diagram, cần đọc lại tài liệu này trước để chọn đúng loại sơ đồ và trình bày đúng mục tiêu.

## 1. UML Là Gì?

UML là viết tắt của **Unified Modeling Language**. Đây là một ngôn ngữ mô hình hóa dùng để mô tả, phân tích, thiết kế và tài liệu hóa hệ thống phần mềm bằng các sơ đồ trực quan.

Nói đơn giản, UML giúp biến ý tưởng hệ thống thành các sơ đồ dễ hiểu để lập trình viên, tester, BA, PM, giảng viên, khách hàng và các bên liên quan có thể trao đổi với nhau trên cùng một cách hiểu.

## 2. UML Dùng Để Làm Gì?

UML thường được dùng để:

- Mô tả chức năng của hệ thống.
- Mô tả cấu trúc dữ liệu, class và object.
- Mô tả luồng xử lý nghiệp vụ.
- Mô tả tương tác giữa người dùng, hệ thống và các module.
- Hỗ trợ thiết kế trước khi lập trình.
- Làm tài liệu kỹ thuật cho dự án.

Ví dụ với một hệ thống bán hàng online, UML có thể mô tả người dùng đăng nhập, đặt hàng, thanh toán, quản lý sản phẩm và xử lý đơn hàng. Với hệ thống LMS, UML có thể mô tả học sinh học bài, giáo viên giao bài, phụ huynh theo dõi con, admin quản lý lớp và AI phân tích học tập.

## 3. Các Loại Sơ Đồ UML Phổ Biến

| Loại sơ đồ | Mục đích | Thành phần chính | Khi nào dùng |
|---|---|---|---|
| Use Case Diagram | Mô tả ai sử dụng hệ thống và họ làm được gì | Actor, use case, relationship | Khi cần mô tả chức năng tổng quan theo vai trò người dùng |
| Class Diagram | Mô tả cấu trúc hệ thống theo hướng đối tượng | Class, attribute, method, relationship | Khi cần mô tả class, object, dữ liệu chính và quan hệ |
| Sequence Diagram | Mô tả thứ tự tương tác giữa các đối tượng theo thời gian | Actor/object, lifeline, message, return message, activation bar | Khi cần mô tả một luồng xử lý cụ thể như đăng nhập, thanh toán, nộp bài |
| Activity Diagram | Mô tả quy trình nghiệp vụ hoặc luồng xử lý | Start node, action, decision, fork/join, end node | Khi cần mô tả quy trình nhiều bước, có rẽ nhánh |
| State Diagram | Mô tả trạng thái của một đối tượng và sự chuyển đổi trạng thái | State, transition, event | Khi cần mô tả vòng đời của một đối tượng như đơn hàng, hóa đơn, bài nộp |

## 4. Cách Chọn Đúng Loại UML

Trước khi vẽ UML, cần xác định mục tiêu của sơ đồ:

| Mục tiêu | Loại sơ đồ nên dùng |
|---|---|
| Mô tả chức năng hệ thống | Use Case Diagram |
| Mô tả actor và quyền thao tác | Use Case Diagram |
| Mô tả dữ liệu, class hoặc thực thể chính | Class Diagram hoặc ERD rút gọn |
| Mô tả luồng xử lý nghiệp vụ | Activity Diagram |
| Mô tả tương tác theo thời gian giữa các module | Sequence Diagram |
| Mô tả vòng đời/trạng thái của một đối tượng | State Diagram |
| Mô tả hệ thống ở mức dễ hiểu cho báo cáo | Flowchart/Activity Diagram đơn giản |

Nguyên tắc quan trọng: không cố nhồi mọi thông tin vào một sơ đồ. Mỗi sơ đồ chỉ nên phục vụ một góc nhìn chính.

## 5. Thông Tin Cần Có Trước Khi Vẽ UML

Trước khi thiết kế UML, cần thu thập:

- Hệ thống làm gì?
- Người dùng hoặc hệ thống bên ngoài là ai?
- Mỗi người dùng có chức năng nào?
- Dữ liệu chính gồm những gì?
- Quy trình nghiệp vụ diễn ra như thế nào?
- Có ràng buộc, điều kiện hoặc phân quyền nào không?
- Có hệ thống bên ngoài nào tích hợp không?

Ví dụ với hệ thống thư viện:

- Độc giả mượn sách.
- Thủ thư quản lý sách.
- Hệ thống kiểm tra sách còn hay hết.
- Độc giả trả sách.
- Hệ thống tính phí phạt nếu quá hạn.

## 6. Xác Định Actor

Actor là người hoặc hệ thống bên ngoài tương tác với hệ thống chính. Actor không nhất thiết là người, có thể là một hệ thống khác.

Ví dụ actor phổ biến:

- Khách hàng.
- Admin.
- Nhân viên.
- Hệ thống thanh toán.
- Hệ thống gửi email.
- API bên ngoài.

Trong hệ thống LMS hiện tại, actor chính gồm:

- Admin.
- Teacher.
- Student.
- Parent.
- AI/System.
- Payment Gateway như Stripe hoặc VNPay.
- Supabase Auth/Realtime trong một số sơ đồ kỹ thuật.

## 7. Xác Định Chức Năng Chính

Sau khi có actor, cần liệt kê chức năng chính của hệ thống. Phần này thường dùng để vẽ Use Case Diagram.

Ví dụ hệ thống bán hàng:

- Đăng ký.
- Đăng nhập.
- Xem sản phẩm.
- Thêm vào giỏ hàng.
- Đặt hàng.
- Thanh toán.
- Quản lý sản phẩm.
- Quản lý đơn hàng.
- Thống kê doanh thu.

Ví dụ hệ thống LMS:

- Đăng nhập theo vai trò.
- Quản lý người dùng.
- Quản lý khóa học và lớp học.
- Xếp lịch học và buổi học.
- Xây dựng học liệu.
- Giao bài tập, bài kiểm tra.
- Nộp bài và chấm điểm.
- Điểm danh và xin nghỉ.
- Phụ huynh theo dõi con.
- Thanh toán học phí.
- AI phân tích học tập và hỗ trợ can thiệp sớm.

## 8. Xác Định Dữ Liệu Và Đối Tượng Chính

Khi vẽ Class Diagram hoặc mô hình dữ liệu, cần xác định các thực thể/lớp quan trọng.

Ví dụ hệ thống bán hàng:

- User.
- Product.
- Order.
- OrderDetail.
- Cart.
- Payment.
- Category.

Sau đó cần xác định:

- Mỗi class có thuộc tính gì?
- Mỗi class có hành vi gì?
- Các class liên kết với nhau như thế nào?

Trong hệ thống LMS, các thực thể tiêu biểu gồm:

- User.
- Profile.
- ParentStudent.
- Course.
- Class.
- Enrollment.
- ClassSchedule.
- ClassSession.
- CourseItem.
- StudentProgress.
- Exam.
- ExamSubmission.
- Homework.
- HomeworkSubmission.
- AttendanceRecord.
- Notification.
- Invoice.
- Payment.
- QuizClassAnalysis.
- QuizIndividualAnalysis.
- BehaviorAlert.

Lưu ý: không biến database table thành Class Diagram một cách máy móc nếu mục tiêu là thiết kế hướng đối tượng. Nếu mục tiêu là báo cáo dễ hiểu, nên gom bảng thành nhóm miền dữ liệu.

## 9. Xác Định Luồng Xử Lý

Với mỗi chức năng quan trọng, cần mô tả quy trình xử lý. Phần này có thể dùng Activity Diagram hoặc Sequence Diagram.

Ví dụ luồng đặt hàng:

1. Người dùng chọn sản phẩm.
2. Thêm sản phẩm vào giỏ hàng.
3. Kiểm tra tồn kho.
4. Nhập địa chỉ giao hàng.
5. Chọn phương thức thanh toán.
6. Tạo đơn hàng.
7. Thanh toán.
8. Gửi thông báo xác nhận.

Ví dụ luồng LMS:

1. Học sinh đăng nhập.
2. Vào lớp học đã ghi danh.
3. Mở nội dung học tập.
4. Hệ thống ghi nhận tiến độ.
5. Học sinh làm bài kiểm tra hoặc nộp bài.
6. Hệ thống lưu điểm và bài nộp.
7. AI/hệ thống phân tích kết quả.
8. Giáo viên xem báo cáo và phản hồi.
9. Phụ huynh nhận thông báo khi cần.
10. Học sinh điều chỉnh cách học.

## 10. Xác Định Quan Hệ Giữa Các Thành Phần

Tùy loại sơ đồ, quan hệ có thể khác nhau.

### Use Case Diagram

- Association: actor tham gia use case.
- Include: use case luôn bao gồm một use case khác.
- Extend: use case mở rộng trong điều kiện nhất định.
- Generalization: actor hoặc use case kế thừa/mở rộng actor/use case khác.

### Class Diagram

- Association: quan hệ liên kết thông thường.
- Aggregation: quan hệ toàn thể - bộ phận nhưng bộ phận có thể tồn tại độc lập.
- Composition: quan hệ toàn thể - bộ phận chặt chẽ, bộ phận phụ thuộc vòng đời vào toàn thể.
- Inheritance: kế thừa.
- Dependency: phụ thuộc tạm thời hoặc sử dụng.

Ví dụ:

- Một `Order` có nhiều `OrderDetail`.
- Một `User` có nhiều `Order`.
- Một `Product` thuộc một `Category`.
- `Admin` có thể kế thừa từ `User`.

Trong LMS:

- Một `Course` có nhiều `Class`.
- Một `Class` có nhiều `Enrollment`.
- Một `Student` có nhiều `StudentProgress`.
- Một `Parent` liên kết với nhiều `Student` qua `parent_students`.
- Một `Exam` có nhiều `ExamSubmission`.
- Một `Invoice` có nhiều `Payment` hoặc một trạng thái thanh toán.

## 11. Công Cụ Vẽ UML

Một số công cụ phổ biến:

- Draw.io / diagrams.net.
- StarUML.
- Visual Paradigm.
- Lucidchart.
- PlantUML.
- Enterprise Architect.
- Figma / FigJam.
- Mermaid.

Với dự án hiện tại, ưu tiên dùng **Mermaid Markdown** khi cần lưu trong repo và đưa vào tài liệu Markdown. Nếu cần sơ đồ đẹp để nộp báo cáo hoặc slide, có thể chuyển Mermaid sang Draw.io/Figma sau.

## 12. Nguyên Tắc Khi Vẽ UML

Khi thiết kế UML, cần chú ý:

- Vẽ đúng mục đích, không cố đưa quá nhiều thứ vào một sơ đồ.
- Đặt tên rõ ràng, dễ hiểu.
- Dùng đúng ký hiệu UML hoặc ghi rõ nếu dùng flowchart thay cho UML formal.
- Không vẽ quá rối.
- Mỗi sơ đồ nên tập trung vào một góc nhìn.
- Luồng xử lý nên đi từ trái sang phải hoặc từ trên xuống dưới.
- Kiểm tra lại với yêu cầu hệ thống.
- Không nhầm giữa actor và class.
- Không biến database table thành class diagram máy móc nếu mục tiêu không phải thiết kế object.

## 13. Quy Trình Thiết Kế UML Cơ Bản

Một quy trình đơn giản:

1. Phân tích yêu cầu hệ thống.
2. Xác định actor và chức năng chính.
3. Vẽ Use Case Diagram.
4. Mô tả chi tiết từng use case.
5. Xác định class, thuộc tính, phương thức.
6. Vẽ Class Diagram.
7. Vẽ Sequence Diagram cho các chức năng quan trọng.
8. Vẽ Activity Diagram cho các quy trình phức tạp.
9. Kiểm tra lại tính logic giữa các sơ đồ.
10. Cập nhật UML khi yêu cầu thay đổi.

Với người mới học, nên đi theo thứ tự:

1. Use Case Diagram.
2. Class Diagram.
3. Sequence Diagram.
4. Activity Diagram.

## 14. Ví Dụ Ngắn: Hệ Thống Quản Lý Bán Hàng

### Actor

- Khách hàng.
- Admin.
- Nhân viên giao hàng.
- Cổng thanh toán.

### Use Case

- Đăng ký.
- Đăng nhập.
- Xem sản phẩm.
- Đặt hàng.
- Thanh toán.
- Quản lý sản phẩm.
- Quản lý đơn hàng.
- Cập nhật trạng thái giao hàng.

### Class Chính

- Customer.
- Admin.
- Product.
- Category.
- Cart.
- Order.
- OrderDetail.
- Payment.
- Shipment.

### Luồng Nên Vẽ Sequence Diagram

- Đăng nhập.
- Đặt hàng.
- Thanh toán.
- Hủy đơn hàng.

## 15. Cách Áp Dụng Cho Các Yêu Cầu Trong Dự Án LMS

Khi người dùng yêu cầu “mô hình kỹ thuật”, cần xác định rõ họ muốn:

- Kiến trúc hệ thống: dùng flowchart/component diagram.
- Mô hình dữ liệu: dùng ERD rút gọn hoặc class diagram.
- Luồng nghiệp vụ: dùng activity diagram/flowchart.
- Use case: dùng use case diagram theo actor.
- Luồng tương tác theo thời gian: dùng sequence diagram.

Khi người dùng yêu cầu “mô hình quy trình”, ưu tiên:

- Activity Diagram hoặc flowchart.
- Trình bày dữ liệu/hoạt động đi qua các bước.
- Nêu rõ actor nào tham gia ở từng giai đoạn.
- Nếu phục vụ báo cáo, tránh quá nhiều chi tiết code.

Khi người dùng yêu cầu “mô hình dữ liệu đơn giản”, ưu tiên:

- Gom bảng thành các nhóm miền dữ liệu.
- Chỉ liệt kê bảng tiêu biểu.
- Nêu ý nghĩa nghiệp vụ thay vì đầy đủ khóa chính/khóa ngoại.

Khi người dùng yêu cầu “can thiệp sớm học sinh”, ưu tiên:

- Mô tả vòng lặp dữ liệu: hoạt động học tập → ghi nhận → phân tích → phản hồi → hỗ trợ → hành vi mới.
- Dùng ngôn ngữ hỗ trợ giáo dục, tránh diễn đạt mang tính kết luận tiêu cực.
- Nhấn mạnh AI là lớp hỗ trợ phân tích, không thay thế giáo viên.

## 16. Tóm Tắt

UML là công cụ giúp mô hình hóa hệ thống phần mềm bằng sơ đồ. Khi vẽ UML, cần có:

- Yêu cầu hệ thống.
- Actor.
- Chức năng chính.
- Dữ liệu/class chính.
- Luồng xử lý.
- Quan hệ giữa các thành phần.
- Loại sơ đồ phù hợp.
- Công cụ vẽ UML.
- Quy tắc đặt tên và trình bày rõ ràng.

Mục tiêu quan trọng nhất của UML không phải là vẽ thật nhiều ký hiệu, mà là giúp người đọc hiểu đúng hệ thống, đúng chức năng, đúng dữ liệu và đúng quy trình.
