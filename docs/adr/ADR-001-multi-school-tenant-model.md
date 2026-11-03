# ADR-001: Mô hình trường học và phạm vi Tenant (Multi-Tenancy Readiness)

## 1. Trạng thái
**Được chấp thuận (Accepted)** — Áp dụng làm kiến trúc nền tảng từ Phase 0 đến Phase 2.

## 2. Bối cảnh
- Hệ thống hiện tại (`lms-edtech-platform`) ban đầu được thiết kế theo hướng nền tảng trung tâm/khóa học tự do, không có khái niệm `school_id` trong hầu hết các bảng dữ liệu lõi (`users`, `classes`, `courses`, `exams`, `homework`, `attendance`).
- Định hướng sản phẩm mới đã được phê duyệt (xem `XAC_NHAN_THAY_DOI_DINH_HUONG_SAN_PHAM_LMS_K12.docx`) là tập trung vào trường phổ thông K12, với thí điểm đầu tiên tại một trường THCS.
- Dù pilot chỉ tại 1 trường THCS, kiến trúc cơ sở dữ liệu và bảo mật phải sẵn sàng hỗ trợ mô hình đa trường (multi-tenancy) để tránh đập đi xây lại khi mở rộng sau pilot.

## 3. Quyết định
1. **Bổ sung bảng `schools` và `school_memberships`:** Mỗi trường học là một tenant độc lập với mã trường duy nhất (`code`), tên, địa chỉ, trạng thái hoạt động.
2. **Nguyên tắc mọi dữ liệu có chủ sở hữu:** Mọi bảng học vụ nghiệp vụ (`academic_years`, `terms`, `grade_levels`, `subjects`, `homerooms`, `classes`, `homework`, `exams`, `attendance`, `student_activity_logs`) phải có cột `school_id` trực tiếp hoặc có quan hệ Foreign Key bắt buộc dẫn về trường học.
3. **Chiến lược di chuyển (Migration Strategy):**
   - Không ép `school_id NOT NULL` ngay lập tức trên các bảng đang có dữ liệu thật.
   - Giai đoạn 1: Thêm `school_id` nullable, gán dữ liệu hiện có về trường thí điểm (`school_id` mặc định).
   - Giai đoạn 2: Đối soát dữ liệu mồ côi (`unmapped = 0`), sau đó mới áp đặt ràng buộc `NOT NULL` và khóa ngoại.
4. **Phân quyền Server-Side:** Không tin cậy `school_id` gửi từ client trình duyệt. Mọi Server Action và API endpoint đều suy ra `school_id` từ phiên đăng nhập (session) của người dùng thông qua `ActorContext`.

## 4. Hệ quả
- **Tích cực:** Cách ly dữ liệu triệt để giữa các trường; ngăn chặn hoàn toàn việc rò rỉ hoặc truy vấn chéo dữ liệu học sinh giữa các đơn vị.
- **Tiêu cực:** Các truy vấn và báo cáo cần thêm điều kiện lọc theo `school_id`; cần thêm chỉ mục kết hợp `(school_id, ...)` để đảm bảo hiệu năng.
