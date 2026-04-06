# 👨‍👩‍👧 Hướng dẫn: Định danh Phụ huynh - Học sinh
> Tài liệu này hướng dẫn bạn đặt câu lệnh cho Antigravity từng bước để build hệ thống liên kết Phụ huynh ↔ Học sinh

---

## 🧠 Hiểu vấn đề trước khi làm

```
Vấn đề cốt lõi:
Phụ huynh A cần xem được dữ liệu của con mình (Student B)
nhưng KHÔNG được xem dữ liệu của học sinh khác.

Giải pháp:
Tạo một bảng trung gian "parent_students"
để ghi lại ai là phụ huynh của ai.

    users (role: parent)          users (role: student)
         Nguyễn Văn A    ←──────→    Nguyễn Thị B
         (phụ huynh)    parent_      (học sinh)
                        students
```

---

## 🔑 3 Cách định danh phụ huynh - học sinh

### Cách 1: Mã liên kết (Invite Code) ✅ Khuyến nghị
```
Admin/Teacher tạo ra mã 6 số → gửi cho phụ huynh
Phụ huynh nhập mã khi đăng ký → tự động liên kết với con
Ví dụ: "Mã liên kết của em Nguyễn Thị B là: AB1234"
```
**Ưu điểm:** Đơn giản, phụ huynh tự làm được, bảo mật tốt

### Cách 2: Admin ghép thủ công
```
Admin vào dashboard → chọn học sinh → chọn phụ huynh → bấm liên kết
```
**Ưu điểm:** Kiểm soát tuyệt đối, không cần phụ huynh làm gì

### Cách 3: Kết hợp cả hai ✅ Tốt nhất
```
Admin ghép sẵn + Phụ huynh cũng có thể tự nhập mã
```

---

## 📋 Các bước triển khai & Câu lệnh cho Antigravity

---

### BƯỚC 1 — Tạo Database

**Câu lệnh bạn gõ vào Antigravity:**
```
Đọc README.md trước.

Tạo Supabase migration với nội dung sau:

1. Bảng "parent_students":
   - id (uuid, primary key)
   - parent_id (uuid, references users.id)
   - student_id (uuid, references users.id)
   - relationship (text) -- "Bố", "Mẹ", "Ông", "Bà", "Người giám hộ"
   - is_primary (boolean, default true) -- phụ huynh chính hay phụ
   - created_at (timestamp)
   - Ràng buộc: cặp (parent_id, student_id) phải unique

2. Thêm cột vào bảng users:
   - invite_code (text, unique) -- mã 6 ký tự để phụ huynh nhập
   - invite_code_expires_at (timestamp)

3. Tạo Row Level Security:
   - Parent chỉ đọc được dữ liệu của student có trong bảng parent_students của họ
   - Student không đọc được bảng parent_students
   - Admin đọc và ghi được tất cả

Tạo file migration trong thư mục supabase/migrations/
```

---

### BƯỚC 2 — Tạo trang Admin ghép phụ huynh - học sinh

**Câu lệnh bạn gõ vào Antigravity:**
```
Tạo trang admin tại app/admin/students/link-parent/page.tsx

Trang này cho phép Admin liên kết phụ huynh với học sinh.

Giao diện gồm:
1. Bảng danh sách học sinh (tên, email, lớp học, số phụ huynh đã liên kết)
2. Khi click vào một học sinh → mở Dialog với:
   - Thông tin học sinh
   - Danh sách phụ huynh đang liên kết (nếu có)
   - Nút "Thêm phụ huynh" → cho phép tìm kiếm và chọn user có role parent
   - Dropdown chọn mối quan hệ: Bố / Mẹ / Ông / Bà / Người giám hộ
   - Nút "Xóa liên kết" cho từng phụ huynh

3. Nút "Tạo mã liên kết" cho từng học sinh:
   - Sinh mã 6 ký tự ngẫu nhiên (chữ hoa + số)
   - Hiển thị mã và nút copy
   - Mã hết hạn sau 7 ngày

Dùng shadcn/ui components: Table, Dialog, Button, Select, Badge
Fetch data từ Supabase, dùng Server Components cho danh sách chính.
```

---

### BƯỚC 3 — Tạo luồng phụ huynh tự nhập mã

