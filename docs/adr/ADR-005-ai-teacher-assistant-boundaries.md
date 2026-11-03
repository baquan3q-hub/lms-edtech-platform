# ADR-005: Giới hạn nghiệp vụ và kiến trúc AI hỗ trợ giáo viên (AI Assistant Boundaries)

## 1. Trạng thái
**Được chấp thuận (Accepted)** — Thực thi chính thức trong Phase 6 (M9).

## 2. Bối cảnh
- Các tính năng AI hiện tại trong hệ thống (sử dụng Google Gemini API) bao gồm: sinh câu hỏi trắc nghiệm, phân tích bài kiểm tra lớp/cá nhân, phân tích hành vi học tập, gửi nhận xét.
- Trong môi trường giáo dục phổ thông K12:
  - AI không được phép tự động ra quyết định điểm số, kỷ luật, đánh giá hạnh kiểm hay gửi thông báo trực tiếp đến phụ huynh/học sinh mà thiếu sự kiểm duyệt của con người.
  - Nguy cơ cạn kiệt hạn ngạch API (quota limits / HTTP 429) hoặc thời gian phản hồi AI chậm có thể làm tê liệt toàn bộ luồng nộp/chấm bài của nhà trường.
  - Dữ liệu định danh cá nhân học sinh (PII) cần được bảo vệ, tránh gửi trực tiếp vào các mô hình AI ngoài.

## 3. Quyết định
1. **Nguyên tắc "AI tạo nháp - Con người phê duyệt" (Human-in-the-loop):**
   - AI chỉ đóng vai trò trợ lý hỗ trợ giáo viên thực hiện 3 tác vụ chính trong phạm vi pilot:
     1. Sinh bản nháp câu hỏi ôn tập theo chuẩn kiến thức.
     2. Gợi ý bản nháp nhận xét bài làm của học sinh.
     3. Đề xuất phương án can thiệp sớm cho học sinh có nguy cơ dựa trên dữ liệu học tập thực tế.
   - 100% nội dung do AI tạo ra đều ở trạng thái `draft` trong bảng `learning_ai_jobs`. Giáo viên phải xem, chỉnh sửa và bấm "Duyệt" thì nội dung mới được phát hành tới học sinh hoặc phụ huynh.
2. **Kiến trúc bất đồng bộ (Asynchronous Job Queue):**
   - Các tác vụ AI được xử lý qua hàng đợi sự kiện / bảng job có cơ chế thử lại (retry backoff), kiểm soát hạn ngạch và timeout.
   - Thao tác nộp bài của học sinh và ghi điểm của giáo viên được lưu trữ trực tiếp vào cơ sở dữ liệu gốc, hoàn toàn không phụ thuộc vào trạng thái hoạt động của AI.
3. **Cơ chế ngắt mạch an toàn (Fail-safe & Feature Flags):**
   - Hệ thống có cờ cấu hình tắt AI (`AI_ENABLED=false`) theo từng trường học. Khi AI tắt hoặc gặp sự cố, 100% quy trình dạy, học, nộp bài và chấm bài thủ công tiếp tục hoạt động bình thường mà không phát sinh lỗi.
4. **Bảo mật và kiểm toán dữ liệu (AI Auditability):**
   - Loại bỏ họ tên, số điện thoại, thông tin định danh cá nhân trước khi truyền vào prompt AI (chỉ truyền ID giả danh hoặc đặc tính học tập).
   - Lưu trữ đầy đủ: phiên bản mô hình, mã băm prompt (`prompt_version`), mã băm dữ liệu đầu vào (`source_hash`), thời gian thực thi, chi phí token và ID giáo viên phê duyệt.

## 4. Hệ quả
- **Tích cực:** Đảm bảo an toàn đạo đức và trách nhiệm sư phạm; loại bỏ hoàn toàn nguy cơ downtime hệ thống khi bên thứ ba gặp sự cố AI.
- **Tiêu cực:** Giáo viên phải thực hiện thêm bước duyệt nháp; cần thiết kế giao diện so sánh trước/sau khi giáo viên biên tập lại nội dung AI.
