# Rà soát bối cảnh và định hướng nâng cấp LMS cho trường phổ thông

**Ngày rà soát:** 24/09/2026.  
**Đối tượng hướng tới:** trường tiểu học, THCS và THPT, theo xác nhận của chủ dự án.  
**Mục đích:** làm tài liệu bối cảnh chung cho chủ sản phẩm, người phân tích nghiệp vụ, lập trình viên và AI khi tiếp tục phát triển hệ thống.

## 1. Nhận định chính

Codebase hiện có nền tảng chức năng khá rộng để phát triển tiếp thành LMS cho trường phổ thông: bốn cổng người dùng, tổ chức lớp, học liệu, bài tập, kiểm tra, điểm danh, thông báo, kết nối phụ huynh và phân tích học tập. Giá trị đáng kế thừa nhất là chu trình **giao việc học → thu nhận kết quả → phản hồi → hỗ trợ học sinh → theo dõi tiến bộ**.

Tuy nhiên, sản phẩm được hình thành từ bài toán **trung tâm tiếng Anh**, với cấu trúc chủ đạo `courses → classes → enrollments`. Để phục vụ nhà trường, cần bổ sung mô hình năm học, học kỳ, khối, lớp hành chính, môn học và phân công giảng dạy; đồng thời chuẩn hóa quyền truy cập, sổ đánh giá và vòng đời dữ liệu học sinh. Thay nhãn “trung tâm” thành “nhà trường” trên giao diện sẽ chưa giải quyết được sự khác biệt nghiệp vụ này.

**Định hướng đề xuất:** phát triển một LMS hỗ trợ dạy học kết hợp tại trường phổ thông, có học vụ tối thiểu, phối hợp gia đình và hỗ trợ sớm có giáo viên duyệt. Triển khai thí điểm ở một trường, một cấp học trước; mở rộng theo kết quả sử dụng thực tế. Đây là đề xuất trong tài liệu này, chưa phải kế hoạch triển khai đã được phê duyệt.

**Ưu tiên trước mắt:** khôi phục khả năng tái lập ứng dụng và cơ sở dữ liệu; xử lý các điểm thiếu kiểm quyền đã thấy trong source; sau đó xây mô hình học vụ nhà trường và hoàn thiện một luồng dạy học xuyên suốt. AI nâng cao, tài chính mở rộng và thương mại hóa đa trường nên đi sau nền tảng này.

## 2. Phạm vi và cách hiểu kết quả rà soát

### 2.1. Nguồn đã đối chiếu

- Source code hiện tại; tài liệu kiến trúc, dữ liệu, bảo mật, kiểm thử và các đặc tả tính năng còn được giữ trong `docs/`; tài liệu nghiên cứu trong `docs/Skill/`.
- Các tài liệu của phiên bản trung tâm tiếng Anh và hồ sơ cuộc thi đã được dùng để nhận diện nguồn gốc sản phẩm trong lần rà soát ban đầu. Ngày 26/09/2026, các tệp này đã được xóa khỏi workspace để tránh bị hiểu nhầm là yêu cầu hiện hành.
- Cấu trúc `app/`, `components/`, `hooks/`, `lib/`; đọc các đoạn triển khai trọng yếu về xác thực, học vụ, học liệu, đánh giá, lịch học, phụ huynh, AI, thanh toán và đồng bộ.
- Trạng thái file tại workspace, cấu hình ứng dụng và một lần kiểm tra TypeScript không sinh output.

Rà soát này là **đánh giá bối cảnh sản phẩm và kiến trúc qua tài liệu/source**, không phải kiểm toán toàn bộ từng dòng mã hoặc nghiệm thu hệ thống production. Không truy cập database thật, không gọi AI/thanh toán, không gửi thông báo hoặc chạy migration. Hồ sơ cuộc thi không phải yêu cầu nghiệp vụ của nhà trường và không còn nằm trong workspace.

### 2.2. Quy ước về độ chắc chắn

| Cách ghi | Ý nghĩa |
|---|---|
| **Có trong source** | Có trang, hàm hoặc route triển khai tương ứng; chưa đồng nghĩa đã chạy đúng xuyên suốt |
| **Theo tài liệu** | Ý định thiết kế hoặc mô tả của dự án; có thể khác phiên bản code hiện tại |
| **Chưa thấy trong phạm vi rà soát** | Không tìm được triển khai rõ trong các nguồn đã khảo sát; không suy diễn thành kết luận về database production |
| **Đề xuất** | Thiết kế/phạm vi phát triển tiếp, chưa được triển khai bởi lần rà soát này |

Khi có mâu thuẫn, dùng source hiện tại để mô tả cách ứng dụng đang được viết; dùng yêu cầu mới của chủ dự án để xác định đích đến. Cấu trúc database thật vẫn cần được xác minh riêng bằng schema, constraint, trigger, policy và cấu hình Storage/Realtime đang triển khai.

### 2.3. Trạng thái workspace ảnh hưởng tới kết luận

Tại thời điểm đọc, Git đã có nhiều thay đổi chưa commit, gồm thay đổi dependency và các file bị xóa. Đặc biệt, thư mục `supabase/`, `types/database.ts`, `stores/notificationStore.ts` không còn trên filesystem; `schema.sql` có kích thước **0 byte**. Những đường dẫn này vẫn được nhiều tài liệu nhắc tới. Đây là trạng thái có sẵn trước lần rà soát; chưa xác định các thay đổi đó là chủ đích dọn dẹp hay công việc đang dang dở.

**Bổ sung ngày 24/09/2026:** chủ dự án đã cung cấp [bản snapshot schema và RLS](DB_SCHEMA_SNAPSHOT_2026-09-24.md) ở dạng Markdown. Tài liệu này bổ sung thông tin cột của 63 bảng và các policy được liệt kê; không thay thế bộ migration thực thi và chưa xác nhận schema/RLS của database đang chạy.

Kiểm kê ghi nhận **82 file `page.tsx`, 21 file `route.ts` trong `app/api/`, 36 file trong `lib/actions/`**. Các con số chỉ mô tả kích thước cấu trúc, không phải số tính năng đã nghiệm thu. Trong 21 route có cả endpoint placeholder.

## 3. Bối cảnh hình thành và giá trị sản phẩm

### 3.1. Xuất phát điểm

Báo cáo và tiểu luận mô tả đề tài xây dựng LMS cho trung tâm tiếng Anh theo hướng cá nhân hóa và can thiệp sớm. Bài toán gốc là dữ liệu lớp học, học liệu, điểm danh, bài làm, học phí và trao đổi phụ huynh bị phân tán. Hệ thống gom những dữ liệu đó vào một ứng dụng và tạo giao diện phù hợp cho từng vai trò.

