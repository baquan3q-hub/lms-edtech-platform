# CẨM NANG HƯỚNG DẪN SỬ DỤNG DÀNH CHO GIÁO VIÊN (TEACHER PLAYBOOK)
**Dự án:** LMS EdTech Platform — Hệ thống Quản trị Học tập K12  
**Đối tượng:** Giáo viên Bộ môn & Giáo viên Chủ nhiệm THCS (Khối 6–9)  
**Trường thí điểm:** Trường THCS Nguyễn Du  
**Phiên bản:** 1.0 (Phase 8 Pilot)  

---

## 1. TỔNG QUAN VAI TRÒ & PHÂN QUYỀN
Hệ thống LMS EdTech Platform K12 phân tách rành mạch hai vai trò chuyên môn của giáo viên:

| Vai trò | Phạm vi quản lý | Quyền hạn chính |
|---|---|---|
| **Giáo viên Chủ nhiệm (Homeroom Teacher)** | Lớp hành chính được phân công (Ví dụ: Lớp 8A) | - Điểm danh học sinh theo ngày/tiết học.<br>- Tiếp nhận và phê duyệt đơn xin nghỉ học của phụ huynh.<br>- Xem báo cáo học lực và chuyên cần tổng hợp của cả lớp.<br>- Phê duyệt và theo dõi các trường hợp hỗ trợ can thiệp sớm. |
| **Giáo viên Bộ môn (Subject Teacher)** | Lớp bộ môn đang giảng dạy (Ví dụ: Toán 8A, Văn 8A) | - Biên soạn bài giảng, tạo kho học liệu theo chủ đề.<br>- Giao bài tập về nhà và tạo đề kiểm tra trực tuyến.<br>- Thiết lập ma trận Rubric đánh giá nội bộ.<br>- Chấm bài, ghi nhận xét và công bố điểm cho học sinh. |

---

## 2. QUY TRÌNH GIAO BÀI TẬP VỀ NHÀ & ĐỀ KIỂM TRA

### 2.1. Giao bài tập về nhà (Homework)
1. Truy cập menu **"Lớp học của tôi"** $\rightarrow$ Chọn lớp bộ môn tương ứng.
2. Chuyển sang tab **"Bài tập"** $\rightarrow$ Bấm **"Tạo bài tập mới"**.
3. Điền các trường thông tin:
   - **Tiêu đề:** Tên bài tập (Ví dụ: *Bài tập Đại số: Hằng đẳng thức đáng nhớ*).
   - **Hạn nộp (Deadline):** Thời điểm hệ thống tự động khóa nhận bài nộp (Được tính chuẩn theo giờ máy chủ).
   - **Tài liệu đính kèm (nếu có):** Tải file PDF/Word đề bài lên kho lưu trữ an toàn.
4. Bấm **"Công bố bài tập"** để học sinh trong lớp nhận được thông báo ngay lập tức.

### 2.2. Tạo bài kiểm tra trắc nghiệm & tự luận (Exam)
1. Tại màn hình lớp học, bấm **"Tạo đề kiểm tra"**.
2. Thiết lập thông số đề thi:
   - **Thời gian làm bài:** Ví dụ 45 phút.
   - **Số lượt làm bài tối đa (`max_attempts`):** Mặc định 1 lượt (có thể cấu hình 2–3 lượt cho bài kiểm tra rèn luyện).
   - **Trộn câu hỏi / đảo phương án:** Bật cờ ngẫu nhiên để chống nhìn bài trong phòng máy.
3. Nhập câu hỏi: Giáo viên có thể tự nhập tay hoặc sử dụng nút **"Trợ lý AI hỗ trợ soạn câu hỏi nháp"**.

---

## 3. QUY TRÌNH CHẤM ĐIỂM & ĐÁNH GIÁ THEO RUBRIC

> [!IMPORTANT]
> **Quy định đánh giá nội bộ:** Điểm số và nhận xét trên hệ thống LMS phục vụ cho hoạt động học tập sau giờ lên lớp, hỗ trợ rèn luyện cá nhân hóa, **không thay thế sổ điểm và học bạ điện tử chính thức của Bộ Giáo dục và Đào tạo**.

