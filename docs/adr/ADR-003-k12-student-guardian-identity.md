# ADR-003: Định danh tài khoản học sinh và phụ huynh trong trường phổ thông

## 1. Trạng thái
**Được chấp thuận (Accepted)** — Thực thi chính thức trong Phase 3 (M5).

## 2. Bối cảnh
- Học sinh cấp THCS (khối 6–9) phần lớn chưa có hộp thư điện tử cá nhân độc lập và việc bắt buộc email cá nhân gây rào cản lớn khi triển khai diện rộng tại trường học.
- Phụ huynh học sinh thường liên lạc bằng số điện thoại, một phụ huynh có thể có 2 hoặc nhiều con học tại cùng trường hoặc khác khối.
- Quy trình cấp tài khoản truyền thống bằng email kích hoạt không khả thi đối với môi trường trường công lập/dân lập Việt Nam.

## 3. Quyết định
1. **Đăng nhập bằng mã định danh trường học:**
   - Học sinh đăng nhập bằng bộ ba: `Mã trường` + `Mã học sinh (student_code)` + `Mật khẩu`.
   - Phía server ánh xạ sang email ảo nội bộ cho Supabase Auth: `<student_code>@<school_code>.internal.edu.vn`.
   - `student_code` là duy nhất trong phạm vi trường (`UNIQUE(school_id, student_code)`).
2. **Quy trình kích hoạt và mật khẩu tạm:**
   - Khi import danh sách từ Excel, tài khoản được tạo với mật khẩu tạm thống nhất (ví dụ: `abc123`).
   - Kèm theo mỗi tài khoản là một `mã kích hoạt một lần` (activation code). Mã này được lưu trữ dạng **băm mật mã (hash)** trong cơ sở dữ liệu (`account_activations`), có thời hạn và số lần thử giới hạn.
   - Khi đăng nhập lần đầu bằng mật khẩu tạm, hệ thống chỉ cho phép truy cập màn hình kích hoạt; bắt buộc nhập đúng mã kích hoạt và đổi mật khẩu mới trước khi cấp quyền truy cập dữ liệu học vụ.
3. **Định danh phụ huynh và liên kết giám hộ:**
   - Phụ huynh sử dụng số điện thoại hoặc email.
   - Quan hệ phụ huynh - học sinh được quản lý qua bảng `parent_students` với trạng thái xác minh (`pending`, `verified`, `revoked`).
   - Một phụ huynh có thể liên kết nhiều học sinh; một học sinh có thể có nhiều người giám hộ đã xác minh (Bố, Mẹ, Người giám hộ hợp pháp).

## 4. Hệ quả
- **Tích cực:** Triển khai onboarding hàng loạt qua Excel chỉ trong vài phút; học sinh không cần tự tạo email; bảo mật cao nhờ mã kích hoạt riêng biệt.
- **Tiêu cực:** Cần xây dựng quy trình in phiếu bàn giao mã kích hoạt cho phụ huynh/học sinh; cần cơ chế reset tài khoản có audit log khi học sinh quên mật khẩu.