Phương pháp được báo cáo nêu là **Design Science Research**: phân tích vấn đề, hình thành nguyên tắc thiết kế, xây nguyên mẫu và đánh giá giới hạn. Báo cáo cũng nói rõ chưa có thực nghiệm người dùng quy mô lớn và chưa đủ cơ sở kết luận định lượng về hiệu quả học tập. Vì vậy, màn hình demo và số liệu minh họa không nên được sử dụng như bằng chứng về số trường triển khai, khách hàng hay tác động giáo dục.

Phần này ghi lại kết luận lịch sử từ lần rà soát ngày 24/09/2026. Các tài liệu nguồn của mô hình trung tâm tiếng Anh đã được loại khỏi workspace ngày 26/09/2026; chúng không phải yêu cầu hiện hành.

### 3.2. Những nguyên tắc nên giữ khi chuyển sang nhà trường

| Nguyên tắc từ bối cảnh nghiên cứu | Ý nghĩa đối với sản phẩm mới |
|---|---|
| Học sinh chủ động xây dựng kiến thức | Có nhiệm vụ, thực hành, trao đổi và phản hồi gắn với bài học |
| Tự điều chỉnh việc học | Học sinh biết việc cần làm, hạn nộp, tiến độ và bước tiếp theo |
| Đánh giá quá trình | Giáo viên nhận đủ bằng chứng để điều chỉnh dạy học trong học kỳ |
| Phân tích dữ liệu học tập | Tổng hợp kết quả, tiến độ và chuyên cần thành thông tin có thể hành động |
| Gia đình đồng hành | Phụ huynh nhận thông tin phù hợp về con và việc cần phối hợp |

Một định vị làm việc phù hợp là: **“Giúp nhà trường tổ chức dạy học, theo dõi tiến bộ theo môn và phối hợp hỗ trợ từng học sinh trên cùng một hệ thống.”**

Thành công cần được đo bằng mức sử dụng trong công việc thật, thời gian giáo viên tiết kiệm, chất lượng phản hồi và việc hỗ trợ được thực hiện. Số menu, số dashboard hoặc việc tích hợp AI chỉ thể hiện phương tiện xây sản phẩm.

## 4. Bản đồ chức năng hiện tại

Các mục dưới đây được xác nhận ở mức có triển khai trong source, trừ khi ghi chú khác. Cần kiểm thử trên môi trường có schema phù hợp để kết luận hoạt động đầy đủ.

| Miền chức năng | Thành phần hiện có | Giá trị kế thừa cho trường phổ thông | Điểm cần phát triển tiếp |
|---|---|---|---|
| Tài khoản và cổng vai trò | `/admin`, `/teacher`, `/student`, `/parent`; Supabase Auth | Giữ khung giao diện theo nhiệm vụ | Quyền theo trường, lớp, môn, năm học; một người nhiều vai trò |
| Học vụ | Khóa học, lớp, giáo viên, ghi danh; import người dùng/học sinh | Nền cho danh sách và phân lớp | Phân biệt lớp hành chính với lớp học theo môn |
| Lịch và buổi học | Phòng, lịch lặp, buổi học, nội dung từng buổi, nghỉ/thay giáo viên | Theo dõi lịch dạy và thực hiện bài học | Tiết học, tuần học, lịch nghỉ, kiểm tra xung đột toàn bộ nguồn lực |
| Học liệu | Cây `course_items`, nội dung `item_contents`, ngân hàng tài nguyên | Tái sử dụng trình biên soạn và trình học | Chương trình theo môn/khối, phiên bản, dùng lại qua nhiều lớp/năm |
| Bài tập và kiểm tra | Homework, exam, quiz, bài nộp, chấm trắc nghiệm, chấm thủ công | Nền tảng đánh giá quá trình | Rubric, chính sách đánh giá theo cấp học, công bố/khóa/sửa điểm |
| Điểm danh và xin nghỉ | Phiên điểm danh, bản ghi, đơn xin nghỉ, báo cáo, điểm chuyên cần | Dùng lại luồng giáo viên–phụ huynh | Phân biệt điểm danh ngày/buổi/tiết và quy tắc tổng hợp |
| Giao tiếp | Thông báo, xác nhận đọc, thảo luận, phản hồi, khảo sát | Kết nối hoạt động lớp với gia đình | Phạm vi gửi theo trường/khối/lớp; lịch sử phát hành và gửi lại |
| Phụ huynh | Liên kết con, xem lịch/điểm/chuyên cần, nhận xét, xin nghỉ | Phần phù hợp rõ với phổ thông | Xác minh người giám hộ, thu hồi quyền, giới hạn thông tin được xem |
| Mục tiêu và động lực | Mục tiêu, thói quen, nhận xét, điểm thưởng, bảng xếp hạng | Hỗ trợ tự quản lý việc học | Cấu hình theo lứa tuổi, tránh đánh đồng điểm thưởng với học lực |
| Phân tích và AI | Sinh câu hỏi, phân tích lớp/cá nhân, bài bổ trợ, feedback, hành vi | Giảm công việc tổng hợp, gợi ý hỗ trợ | Bằng chứng theo kỹ năng, giáo viên duyệt, đánh giá sai số |
| Tài chính | Kế hoạch phí, hóa đơn, chuyển khoản xác nhận, Stripe/VNPay | Có thể giữ thành phân hệ tùy chọn | Xác nhận nhu cầu từng trường và hoàn thiện đối soát trước sử dụng thật |
| Trải nghiệm kỹ thuật | React Query, Realtime, PWA, giao diện mobile | Duy trì khả năng truy cập trên điện thoại | Khôi phục dependency nội bộ bị thiếu; kiểm chứng cache và offline |

Điểm bắt đầu đọc source: [học vụ](../lib/actions/academic.ts), [học liệu](../lib/actions/courseBuilder.ts), [bài tập](../lib/actions/homework.ts), [kiểm tra](../lib/actions/exam.ts), [điểm danh](../lib/actions/attendance.ts), [lịch](../lib/actions/schedule.ts), [phụ huynh](../lib/actions/parentStudent.ts), [mục tiêu](../lib/actions/goals-habits.ts), [AI quiz](../lib/actions/quiz-analysis.ts).

## 5. Kiến trúc và mô hình dữ liệu đang được sử dụng

### 5.1. Kiến trúc ứng dụng

Đây là ứng dụng full-stack Next.js trong một repository. UI, Server Components, Server Actions và Route Handlers cùng nằm trong ứng dụng; chưa thấy một backend nghiệp vụ độc lập.