**Câu lệnh bạn gõ vào Antigravity:**
```
Tạo trang cho phụ huynh nhập mã liên kết tại:
app/parent/link-student/page.tsx

Giao diện gồm:
1. Phần "Con em đã liên kết":
   - Hiển thị danh sách các học sinh đã liên kết (ảnh, tên, lớp)
   - Nút "Xóa liên kết" cho từng em

2. Phần "Thêm con em mới":
   - Input nhập mã 6 ký tự (tự động uppercase khi gõ)
   - Nút "Xác nhận liên kết"
   - Khi nhập mã đúng → hiển thị thông tin học sinh để xác nhận
     ("Bạn có muốn liên kết với học sinh: Nguyễn Thị B - Lớp 10A không?")
   - Dropdown chọn mối quan hệ: Bố / Mẹ / Ông / Bà / Người giám hộ
   - Nút "Xác nhận" → lưu vào bảng parent_students

3. Xử lý lỗi:
   - Mã không tồn tại → "Mã liên kết không hợp lệ"
   - Mã hết hạn → "Mã đã hết hạn, vui lòng liên hệ nhà trường"
   - Đã liên kết rồi → "Bạn đã liên kết với học sinh này"

Logic xử lý trong app/api/parent/link-student/route.ts
Dùng shadcn/ui: Card, Input, Button, Alert, Avatar
```

---

### BƯỚC 4 — Tạo Dashboard Phụ huynh

**Câu lệnh bạn gõ vào Antigravity:**
```
Tạo dashboard cho phụ huynh tại app/parent/dashboard/page.tsx

Phụ huynh có thể có nhiều con. Giao diện gồm:

1. Tabs chọn con (nếu có nhiều con):
   - Mỗi tab là tên + ảnh của một học sinh
   - Mặc định chọn con đầu tiên

2. Khi chọn một học sinh, hiển thị 4 sections:

   Section A - Tổng quan:
   - Điểm trung bình tháng này
   - Số buổi đi học / tổng số buổi
   - Số bài tập đã nộp / tổng số bài
   - Xếp hạng trong lớp (nếu có)

   Section B - Điểm số gần đây:
   - Bảng 10 bài kiểm tra gần nhất
   - Cột: Tên bài, Lớp, Điểm, Ngày, Nhận xét của giáo viên

   Section C - Lịch sử điểm danh:
   - Calendar view tháng hiện tại
   - Màu xanh = có mặt, đỏ = vắng, vàng = vắng có phép

   Section D - Thông báo từ giáo viên:
   - Danh sách thông báo mới nhất
   - Badge "Mới" cho thông báo chưa đọc

Fetch data từ Supabase, chỉ lấy data của các student
có trong bảng parent_students của parent đang đăng nhập.
Dùng RLS để đảm bảo bảo mật.
Dùng shadcn/ui: Tabs, Card, Table, Badge, Calendar
```

---

### BƯỚC 5 — Bảo mật & Kiểm tra

**Câu lệnh bạn gõ vào Antigravity:**
```
Kiểm tra và đảm bảo bảo mật cho hệ thống phụ huynh - học sinh:

1. Tạo middleware tại middleware.ts:
   - User có role "parent" chỉ được vào /parent/* routes
   - User có role "student" chỉ được vào /student/* routes
   - Redirect về /unauthorized nếu cố vào route không đúng role

2. Tạo helper function tại lib/supabase/parent-guard.ts:
   - Function: canParentViewStudent(parentId, studentId) → boolean
   - Query bảng parent_students để kiểm tra
   - Dùng function này ở mọi API route liên quan đến parent

3. Test cases cần kiểm tra:
   - Phụ huynh A KHÔNG xem được điểm của học sinh B (không phải con mình)
   - Phụ huynh A XEM ĐƯỢC điểm của học sinh C (là con mình)
   - Học sinh không vào được /parent/* routes

Thêm error page tại app/unauthorized/page.tsx
với thông báo "Bạn không có quyền truy cập trang này"
```

---

## 🗺️ Sơ đồ tổng thể sau khi build xong

```
ADMIN
  └── Tạo mã liên kết cho học sinh
  └── Ghép thủ công phụ huynh ↔ học sinh
        ↓
PHỤ HUYNH đăng ký
  └── Nhập mã 6 số → xác nhận → liên kết thành công
        ↓
PHỤ HUYNH đăng nhập
  └── Chọn con (nếu nhiều con)
  └── Xem điểm / điểm danh / thông báo của con
  └── Chỉ thấy data của con mình (RLS bảo vệ)
```

---

## ⚠️ Lưu ý quan trọng khi làm

Sau mỗi bước, test ngay trước khi qua bước tiếp theo bằng cách hỏi Antigravity:

> *"Tạo dữ liệu test: 1 admin, 2 phụ huynh, 3 học sinh.
> Phụ huynh 1 có 2 con, Phụ huynh 2 có 1 con.
> Chèn vào Supabase để tôi test"*

---

*Tài liệu này dùng kết hợp với README.md và FEATURE_LESSON_BUILDER.md*