### 3.1. Chấm điểm theo Rubric
1. Mở danh sách nộp bài tại mục **"Chấm bài"**.
2. Chọn bài làm của học sinh. Màn hình chia đôi hiển thị: Bài làm của học sinh bên trái và Bảng tiêu chí Rubric bên phải.
3. Giáo viên chấm từng tiêu chí (Ví dụ: *Độ chính xác kiến thức: 5 điểm, Kỹ năng trình bày: 3 điểm, Sáng tạo: 2 điểm*).
4. Nhập nhận xét mang tính khích lệ, hướng dẫn học sinh cách khắc phục lỗi sai.
5. Bài sau khi chấm sẽ lưu ở trạng thái **Bản nháp (`draft`)**. Học sinh và phụ huynh chưa xem được cho đến khi giáo viên sẵn sàng.

### 3.2. Công bố điểm số (`published`)
- Sau khi chấm xong toàn bộ bài làm của cả lớp, giáo viên bấm **"Công bố điểm cho cả lớp"**.
- Trạng thái chuyển sang **`published`**, hệ thống tự động gửi thông báo đến tài khoản học sinh và phụ huynh.

### 3.3. Điều chỉnh điểm sau khi đã công bố
- Nếu học sinh có đơn phúc khảo hoặc giáo viên chấm bù bước làm:
  - Bấm vào điểm số cần sửa $\rightarrow$ Nhập điểm mới.
  - **Bắt buộc:** Nhập **"Lý do điều chỉnh điểm"** (Tối thiểu 5 ký tự).
  - Hệ thống ghi lại toàn bộ lịch sử điểm cũ, điểm mới, người sửa và lý do vào nhật ký kiểm toán `audit_events`.

---

## 4. QUY TRÌNH ĐIỂM DANH & DUYỆT ĐƠN NGHỈ HỌC

### 4.1. Điểm danh buổi học (Dành cho GVCN và GVBM)
1. Mở menu **"Điểm danh"** $\rightarrow$ Chọn ngày học và buổi học.
2. Danh sách học sinh hiển thị với 4 trạng thái:
   - 🟢 **Có mặt** (Mặc định).
   - 🟡 **Đi muộn** (Ghi nhận số phút đi trễ).
   - 🔵 **Nghỉ có phép** (Tự động liên kết nếu đã duyệt đơn xin nghỉ).
   - 🔴 **Nghỉ không phép**.
3. Bấm **"Lưu điểm danh"** (Thời gian xử lý: < 1 giây cho cả lớp 45 học sinh).

### 4.2. Duyệt đơn xin nghỉ học từ phụ huynh
1. Vào mục **"Đơn xin nghỉ học"**.
2. Đọc lý do nghỉ và thời gian xin phép của phụ huynh.
3. Chọn **"Phê duyệt"** hoặc **"Từ chối"** (kèm lý do phản hồi).
4. Khi duyệt thành công, hệ thống tự động gán trạng thái *Nghỉ có phép* vào bảng điểm danh ngày tương ứng.

---

## 5. CƠ CHẾ SỬ DỤNG TRỢ LÝ AI CÓ KIỂM SOÁT (HUMAN-IN-THE-LOOP)

Hệ thống tích hợp AI với nguyên tắc **"Giáo viên là người quyết định cuối cùng (Human-in-the-loop)"**:

1. **AI Soạn thảo câu hỏi nháp:**
   - Giáo viên nhập chủ đề (ví dụ: *Phương trình bậc nhất một ẩn*).
   - AI sinh bản nháp 5 câu hỏi kèm 4 phương án lựa chọn và lời giải mẫu.
   - **Giáo viên phải rà soát, chỉnh sửa câu chữ** trước khi bấm "Lưu vào đề thi".
2. **AI Gợi ý nhận xét Rubric:**
   - AI phân tích bài làm và gợi ý khung nhận xét điểm mạnh/điểm yếu.
   - AI **không bao giờ tự gửi cho học sinh**.
   - Giáo viên duyệt nguyên bản, chỉnh sửa bổ sung, hoặc bấm "Bác bỏ" nếu không phù hợp.
3. **AI Gợi ý can thiệp sớm (Early Intervention):**
   - AI phát hiện học sinh nghỉ quá 3 buổi hoặc điểm bài tập dưới 5.0 để đề xuất kế hoạch phụ đạo.
   - Giáo viên chủ nhiệm tiếp nhận, phân công giáo viên bộ môn kèm cặp và liên hệ phụ huynh.