| Thành phần | Vai trò và nguồn đối chiếu |
|---|---|
| Next.js, React, TypeScript | `package.json` khai báo Next.js `^16.1.6`, React `19.2.3`, TypeScript `^5`; đây là khai báo dependency, không phải xác nhận phiên bản dịch vụ đang triển khai |
| Tailwind, Radix/shadcn | Giao diện và component dùng lại trong `components/ui/` |
| Server Actions | `lib/actions/` xử lý phần lớn truy vấn và thay đổi nghiệp vụ; một số action còn nằm trong `app/` |
| API routes | AI, activity tracking, payment, webhook/IPN và bài bổ trợ |
| Supabase | Auth, PostgreSQL, Storage và Realtime qua các client trong `lib/supabase/` |
| React Query và Realtime | Cache dữ liệu phía ứng dụng và làm mới sau sự kiện; xem `lib/providers/`, `hooks/useRealtimeSync.ts` |
| Gemini | Helper chung tại `lib/gemini.ts`; có retry/parse JSON và xoay key; một số module gọi model trực tiếp |
| Stripe, VNPay, Resend | Đã có code tích hợp thanh toán và email; cần cấu hình và nghiệm thu riêng |
| PWA | Có `next-pwa`, manifest và cấu hình cache; chưa xác nhận cài đặt/offline hoạt động trên bản build hiện tại |

Không cần quyết định viết lại toàn bộ hoặc tách microservice để đạt mục tiêu này. Đề xuất tiếp tục kiến trúc hiện tại, nhưng làm rõ các miền nghiệp vụ, lớp kiểm quyền dùng chung, kiểu dữ liệu và ranh giới xử lý nền.

### 5.2. Quan hệ dữ liệu có thể suy ra từ các truy vấn

| Nhóm | Quan hệ và ý nghĩa hiện tại |
|---|---|
| Người dùng | `users`, `profiles`; `parent_students` nối phụ huynh với học sinh |
| Học vụ | `courses` có nhiều `classes`; lớp có `teacher_id`; `enrollments` nối học sinh với lớp |
| Lịch | `class_schedules` mô tả lịch; `class_sessions` mô tả từng buổi thực tế |
| Học liệu | `course_items` gắn `class_id`, có `parent_id` để tạo cây; `item_contents` giữ nội dung |
| Đánh giá | `homework`/`homework_submissions`, `exams`/`exam_submissions`; còn tham chiếu `assignments`/`submissions`, `quiz_attempts` |
| Chuyên cần | `attendance_sessions` và `attendance_records`; `absence_requests` phục vụ xin nghỉ |
| Phân tích | Activity logs, behavior scores/alerts, quiz analysis và improvement progress |
| Giao tiếp/tài chính | Announcements/notifications; invoices/payments và cấu hình học phí |

Đây là **mô hình suy ra từ code và tài liệu**, không phải bản xuất schema database. [Snapshot do chủ dự án cung cấp](DB_SCHEMA_SNAPSHOT_2026-09-24.md) cho phép tra cứu thêm cột, một số constraint và RLS policy được liệt kê, nhưng chưa thể xác nhận đầy đủ khóa ngoại, trigger, cấu hình khác hoặc bảng nào còn dùng trong production. Bộ SQL migration hiện không còn tại workspace.

Nhiều thế hệ cấu trúc vẫn xuất hiện trong code/tài liệu: `lessons` và `course_items`; `assignments`, `homework`, `exams`; lịch dạng trường trong `classes` và bảng `class_schedules`. Khi chuyển đổi cần lập bảng ánh xạ nguồn dữ liệu chuẩn, tránh cộng trùng kết quả hoặc duy trì hai luồng ghi cho cùng một nghiệp vụ.

### 5.3. Những luồng nghiệp vụ tạo nên sản phẩm

1. **Tổ chức việc học:** quản trị tạo khóa/lớp → gán giáo viên → ghi danh học sinh → xếp lịch/phòng → giáo viên chuẩn bị học liệu.
2. **Dạy và đánh giá:** giáo viên công bố nội dung/bài → học sinh học và nộp → chấm tự động hoặc thủ công → cập nhật kết quả và phản hồi.
3. **Chuyên cần:** tạo phiên điểm danh → giáo viên ghi trạng thái → phụ huynh xem hoặc xin nghỉ → người phụ trách duyệt → báo cáo được tổng hợp.
4. **Hỗ trợ học tập:** kết quả bài làm/tiến độ tạo tín hiệu → phân tích lớp/cá nhân → giáo viên xem/sửa phản hồi → giao bài bổ trợ → theo dõi hoàn thành.
5. **Phối hợp gia đình:** liên kết phụ huynh–con → xem dữ liệu trong phạm vi được phép → nhận thông báo/nhận xét → phản hồi hoặc phối hợp hỗ trợ.

Các luồng này nên là đơn vị nghiệm thu. Việc từng trang render được chưa chứng minh dữ liệu đi đúng từ vai trò này sang vai trò khác.

## 6. Khác biệt cốt lõi khi phục vụ trường phổ thông

### 6.1. Mô hình tổ chức dạy học

| Khía cạnh | Nền hiện tại | Mục tiêu cho nhà trường |
|---|---|---|
| Đơn vị tổ chức | Trung tâm/ứng dụng dùng chung | Trường, có thể thêm cơ sở nếu cần; dữ liệu có phạm vi rõ |
| Thời gian học | Lịch và ngày của lớp/bài | Năm học, học kỳ, tuần/tiết và các mốc công bố/khóa dữ liệu |
| Lớp | Lớp thuộc khóa học, một `teacher_id` chính | Lớp hành chính và các lớp học theo môn/phân công giảng dạy |
| Chương trình | Nội dung do giáo viên tổ chức cho lớp | Danh mục môn, khối, chương/chủ đề, mục tiêu học tập và học liệu dùng lại |
| Vai trò giáo viên | Một vai trò `teacher` | Giáo viên bộ môn, chủ nhiệm, tổ trưởng; có thể đồng thời nhiều nhiệm vụ |
| Đánh giá | Điểm bài và báo cáo tổng hợp | Đánh giá theo môn, kỳ và cấp học; trạng thái nháp/công bố/khóa, lịch sử sửa |
| Chuyên cần | Theo phiên/buổi của lớp | Quy tắc theo ngày/buổi/tiết; phân biệt chuyên cần với kết quả học tập |
| Vòng đời học sinh | Ghi danh hoặc rời một lớp | Nhập học, chuyển lớp, chuyển trường, lên lớp, lưu lịch sử qua năm học |
| Phụ huynh | Liên kết bằng mã hoặc admin | Quan hệ người giám hộ được xác minh, có thể thu hồi và thay đổi theo thời gian |
| Báo cáo | Dashboard theo lớp/cá nhân | Báo cáo theo môn, khối, lớp chủ nhiệm, kỳ và toàn trường trong phạm vi quyền |

**Ví dụ mô hình đích:** học sinh A thuộc lớp hành chính 6A của năm học 2026–2027; học Toán 6A với giáo viên B và Tiếng Anh 6A với giáo viên C. Giáo viên D chủ nhiệm 6A được xem tổng hợp để hỗ trợ, nhưng không tự động có quyền sửa điểm môn do B hoặc C phụ trách. Sang năm học mới, hồ sơ A vẫn giữ nguyên và có một quan hệ lớp mới, thay vì sửa đè lớp cũ.

