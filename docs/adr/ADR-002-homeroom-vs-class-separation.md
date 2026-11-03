# ADR-002: Tách biệt Lớp chủ nhiệm (Homeroom) và Lớp môn học (Subject Class)

## 1. Trạng thái
**Được chấp thuận (Accepted)** — Thực thi chính thức trong Phase 2 (M3–M4).

## 2. Bối cảnh
- Trong mô hình giáo dục phổ thông Việt Nam (K12), tồn tại sự phân biệt bản chất giữa:
  1. **Lớp hành chính / Lớp chủ nhiệm:** Học sinh gắn bó cả năm học (ví dụ: Lớp 6A1, 7B2), do một Giáo viên chủ nhiệm phụ trách, quản lý nề nếp, chuyên cần, sinh hoạt và liên lạc gia đình.
  2. **Lớp bộ môn:** Học sinh học theo từng môn cụ thể (Toán, Văn, Anh, Tin, Thể dục), do Giáo viên bộ môn giảng dạy và chấm điểm.
- Trong mã nguồn hiện tại:
  - Bảng `courses` đang bị dùng sai mục đích để biểu diễn Khối học (Grade level).
  - Bảng `classes` bị lẫn lộn giữa lớp chủ nhiệm và lớp môn học, dẫn đến việc không thể hiện được trường hợp một học sinh học nhiều môn với nhiều giáo viên khác nhau, hoặc chuyển lớp môn mà không đổi lớp chủ nhiệm.

## 3. Quyết định
1. **Bảng `homerooms` cho lớp hành chính:**
   - Liên kết với `academic_year_id`, `grade_level_id`, `school_id`.
   - Quản lý học sinh thông qua `homeroom_enrollments` (`student_id`, `homeroom_id`, `valid_from`, `valid_to`, `status`).
   - Quản lý giáo viên chủ nhiệm qua `homeroom_teacher_assignments`.
2. **Bảng `classes` cho lớp học theo môn:**
   - Liên kết với `subject_id`, `term_id`, `school_id`.
   - Một lớp môn học có thể gắn với một lớp chủ nhiệm hoặc nhiều học sinh từ các lớp khác nhau (lớp chọn, câu lạc bộ).
   - Giáo viên bộ môn được phân công qua `class_teacher_assignments`.
3. **Đưa `courses` về đúng ý nghĩa học liệu / chương trình:**
   - `courses` đại diện cho khung chương trình, bộ bài học, cây học liệu có thể tái sử dụng qua nhiều năm học, không đại diện cho khối học hay lớp hành chính.
4. **Bảo toàn lịch sử:** Chuyển lớp hoặc sang năm học mới tạo bản ghi mới có khoảng hiệu lực (`valid_from` - `valid_to`), không xóa đè lịch sử bài nộp, điểm và điểm danh cũ.

## 4. Hệ quả
- **Tích cực:** Mô hình phản ánh chính xác 100% nghiệp vụ trường học Việt Nam; giáo viên chủ nhiệm xem được tổng thể mà không can thiệp sửa điểm của giáo viên bộ môn.
- **Tiêu cực:** Phức tạp hóa sơ đồ thực thể; cần cập nhật giao diện admin xếp lớp và báo cáo.
