# ADR-004: Mô hình đánh giá nội bộ K12 (Internal Assessment vs Legal Transcripts)

## 1. Trạng thái
**Được chấp thuận (Accepted)** — Thực thi chính thức trong Phase 4 (M6).

## 2. Bối cảnh
- Hệ thống LMS K12 phục vụ học tập sau giờ lên lớp, giao và nộp bài tập, kiểm tra củng cố kiến thức và phối hợp giữa nhà trường với gia đình.
- Theo quy định pháp lý của Bộ Giáo dục và Đào tạo (Thông tư 22/2021/TT-BGDĐT), Sổ điểm điện tử và Học bạ chính thức đòi hỏi quy trình ký số, lưu trữ pháp lý, xếp loại hạnh kiểm/học lực và quản trị chuyên biệt (thuộc hệ thống SIS - School Information System).
- Nếu định vị LMS là hệ thống học bạ pháp lý ngay trong giai đoạn pilot sẽ tạo rủi ro pháp lý và gánh nặng tuân thủ vượt quá phạm vi dự án.

## 3. Quyết định
1. **Phạm vi đánh giá nội bộ:**
   - Điểm số trong hệ thống LMS là **đánh giá quá trình và nội bộ (formative assessment)**, phục vụ việc nắm bắt năng lực học tập của học sinh, không thay thế sổ điểm điện tử hoặc học bạ pháp lý.
2. **Quy tắc trạng thái điểm và bài tập:**
   - Phân biệt rõ ràng giữa `score = null` (chưa chấm) và `score = 0` (đã chấm được 0 điểm).
   - Bài tập/đề thi có vòng đời rõ: `draft` (nháp) -> `published` (đã công bố) -> `closed` (đã đóng).
   - Điểm số có trạng thái: `ungraded` -> `draft` -> `published` -> `locked`. Học sinh và phụ huynh chỉ được xem điểm khi giáo viên đã chuyển sang `published`.
3. **Bất biến của đề kiểm tra (Exam Snapshot) và hỗ trợ đa lượt làm:**
   - Khi học sinh bắt đầu làm bài thi (`exam_attempts`), hệ thống chụp một bản snapshot bất biến của bộ câu hỏi và đáp án tại thời điểm đó. Giáo viên sửa đề sau thời điểm này không làm ảnh hưởng bài làm đang diễn ra.
   - Bảng `exam_attempts` lưu số lượt làm bài `attempt_no` với cấu hình `max_attempts` (mặc định là 1 lượt đối với bài kiểm tra chính thức).
   - Autosave bài thi sử dụng số phiên bản tăng dần (`draft_version`), từ chối ghi đè bản cũ lên bản mới.
4. **Kiểm toán điều chỉnh điểm (Grade Audit Log):** Mọi thao tác sửa điểm sau khi đã công bố phải ghi lại người sửa, điểm cũ, điểm mới, thời gian và lý do sửa vào bảng audit.

## 4. Hệ quả
- **Tích cực:** Giảm thiểu rủi ro pháp lý; minh bạch toàn bộ quá trình giao - làm - chấm bài; chống gian lận nộp bài và mất dữ liệu khi rớt mạng.
- **Tiêu cực:** Cần xây dựng màn hình xem lịch sử sửa điểm và giao diện công bố điểm riêng biệt cho giáo viên.