Trong source đã khảo sát chưa thấy các định danh `school_id`, `academic_year`, `semester`, `subject_id`, `homeroom` hoặc mô hình tương đương rõ ràng cho tổ chức này. Dòng “Học kỳ mùa Thu 2026” trong [TeacherNavbar](../components/teacher/TeacherNavbar.tsx) là chuỗi giao diện cố định; không thể dùng nó làm bằng chứng đã có phân hệ học kỳ.

### 6.2. Phân biệt yêu cầu giữa các cấp học

Mô hình dùng chung cần cho phép cấu hình theo cấp học, thay vì áp một cách chấm điểm và một giao diện cho tất cả.

| Cấp học | Hướng thiết kế cần khảo sát và xác nhận với trường |
|---|---|
| Tiểu học | Luồng thao tác ngắn, hỗ trợ đọc hiểu, nhận xét và minh chứng quá trình; phụ huynh tham gia nhiều hơn; tránh bắt buộc mỗi học sinh phải có email cá nhân |
| THCS | Theo dõi nhiều môn, phối hợp giáo viên bộ môn–chủ nhiệm, nhiệm vụ theo tuần và hỗ trợ học sinh hình thành thói quen tự học |
| THPT | Tăng quyền tự quản của học sinh; hỗ trợ nhóm/lớp theo môn lựa chọn khi trường có nhu cầu; kế hoạch đánh giá và báo cáo theo môn rõ ràng |

Đây là định hướng sản phẩm cần khảo sát, không phải mô tả đầy đủ quy định đánh giá giáo dục hiện hành. Trước khi xây sổ điểm/học bạ chính thức, cần thu thập biểu mẫu, cách tính, thẩm quyền duyệt và yêu cầu áp dụng của trường cho từng cấp học; xác minh văn bản có hiệu lực tại thời điểm triển khai. Tài liệu này không tự xác lập công thức điểm tổng kết hoặc điều kiện lên lớp.

## 7. Phạm vi sản phẩm đích đề xuất

### 7.1. Phạm vi LMS đầu tiên cho nhà trường

- Quản lý năm học, học kỳ, khối, lớp hành chính, môn và phân công giáo viên.
- Quản lý danh sách học sinh, phụ huynh và quan hệ học sinh–lớp–môn có lịch sử.
- Tổ chức học liệu; giao bài; thu bài; chấm và nhận xét; công bố kết quả.
- Lịch học, điểm danh, đơn xin nghỉ và báo cáo chuyên cần phù hợp quy trình trường.
- Bảng theo dõi học tập theo môn; màn hình tổng hợp cho chủ nhiệm và ban giám hiệu.
- Thông báo, phản hồi, phụ huynh xem thông tin của con và phối hợp hỗ trợ.
- Quy trình ghi nhận học sinh cần hỗ trợ, phân công người phụ trách và theo dõi kết quả.
- Import/export, phân quyền, nhật ký thao tác, sao lưu/khôi phục và vận hành cơ bản.

Học vụ tối thiểu là phần cần thiết để LMS biết ai học gì, ở đâu, với ai và trong kỳ nào. Những việc như tuyển sinh đầy đủ, nhân sự–lương, kế toán, tài sản, bán trú, xe đưa đón và thư viện nên được xác định là phạm vi riêng hoặc tích hợp sau. Phân hệ học phí hiện có có thể bật theo nhu cầu, không cần trở thành điều kiện bắt buộc để trường dùng LMS.

### 7.2. Vai trò và quyền theo phạm vi

| Vai trò nghiệp vụ đề xuất | Quyền chính | Giới hạn cần thể hiện |
|---|---|---|
| Quản trị kỹ thuật trường | Tài khoản, cấu hình, phân quyền, hỗ trợ vận hành | Quyền xem/sửa thông tin học tập phải được cấp rõ; không mặc định mọi kỹ thuật viên được sửa điểm |
| Ban giám hiệu | Báo cáo toàn trường, giám sát, phê duyệt theo phân công | Tách quyền xem báo cáo khỏi quyền thay đổi dữ liệu gốc |
| Giáo vụ | Năm học, danh mục, danh sách, lịch và chuyển lớp | Không mặc định chấm bài thay giáo viên |
| Tổ trưởng chuyên môn | Theo dõi/phê duyệt trong tổ hoặc môn được giao | Giới hạn theo phạm vi chuyên môn và thời gian phân công |
| Giáo viên bộ môn | Học liệu, nhiệm vụ, đánh giá và điểm danh lớp mình phụ trách | Không đọc/sửa tùy ý môn hoặc lớp khác |
| Giáo viên chủ nhiệm | Tổng hợp học tập/chuyên cần, phối hợp gia đình, hỗ trợ lớp chủ nhiệm | Không mặc định sửa điểm của mọi môn |
| Học sinh | Học, nộp bài, xem phản hồi và kết quả của mình | Chỉ nội dung được công bố và lớp mình có quyền học |
| Phụ huynh/người giám hộ | Theo dõi con đã xác minh, xin nghỉ, nhận thông báo | Không xem học sinh khác hoặc toàn bộ dữ liệu hành vi thô |

Một người có thể là giáo viên bộ môn, chủ nhiệm và phụ huynh đồng thời. Do đó, cần mô hình **người dùng + vai trò + phạm vi + thời hạn**, và chuyển ngữ cảnh trên giao diện. Có thể tiếp tục dùng bốn nhóm portal hiện có, bổ sung quyền chi tiết bên trong; không nhất thiết tạo một ứng dụng riêng cho mỗi chức danh.

### 7.3. Mô hình dữ liệu đích ở mức khái niệm

Tên bảng dưới đây là tên gợi ý để trao đổi, chưa phải migration được phê duyệt.

| Miền cần bổ sung/chuẩn hóa | Thực thể gợi ý | Nguyên tắc |
|---|---|---|
| Tổ chức | `schools`, `school_memberships`, `role_assignments` | Mỗi quyền và dữ liệu có phạm vi trường rõ; kế hoạch cách ly triển khai riêng/chung cần chốt trước khi phục vụ nhiều trường |
| Thời gian | `academic_years`, `terms`, `school_calendar` | Học kỳ thuộc năm; có trạng thái mở/đóng và khoảng thời gian |
| Chương trình | `subjects`, `grade_levels`, `curriculum_units`, `learning_outcomes` | Tách danh mục môn/chương trình khỏi lớp đang học |
| Lớp và phân công | `homeroom_classes`, `teaching_groups`, `teaching_assignments` | Lớp hành chính khác lớp/nhóm dạy một môn; phân công có thời gian hiệu lực |
| Học sinh | Hồ sơ học sinh, quan hệ lớp theo năm, đăng ký nhóm học | Giữ một định danh học sinh xuyên suốt; chuyển lớp không xóa lịch sử |
| Học liệu và bài làm | Phiên bản học liệu/đề, bài giao, lượt làm, câu trả lời, rubric | Giữ nguyên đề đã dùng để chấm; nội dung tái sử dụng không làm đổi bài cũ |
| Đánh giá | Chính sách đánh giá, sổ đánh giá theo môn/kỳ, lịch sử điều chỉnh | Tách điểm luyện tập khỏi kết quả chính thức; phân biệt chưa chấm với điểm 0 |
| Hỗ trợ học sinh | `intervention_cases`, hành động và lần theo dõi | Mỗi trường hợp có bằng chứng, người phụ trách, hạn xem lại và kết quả |
| Vận hành | `audit_logs`, lịch sử import, tác vụ nền, lịch sử gửi | Truy vết được ai làm gì và khả năng chạy lại an toàn |

Không đổi nghĩa bảng `classes` hoặc `courses` trực tiếp chỉ bằng sửa tên. Trước tiên cần thống nhất liệu `classes` sẽ đại diện lớp theo môn hay cấu trúc khác, lập ánh xạ dữ liệu cũ và đo tác động tới mọi `class_id`. Chỉ mở rộng bảng cũ khi ý nghĩa nghiệp vụ còn tương thích; thực thể mới như năm học và lớp hành chính cần quan hệ riêng nếu việc gộp gây mơ hồ.

## 8. Phát hiện kỹ thuật cần xử lý trước khi mở rộng

Ưu tiên dưới đây dựa trên đọc source và trạng thái workspace. Chưa thực hiện khai thác endpoint, kiểm thử xâm nhập hoặc xác nhận dữ liệu bị lộ trên hệ thống thật.

| Mức | Phát hiện và bằng chứng | Ảnh hưởng | Hướng xử lý đề xuất |
|---|---|---|---|
| P0 | `schema.sql` rỗng; bộ `supabase/` và types đang bị xóa trong working tree | Chưa có nguồn database tái lập đáng tin tại workspace | Xác nhận chủ đích thay đổi; khôi phục/chốt baseline từ lịch sử và schema được kiểm chứng; lưu migration, policy, trigger, Storage và seed thử nghiệm |
| P0 | TypeScript báo thiếu `@/types/database` và `@/stores/notificationStore` | Chưa đạt điều kiện kiểm tra kiểu; chưa nên xem bản hiện tại là sẵn sàng release | Khôi phục hoặc thay import tương ứng một cách nhất quán; kiểm tra lại và build |
| P0 | `createCourse`, `createClass`, `enrollStudent` trong `academic.ts`; `updateExam`, `deleteExam`, `saveManualGrades` trong `exam.ts` dùng admin client mà không có kiểm người gọi/quyền trong hàm | Ranh giới quyền ở thao tác dữ liệu chưa được bảo vệ đầy đủ tại các điểm đã đọc | Guard dùng chung cho session, vai trò và phạm vi đối tượng trước truy vấn; hạn chế service role; kiểm thử gọi trực tiếp |
| P0 | `proxy.ts` bỏ qua `/api`; `generate-questions` và `send-feedback` không có bước xác thực trong handler; `send-feedback` còn ghi qua admin client | Chưa bảo vệ việc tiêu thụ AI và phát hành phản hồi ở API này | Xác thực, kiểm phân công lớp, giới hạn đầu vào/tần suất và trạng thái duyệt trước xử lý |
| P0 | `fetchExamQuestions(examId, studentId?)` dựa vào `studentId` được truyền để quyết định trả đáp án; `submitExamAnswers` chưa đối chiếu đủ ghi danh, công bố, hạn nộp và thời lượng trên server | Đọc đề/đáp án và nộp bài chưa gắn chặt với danh tính và chính sách bài kiểm tra | Lấy học sinh từ session; kiểm quyền theo đề/lớp; quản lý lượt làm và thời gian phía server; chỉ trả đáp án khi chính sách cho phép |
| P1 | Proxy đọc `user.user_metadata.role`, còn nhiều luồng đọc `users.role` | Nguồn quyết định quyền không thống nhất; redirect không đủ để bảo vệ dữ liệu | Chốt nguồn quyền do server quản lý; đồng bộ vai trò và kiểm quyền tại từng action/API |
| P1 | [next.config.ts](../next.config.ts) đặt NetworkFirst cho URL Supabase với thời gian cache 24 giờ | Cần kiểm tra dữ liệu riêng tư còn lưu khi đổi tài khoản hoặc mất mạng | Xác định response nào được cache; tránh lưu rộng dữ liệu học sinh; kiểm thử logout, dùng chung thiết bị và cache cũ |
| P1 | Stripe webhook tìm một payment `pending` theo invoice; VNPay tìm `pending` theo prefix mã đơn; cập nhật payment/invoice tách rời | Chưa đủ cơ sở coi xử lý lặp, nhiều lần thanh toán hoặc lỗi giữa chừng là an toàn | Gắn định danh giao dịch chính xác, đối chiếu số tiền/tiền tệ, lưu event, xử lý lặp và cập nhật trạng thái nhất quán |
| P1 | `behavior-analysis.ts` dùng cả Gemini và luật fallback; lịch sử điểm đánh dấu `class_match` nhưng chưa lọc theo cờ này trước tính trend, và có cách chuẩn hóa điểm khác nhau giữa nguồn | Báo cáo của một lớp có thể bị ảnh hưởng bởi điểm ngoài lớp hoặc thang điểm khác | Chuẩn hóa nguồn, phạm vi môn/lớp/kỳ, thang đo và quy tắc thiếu dữ liệu trước đưa ra cảnh báo |
| P1 | `calcAttendanceRate` loại trạng thái đi muộn khỏi mẫu số và tính nghỉ có phép vào số vắng | Chỉ số phản ánh quy ước hiện tại; chưa chắc trùng quy ước trường | Chốt định nghĩa với trường; hiển thị cả số buổi và cách tính; áp dụng nhất quán mọi báo cáo |
| P1 | `package.json` chưa có script test; có kế hoạch kiểm thử bằng tài liệu | Chưa có bằng chứng tự động bảo vệ các workflow nhạy cảm khi thay data model | Bổ sung kiểm thử phân quyền, nghiệp vụ điểm/bài nộp, migration và một số E2E xuyên vai trò |

Nguồn source: [academic.ts](../lib/actions/academic.ts), [exam.ts](../lib/actions/exam.ts), [proxy.ts](../proxy.ts), [generate-questions](../app/api/ai/generate-questions/route.ts), [send-feedback](../app/api/ai/send-feedback/route.ts), [Stripe webhook](../app/api/payment/stripe/webhook/route.ts), [VNPay IPN](../app/api/payment/vnpay/ipn/route.ts), [behavior-analysis.ts](../lib/actions/behavior-analysis.ts), [cách tính chuyên cần](../lib/utils/attendance-rate.ts).

Có những phần đã kiểm quyền tốt hơn để dùng làm cơ sở chuẩn hóa: `fetchParentDashboardData` xác định user và kiểm quan hệ phụ huynh–con; `getStudentProgressStats` kiểm role/quan hệ; activity API lấy `student_id` từ session; payment create dùng Zod và lấy số tiền từ invoice. Tuy nhiên, mức bảo vệ chưa đồng đều giữa các entry point. RLS cũng cần kiểm tra riêng: không thể suy ra policy production từ README, và truy vấn service role không được bảo vệ giống truy vấn theo session.

### 8.1. Sai lệch tài liệu cần ghi nhớ

- [ARCHITECTURE.md](ARCHITECTURE.md) mô tả proxy đọc role từ database, trong khi code tại thời điểm rà soát đọc metadata. Luôn kiểm tra source hiện tại trước khi sử dụng mô tả này.
- README tuyên bố tất cả Server Actions kiểm user trước truy vấn; các ví dụ trong bảng trên cho thấy chưa thể dùng tuyên bố đó làm kết luận bảo mật.
- `useRole.ts`, `useRealtime.ts` và `lib/validations/index.ts` còn placeholder. Có triển khai Realtime khác trong `useRealtimeSync.ts` và validation cục bộ trong một số API, nên không được suy ra toàn hệ thống chưa có các khả năng này.
- `/api/ai`, `/api/payment`, `/api/notifications` là placeholder; các route con và Server Actions mới là nơi có nhiều chức năng thực tế.
- Dependency Zustand vẫn được khai báo nhưng store được import đang thiếu. Sự hiện diện của package không chứng minh một module hoàn chỉnh.
- Spec payment mô tả tạo PDF/gửi email tự động; VNPay IPN còn TODO cho bước tạo PDF. Không nên cam kết trọn luồng dựa trên spec.
- Tài liệu ML và knowledge map gồm cả ý tưởng tương lai. Source đã đọc thể hiện Gemini kết hợp luật, chưa có bằng chứng pipeline BKT/Isolation Forest đã được triển khai và đánh giá.

### 8.2. Kết quả kiểm tra kỹ thuật trong lần rà soát

Đã chạy TypeScript với tùy chọn `--noEmit --incremental false --pretty false`. Kết quả: **exit code 2, ba lỗi**:

```text
hooks/useAuth.ts(6,31): TS2307 Cannot find module '@/types/database'
hooks/useRealtimeSync.ts(6,38): TS2307 Cannot find module '@/stores/notificationStore'
lib/actions/point.ts(6,30): TS2307 Cannot find module '@/types/database'
```

Chưa chạy lint, production build hoặc E2E trong lần tổng hợp tài liệu này. Không kết luận về các lỗi chỉ xuất hiện khi build, đăng nhập, truy cập database hoặc sử dụng tích hợp ngoài. Việc hoàn thiện Markdown không đồng nghĩa các vấn đề source nêu trên đã được sửa.

## 9. AI và hỗ trợ sớm trong môi trường nhà trường

### 9.1. Chu trình sản phẩm cần hoàn thiện

Chu trình đích là: **bằng chứng học tập → tín hiệu cần chú ý → giáo viên xem xét → kế hoạch hỗ trợ → phối hợp gia đình → kiểm tra lại kết quả**.

Hiện đã có nhiều thành phần tạo tín hiệu và bài bổ trợ. Phần cần làm rõ hơn là hồ sơ hỗ trợ: ai chịu trách nhiệm, hành động nào đã thực hiện, thời điểm xem lại, lý do giáo viên đồng ý/bác bỏ gợi ý và kết quả sau đó. Một dashboard hiển thị “nguy cơ cao” chưa thay thế được quy trình này.

### 9.2. Ranh giới nên giữ

1. AI tạo nháp và gợi ý; giáo viên duyệt trước khi phát hành nhận xét quan trọng cho học sinh/phụ huynh. Lưu cả nháp, nội dung đã sửa và người duyệt.
2. Mỗi nhận định cần gắn bằng chứng theo môn, thời gian và số lượng quan sát. Khi thiếu dữ liệu, hiển thị “chưa đủ dữ liệu”, không mặc định học sinh yếu hoặc lười.
3. Sự kiện chuyển tab, idle hay trả lời nhanh chỉ là tín hiệu kỹ thuật có nhiều cách giải thích. Không tự chuyển thành kết luận gian lận, hạnh kiểm hoặc quyết định kỷ luật.
4. Phụ huynh nên nhận nhận xét đã được giáo viên duyệt và hành động cần phối hợp; quyền xem telemetry thô hoặc suy đoán nội bộ cần được giới hạn.
5. Không gửi thông tin nhận diện không cần thiết vào prompt. Định nghĩa thời gian lưu dữ liệu hoạt động, người được truy cập và cách thu hồi/xóa theo quy trình của trường.
6. Có quota, trạng thái xử lý và fallback; việc học, nộp bài và chấm cơ bản tiếp tục hoạt động khi AI lỗi. Xoay API key không thay thế cơ chế kiểm soát tải và chi phí.

BKT, phát hiện bất thường và hệ khuyến nghị có thể là nhánh nghiên cứu sau khi có dữ liệu theo kỹ năng và quy trình đánh giá phù hợp. Không dùng chính nhãn do thuật toán cũ tự sinh làm “sự thật” để chứng minh thuật toán mới chính xác; cần đối chiếu với đánh giá độc lập của giáo viên và kết quả thực tế.

Nguồn định hướng: [quy trình can thiệp sớm](STUDENT_EARLY_INTERVENTION_FLOW.md), [knowledge map](Skill/KnowledgeBehavior.md), [đề xuất ML](Skill/ML_Research_Proposal.md). Các nguyên tắc là mục tiêu phải hiện thực hóa, chưa phải chứng nhận rằng mọi luồng hiện tại đã tuân thủ.

## 10. Lộ trình nâng cấp theo điều kiện hoàn thành

Chưa ước lượng số tuần vì chưa có quy mô nhóm phát triển, trường thí điểm và dữ liệu cần chuyển. Các giai đoạn dưới đây có thể được chia thành sprint sau khi chốt ba yếu tố đó.

| Giai đoạn | Công việc chính | Điều kiện chuyển giai đoạn |
|---|---|---|
| **0. Chốt bối cảnh thí điểm** | Chọn một trường/cấp học; làm việc với giáo vụ, chủ nhiệm, giáo viên bộ môn, phụ huynh; lấy biểu mẫu và quy trình thực tế | Có phạm vi pilot, bộ thuật ngữ, ma trận quyền và định nghĩa đánh giá/chuyên cần được xác nhận |
| **1. Ổn định nền tảng** | Xử lý file/type/store thiếu; baseline database; guard/RLS; kiểm tra bài nộp và đáp án; logging, backup/restore; cập nhật tài liệu lệch source | Typecheck/build đạt; dựng được môi trường mới; bộ test quyền cốt lõi đạt; phục hồi được dữ liệu thử |
| **2. Bổ sung học vụ phổ thông** | Năm học, học kỳ, khối, môn, lớp hành chính, nhóm học, phân công, vai trò theo phạm vi; import và ánh xạ dữ liệu cũ | Một học sinh thuộc đúng lớp/năm và nhiều môn; nhiều giáo viên phụ trách đúng phạm vi; chuyển kỳ/lớp không mất lịch sử |
| **3. Hoàn thiện dạy học và báo cáo** | Học liệu dùng lại, bài tập/kiểm tra, sổ đánh giá theo chính sách đã chốt, công bố/khóa/sửa, lịch/điểm danh, phụ huynh | Nghiệm thu được các hành trình xuyên vai trò ở mục 11; báo cáo khớp dữ liệu gốc |
| **4. Thí điểm và cải tiến** | Hướng dẫn người dùng; dùng trên lớp thật trong phạm vi thỏa thuận; đo công sức, mức sử dụng và lỗi; hoàn thiện hỗ trợ sớm | Giáo viên dùng đều, dữ liệu đủ chất lượng, không còn lỗi chặn luồng; trường đồng ý mở rộng dựa trên kết quả |
| **5. Mở rộng có kiểm soát** | Nhiều khối/trường; tối ưu tải, hàng đợi, tích hợp hệ thống hiện có; AI nâng cao nếu đủ dữ liệu | Đã kiểm chứng cách ly dữ liệu, công suất, chi phí hỗ trợ và quy trình vận hành |

### 10.1. Các nguyên tắc chuyển đổi dữ liệu

- Xác minh schema thật và sao lưu trước khi thay đổi; không tự khôi phục toàn bộ file SQL cũ rồi chạy lên môi trường đang dùng.
- Lập bảng ánh xạ `course/class/student/teacher` cũ sang trường, môn, lớp và kỳ mới. Những bản ghi không đủ thông tin phải vào danh sách cần đối soát.
- Chuyển theo từng bước: thêm cấu trúc → điền dữ liệu → kiểm tra → chuyển luồng đọc/ghi → bỏ cấu trúc cũ khi không còn phụ thuộc.
- Giữ định danh và lịch sử bài nộp, điểm, điểm danh, quan hệ phụ huynh. Không sửa đè lịch sử để làm số liệu “khớp” cấu trúc mới.
- Đối chiếu trước/sau bằng số lượng bản ghi, quan hệ, điểm và báo cáo trên mẫu đại diện; ghi nhận phương án quay lại cho từng đợt.

### 10.2. Tích hợp và khả năng mở rộng

Giai đoạn đầu nên ưu tiên nhập/xuất dữ liệu có mẫu rõ, xem trước và báo lỗi từng dòng. Khi trường có hệ thống danh sách hoặc sổ điểm riêng, cần chốt hệ thống nào là nguồn dữ liệu chuẩn, chiều đồng bộ, định danh và xử lý xung đột.

SSO, chuẩn đóng gói học liệu hoặc tích hợp công cụ học tập là các hạng mục khảo sát theo nhu cầu thực tế; chưa thấy triển khai rõ trong source được rà soát. Không cần cam kết hỗ trợ một tiêu chuẩn hoặc viết bộ đồng bộ phức tạp trước khi biết đối tác và dữ liệu phải trao đổi.

## 11. Tiêu chí nghiệm thu cho một trường thí điểm

### 11.1. Những hành trình bắt buộc

| Hành trình | Kết quả cần chứng minh |
|---|---|
| Khởi tạo năm học | Import danh sách, tạo lớp hành chính, môn, học kỳ, phân công; phát hiện lỗi/trùng dữ liệu trước ghi |
| Dạy nhiều môn | Cùng học sinh học nhiều môn; mỗi giáo viên chỉ quản lý phần được phân công; chủ nhiệm xem đúng tổng hợp |
| Giao và nộp bài | Học sinh chỉ thấy bài đã công bố; bài nộp lưu đúng người/lớp/môn; thao tác gửi lại do mạng chậm không tạo bản ghi sai |
| Chấm và công bố | Tách chưa chấm/đã chấm; lưu người sửa và lý do; phụ huynh chỉ thấy kết quả được phép công bố |
| Điểm danh và xin nghỉ | Một đơn có thể đi qua gửi–duyệt–cập nhật; báo cáo tính đúng quy ước và không đếm trùng ngày/tiết |
| Hỗ trợ sớm | Giáo viên xem bằng chứng, ghi hành động, giao bài hỗ trợ, hẹn xem lại và ghi kết quả |
| Đổi lớp/kết thúc năm | Dữ liệu cũ giữ nguyên; quyền của năm cũ và năm mới đúng; học sinh không bị tạo trùng hồ sơ |
| Kiểm tra phân quyền | Gọi trực tiếp action/API với ID của lớp, con hoặc trường khác đều bị chặn; người dùng không tự nâng quyền |
| Sự cố | Mất mạng/AI lỗi có thông báo rõ; bài nộp không mất âm thầm; khôi phục được bản sao lưu đã thử |

### 11.2. Chỉ số cần đo

Đo quy trình hiện tại của trường trước pilot để có mốc so sánh. Các mục sau là chỉ số đề xuất; mục tiêu số cần thống nhất sau khảo sát, chưa phải kết quả đã đạt.

| Nhóm | Chỉ số và cách hiểu |
|---|---|
| Giáo viên | Tỷ lệ giáo viên có thao tác nghiệp vụ mỗi tuần; thời gian giao/chấm/tổng hợp một nhiệm vụ so với trước |
| Học sinh | Tỷ lệ nộp/hoàn thành đúng hạn trên số nhiệm vụ thực sự được giao; phân biệt chưa làm với lỗi đồng bộ |
| Chất lượng dữ liệu | Tỷ lệ lớp có dữ liệu đầy đủ; số chênh lệch giữa báo cáo và dữ liệu gốc; số lần nhập trùng |
| Phụ huynh | Tỷ lệ liên kết được xác minh; tỷ lệ nhận/đọc thông báo trên số người thực sự được gửi |
| Hỗ trợ | Số trường hợp được giáo viên xem, có hành động và được theo dõi lại; lý do bác bỏ cảnh báo |
| Độ tin cậy | Lỗi ở luồng đăng nhập/nộp bài/chấm; thời gian phản hồi khi cả lớp thao tác; kết quả backup/restore |
| AI | Tỷ lệ giáo viên chấp nhận/sửa/bác bỏ gợi ý; lỗi đầu ra, độ trễ và chi phí theo phạm vi sử dụng |

Nếu đánh giá tác động tới học tập, cần các bài đánh giá so sánh được và thiết kế nghiên cứu phù hợp. Thay đổi điểm trung bình hoặc số lượt đăng nhập tự nó chưa chứng minh AI làm học sinh tiến bộ.

## 12. Những quyết định còn cần chốt

| Quyết định | Đã biết | Phần cần xác nhận trước thiết kế chi tiết |
|---|---|---|
| Phân khúc | Trường phổ thông | Cấp học thí điểm đầu tiên, công lập/tư thục, số lớp và người dùng |
| Phạm vi năm đầu | Hướng tới LMS cho nhà trường | Chỉ hỗ trợ dạy học hay kiêm sổ điểm/học bạ chính thức |
| Nguồn dữ liệu | Có code quản lý người dùng/lớp | Dữ liệu thật ở đâu, hệ thống nào là nguồn chuẩn, ai được nhập/sửa |
| Triển khai | Ứng dụng Next.js + Supabase | Một trường riêng hay nhiều trường trên cùng nền; yêu cầu lưu trữ và hỗ trợ |
| Tài khoản | Bốn vai trò hiện có | Cấp tài khoản cho học sinh nhỏ tuổi, quy trình xác minh người giám hộ, đa vai trò |
| Đánh giá và chuyên cần | Có cách tính hiện tại trong code | Biểu mẫu, thang đánh giá, phê duyệt, công bố, khóa và lịch sử điều chỉnh |
| AI | Có Gemini và cơ chế theo luật | Trường cho phép dùng ở luồng nào, dữ liệu nào được gửi, ai duyệt đầu ra |
| Nguồn lực | Chưa chốt trong yêu cầu này | Nhóm phát triển, người phụ trách học vụ, mốc pilot, ngân sách vận hành |

Các câu hỏi này là đầu vào cho giai đoạn tiếp theo, không làm thay đổi kết luận rằng có thể kế thừa codebase hiện tại. Chúng quyết định phần nào phải xây ngay và phần nào có thể hoãn.

## 13. Bối cảnh ngắn để dùng cho các phiên phát triển tiếp theo

> Dự án `lms-edtech-platform` là ứng dụng full-stack Next.js/React/TypeScript dùng Supabase, được xây dựng ban đầu cho trung tâm tiếng Anh với bốn portal admin, teacher, student, parent. Đã có source cho lớp/ghi danh, học liệu dạng cây, bài tập/kiểm tra, điểm danh, phụ huynh, thông báo, học phí và Gemini hỗ trợ phân tích. Mục tiêu được chủ dự án xác nhận ngày 24/09/2026 là nâng cấp thành LMS cho trường phổ thông: tiểu học, THCS, THPT. Cần kế thừa luồng dạy–học–phản hồi và bổ sung năm học/học kỳ, môn/khối, lớp hành chính khác lớp theo môn, phân công giáo viên và quyền theo phạm vi. Workspace tại lần rà soát thiếu bộ migration/types/store đã được tài liệu nhắc đến; typecheck có ba lỗi thiếu module; một số action/API dùng admin client chưa kiểm quyền đầy đủ. Chưa xác minh schema/RLS production hoặc nghiệm thu E2E. Ưu tiên nền tảng dữ liệu và quyền, sau đó học vụ phổ thông và pilot; AI là công cụ hỗ trợ có giáo viên duyệt. BKT/Isolation Forest là hướng nghiên cứu chưa được chứng minh đã triển khai. Mọi phát triển tiếp theo cần kiểm tra lại trạng thái source thay vì mặc định những ghi nhận ngày 24/09/2026 còn nguyên.

## 14. Bản đồ tài liệu và source để tiếp tục làm việc

| Cần tìm hiểu | Nguồn nên đọc | Lưu ý |
|---|---|---|
| Định hướng sản phẩm | [xác nhận LMS K12](XAC_NHAN_THAY_DOI_DINH_HUONG_SAN_PHAM_LMS_K12.docx), tài liệu rà soát này | Đây là nguồn bối cảnh sản phẩm hiện hành |
| Kiến trúc và quy tắc | [ARCHITECTURE](ARCHITECTURE.md), [SYSTEM_RULES](SYSTEM_RULES.md) | Đối chiếu lại đường dẫn, role và phần triển khai với source hiện tại |
| Dữ liệu | [DB_SCHEMA](DB_SCHEMA.md), [snapshot schema](DB_SCHEMA_SNAPSHOT_2026-09-24.md), [học vụ](../lib/actions/academic.ts) | Tài liệu không thay thế migration và schema database đang chạy |
| Quy trình chi tiết | Nhóm `FEATURE_*.md`, `GUIDE_*.md` và [can thiệp sớm](STUDENT_EARLY_INTERVENTION_FLOW.md) | Đây là đặc tả làm việc; cần nghiệm thu với code và dữ liệu thật |
| Học liệu và đánh giá | [courseBuilder](../lib/actions/courseBuilder.ts), [resourceBank](../lib/actions/resourceBank.ts), [homework](../lib/actions/homework.ts), [exam](../lib/actions/exam.ts), [admin-grades](../lib/actions/admin-grades.ts) | Điểm bắt đầu chuẩn hóa chương trình, đề và sổ đánh giá |
| Lịch và chuyên cần | [schedule](../lib/actions/schedule.ts), [class-sessions](../lib/actions/class-sessions.ts), [attendance](../lib/actions/attendance.ts), [teacher-leave](../lib/actions/teacher-leave.ts) | Chuẩn hóa liên kết buổi/tiết và lịch sử phân công |
| Phụ huynh và phản hồi | [parentStudent](../lib/actions/parentStudent.ts), [parent-progress](../lib/actions/parent-progress.ts), [grade-notifications](../lib/actions/grade-notifications.ts) | Kiểm tra quyền nhất quán và trạng thái công bố |
| AI và dữ liệu hành vi | [gemini](../lib/gemini.ts), [behavior-analysis](../lib/actions/behavior-analysis.ts), [activity API](../app/api/activity/log/route.ts), [can thiệp sớm](STUDENT_EARLY_INTERVENTION_FLOW.md) | Chuẩn hóa dữ liệu trước tăng mức tự động hóa |
| Kiểm thử/vận hành | [TEST_PLAN](TEST_PLAN.md), [SECURITY_CHECKLIST](SECURITY_CHECKLIST.md), [DEPLOYMENT](DEPLOYMENT.md) | Các checklist là việc phải xác minh, không phải chứng cứ đã đạt |

Tài liệu này bổ sung góc nhìn **source hiện tại → khoảng trống → mục tiêu LMS phổ thông**. Các tài liệu cũ được giữ để truy nguyên bối cảnh; lần làm việc này chỉ tạo bản rà soát, chưa thay đổi chức năng ứng dụng hoặc cơ sở dữ liệu.
