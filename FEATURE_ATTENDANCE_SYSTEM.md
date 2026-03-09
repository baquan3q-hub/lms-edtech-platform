# 📋 Feature Spec + Prompt Guide: Hệ thống Điểm danh
> Điểm danh điện tử — realtime, minh bạch, đa vai trò

---

## 🧠 Phân tích yêu cầu

```
Các vai trò và quyền hạn:

GIÁO VIÊN
├── Mở phiên điểm danh cho lớp
├── Điểm danh từng học sinh (Có mặt / Vắng / Trễ / Có phép)
├── Sửa điểm danh sau khi lưu (trong ngày)
├── Xem lịch sử điểm danh toàn lớp
└── Xuất file Excel/PDF báo cáo điểm danh

ADMIN
├── Xem điểm danh toàn bộ lớp, toàn bộ giáo viên
├── Sửa điểm danh bất kỳ
├── Báo cáo thống kê tổng hợp
└── Xuất báo cáo toàn trường

HỌC SINH
├── Xem lịch sử điểm danh của bản thân
├── Xem trạng thái buổi học hôm nay
└── Nhận thông báo khi bị điểm vắng

PHỤ HUYNH
├── Xem điểm danh của con theo ngày/tháng
├── Gửi đơn xin nghỉ (kèm lý do)
├── Theo dõi trạng thái đơn xin nghỉ
└── Nhận thông báo khi con vắng không phép
```

---

## 🗺️ Luồng hoạt động

```
LUỒNG ĐIỂM DANH CHÍNH:

1. Giáo viên mở lớp → Bấm "Bắt đầu điểm danh"
2. Danh sách học sinh hiện ra
3. Giáo viên tick từng em: ✅ Có mặt / ❌ Vắng / ⏰ Trễ / 📝 Có phép
4. Bấm "Lưu điểm danh"
5. Realtime: Admin + Phụ huynh + Học sinh nhận thông báo ngay

LUỒNG XIN NGHỈ:

1. Phụ huynh vào app → Tạo đơn xin nghỉ
   (chọn ngày, chọn con, nhập lý do, upload giấy tờ nếu có)
2. Giáo viên nhận thông báo → Duyệt hoặc từ chối
3. Nếu duyệt → buổi đó tự động điền "Có phép" khi điểm danh
4. Phụ huynh nhận thông báo kết quả
```

---

## 🗄️ Database Schema

```sql
-- Phiên điểm danh (mỗi buổi học = 1 session)
attendance_sessions (
  id            uuid PRIMARY KEY,
  class_id      uuid REFERENCES classes(id),
  teacher_id    uuid REFERENCES users(id),
  session_date  date NOT NULL,
  start_time    time,
  end_time      time,
  status        text,   -- 'open' | 'closed'
  note          text,
  created_at    timestamp DEFAULT now()
)

-- Chi tiết điểm danh từng học sinh
attendance_records (
  id            uuid PRIMARY KEY,
  session_id    uuid REFERENCES attendance_sessions(id),
  student_id    uuid REFERENCES users(id),
  status        text NOT NULL,
  -- 'present'  = Có mặt
  -- 'absent'   = Vắng không phép
  -- 'late'     = Đi trễ
  -- 'excused'  = Vắng có phép
  note          text,           -- ghi chú thêm
  marked_by     uuid REFERENCES users(id),
  marked_at     timestamp,
  updated_by    uuid REFERENCES users(id),
  updated_at    timestamp
)

-- Đơn xin nghỉ của phụ huynh
absence_requests (
  id              uuid PRIMARY KEY,
  parent_id       uuid REFERENCES users(id),
  student_id      uuid REFERENCES users(id),
  class_id        uuid REFERENCES classes(id),
  absence_date    date NOT NULL,
  reason          text NOT NULL,
  attachment_url  text,          -- file đính kèm nếu có
  status          text,
  -- 'pending'  = Chờ duyệt
  -- 'approved' = Đã duyệt
  -- 'rejected' = Từ chối
  reviewed_by     uuid REFERENCES users(id),
  reviewed_at     timestamp,
  reject_reason   text,          -- lý do từ chối nếu có
  created_at      timestamp DEFAULT now()
)
```

---

## 📋 PROMPT 1 — Tạo Database Migration

```
Đọc README.md trước.

Tạo Supabase migration file tại:
supabase/migrations/[timestamp]_attendance_system.sql

Tạo đúng 3 bảng sau:

1. attendance_sessions:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - class_id uuid REFERENCES classes(id) ON DELETE CASCADE
   - teacher_id uuid REFERENCES users(id)
   - session_date date NOT NULL
   - start_time time
   - end_time time
   - status text DEFAULT 'open' CHECK (status IN ('open','closed'))
   - note text
   - created_at timestamp DEFAULT now()
   - UNIQUE (class_id, session_date) -- mỗi lớp chỉ 1 buổi/ngày

2. attendance_records:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - session_id uuid REFERENCES attendance_sessions(id) ON DELETE CASCADE
   - student_id uuid REFERENCES users(id)
   - status text NOT NULL CHECK (status IN ('present','absent','late','excused'))
   - note text
   - marked_by uuid REFERENCES users(id)
   - marked_at timestamp DEFAULT now()
   - updated_by uuid REFERENCES users(id)
   - updated_at timestamp
   - UNIQUE (session_id, student_id)

3. absence_requests:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - parent_id uuid REFERENCES users(id)
   - student_id uuid REFERENCES users(id)
   - class_id uuid REFERENCES classes(id)
   - absence_date date NOT NULL
   - reason text NOT NULL
   - attachment_url text
   - status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
   - reviewed_by uuid REFERENCES users(id)
   - reviewed_at timestamp
   - reject_reason text
   - created_at timestamp DEFAULT now()

Row Level Security:
- Teacher: SELECT/INSERT/UPDATE attendance_sessions và records 
  của class mình dạy
- Student: SELECT attendance_records của bản thân
- Parent: SELECT records của con mình, 
  INSERT/UPDATE absence_requests của con mình
- Admin: Full access tất cả

Sau khi tạo migration, đọc lại và xác nhận syntax đúng.
```

---

## 📋 PROMPT 2 — Trang điểm danh cho Giáo viên

```
Tạo trang điểm danh cho giáo viên tại:
app/teacher/classes/[classId]/attendance/page.tsx

LAYOUT TỔNG THỂ:
- Header: Tên lớp + Ngày hôm nay + Badge trạng thái (Đang mở / Đã đóng)
- Body: Bảng danh sách học sinh
- Footer: Nút lưu

PHẦN HEADER TRANG:
- Tiêu đề: "Điểm danh — [Tên lớp]"
- Ngày: hiện ngày hôm nay, có nút chọn ngày khác (DatePicker)
- Nút "📋 Xem lịch sử" → link đến trang lịch sử
- Nút "📥 Xuất file" → export Excel

PHẦN BẢNG ĐIỂM DANH:
Mỗi học sinh là một hàng gồm:
- STT
- Avatar + Tên học sinh
- 4 nút chọn trạng thái (toggle button group):
  [✅ Có mặt] [❌ Vắng] [⏰ Trễ] [📝 Có phép]
- Input ghi chú (hiện khi chọn Vắng hoặc Trễ)
- Badge màu khi đã chọn:
  Có mặt = xanh lá, Vắng = đỏ, Trễ = vàng, Có phép = xanh dương

PHẦN THÔNG MINH:
- Nếu học sinh đã có đơn xin nghỉ được duyệt cho ngày này
  → tự động điền "Có phép" + hiện badge "Đã có đơn xin nghỉ"
- Nút "✅ Điểm danh tất cả có mặt" để tick nhanh toàn lớp

PHẦN FOOTER:
- Summary: "Có mặt: X | Vắng: Y | Trễ: Z | Có phép: W"
- Nút "💾 Lưu điểm danh" → lưu vào database
- Khi lưu xong → gửi Supabase Realtime notification 
  đến học sinh và phụ huynh

STATE MANAGEMENT:
- Dùng useState cho object: { [studentId]: status }
- Khi load trang → kiểm tra đã có session hôm nay chưa
  (nếu có → load data cũ, nếu chưa → tạo session mới)
- Autosave: tự động lưu draft mỗi 30 giây
  (lưu localStorage, không phải database)

Dùng shadcn/ui: Table, Button, Badge, Input, 
DatePicker, Toast, Card
```

---

## 📋 PROMPT 3 — Trang lịch sử điểm danh + Xuất file

```
Tạo trang lịch sử điểm danh tại:
app/teacher/classes/[classId]/attendance/history/page.tsx

PHẦN BỘ LỌC:
- Chọn tháng (mặc định tháng hiện tại)
- Lọc theo học sinh (Select — chọn 1 em cụ thể hoặc "Tất cả")
- Lọc theo trạng thái (Tất cả / Vắng / Trễ / Có phép)
- Nút "🔍 Lọc"

PHẦN BẢNG LỊCH SỬ — 2 chế độ xem:

Chế độ 1 — "Xem theo buổi" (mặc định):
Mỗi hàng = 1 buổi học
Cột: Ngày | Tổng HS | Có mặt | Vắng | Trễ | Có phép | Hành động
Nút "Xem chi tiết" → expand hàng ra xem từng em

Chế độ 2 — "Xem theo học sinh":
Mỗi hàng = 1 học sinh
Cột: Tên HS | Tổng buổi | Có mặt | Vắng | Trễ | Có phép | % chuyên cần
Click vào tên → xem chi tiết từng buổi của em đó

PHẦN THỐNG KÊ NHANH (Cards ở trên):
- Tổng số buổi trong tháng
- Tỷ lệ đi học trung bình lớp
- Học sinh vắng nhiều nhất
- Học sinh chuyên cần 100%

PHẦN XUẤT FILE:
Nút "📥 Xuất Excel":
- Dùng thư viện xlsx (SheetJS)
- npm install xlsx
- File Excel có 2 sheet:
  Sheet 1 "Tổng hợp": 
    Tên HS | Tổng buổi | Có mặt | Vắng | Trễ | Có phép | % chuyên cần
  Sheet 2 "Chi tiết":
    Tên HS | Ngày 1 | Ngày 2 | ... (mỗi ô = trạng thái hôm đó)
- Tên file: "Diemdanh_[TenLop]_Thang[X]_[Nam].xlsx"

Nút "📄 Xuất PDF":
- Dùng @react-pdf/renderer
- Format báo cáo chính thức có:
  * Header: Logo + Tên trung tâm + Tên lớp + Tháng
  * Bảng tổng hợp điểm danh
  * Chữ ký giáo viên ở cuối
- Tên file: "Baocao_Diemdanh_[TenLop]_Thang[X].pdf"

Dùng shadcn/ui: Table, Select, DatePicker, 
Tabs, Card, Button, Badge
```

---

## 📋 PROMPT 4 — Đơn xin nghỉ cho Phụ huynh

```
Tạo 2 trang cho phụ huynh:

TRANG 1 — Tạo đơn xin nghỉ:
app/parent/absence-request/create/page.tsx

Form gồm:
1. Chọn con (nếu có nhiều con — dùng Select)
2. Chọn lớp (tự động load lớp của con được chọn)
3. Chọn ngày nghỉ (DatePicker — không cho chọn ngày quá khứ > 1 ngày)
4. Lý do nghỉ (Textarea — bắt buộc, tối thiểu 20 ký tự)
5. Upload giấy tờ đính kèm (tùy chọn):
   - Chấp nhận: PDF, JPG, PNG
   - Tối đa 5MB
   - VD: đơn thuốc, giấy khám bệnh
6. Checkbox xác nhận: "Tôi xác nhận thông tin trên là chính xác"
7. Nút "📤 Gửi đơn xin nghỉ"

Sau khi gửi:
- Lưu vào bảng absence_requests
- Gửi thông báo realtime đến giáo viên
- Hiện toast: "Đã gửi đơn thành công, chờ giáo viên xét duyệt"
- Redirect đến trang danh sách đơn

TRANG 2 — Danh sách đơn xin nghỉ:
app/parent/absence-request/page.tsx

Hiển thị danh sách tất cả đơn đã gửi:
Cột: Tên con | Ngày nghỉ | Lý do | Ngày gửi | Trạng thái | Chi tiết

Badge trạng thái:
- Chờ duyệt = vàng
- Đã duyệt = xanh lá  
- Từ chối = đỏ (kèm lý do từ chối)

Nút "Xem chi tiết" → mở Dialog hiện đầy đủ thông tin đơn

Dùng shadcn/ui: Form, Select, DatePicker, 
Textarea, Button, Badge, Dialog, Table, Toast
```

---

## 📋 PROMPT 5 — Duyệt đơn xin nghỉ cho Giáo viên

```
Tạo trang quản lý đơn xin nghỉ cho giáo viên tại:
app/teacher/absence-requests/page.tsx

PHẦN THỐNG KÊ NHANH (3 cards):
- Chờ duyệt: X đơn (badge đỏ nếu > 0)
- Đã duyệt tháng này: Y đơn
- Từ chối tháng này: Z đơn

PHẦN DANH SÁCH ĐƠN — Tabs:
Tab "Chờ duyệt" | Tab "Đã duyệt" | Tab "Từ chối"

Mỗi đơn hiển thị dạng Card:
- Avatar + Tên học sinh
- Ngày xin nghỉ (highlight nếu là ngày mai/hôm nay)
- Lý do (truncate 100 ký tự, nút "Xem thêm")
- Tên phụ huynh + thời gian gửi
- File đính kèm (nếu có) — nút xem/tải
- 2 nút hành động:
  [✅ Duyệt]  [❌ Từ chối]

Khi bấm "Từ chối" → mở Dialog nhập lý do từ chối (bắt buộc)

Sau khi duyệt/từ chối:
- Cập nhật absence_requests table
- Gửi thông báo realtime đến phụ huynh
- Nếu duyệt + ngày đó đã có session điểm danh
  → tự động update attendance_records thành 'excused'
- Toast: "Đã duyệt đơn xin nghỉ của [Tên học sinh]"

Dùng shadcn/ui: Card, Tabs, Badge, Button, 
Dialog, Textarea, Avatar, Toast
```

---

## 📋 PROMPT 6 — Xem điểm danh cho Học sinh & Phụ huynh

```
Tạo 2 component dùng chung hiển thị lịch sử điểm danh:

COMPONENT 1 — Dành cho Học sinh:
components/student/AttendanceHistory.tsx

Gồm 2 phần:

Phần A — Tháng hiện tại dạng Calendar:
- Hiển thị calendar tháng này
- Mỗi ngày có buổi học được tô màu:
  Xanh lá = Có mặt
  Đỏ = Vắng không phép  
  Vàng = Đi trễ
  Xanh dương = Có phép
  Xám = Không có buổi học
- Click vào ngày → hiện popup thông tin buổi đó

Phần B — Thống kê tháng:
4 cards nhỏ: Có mặt | Vắng | Trễ | Có phép
Badge "Chuyên cần X%" — màu xanh nếu ≥ 80%, đỏ nếu < 80%

Trang học sinh: app/student/attendance/page.tsx
Nhúng component AttendanceHistory vào trang

---

COMPONENT 2 — Dành cho Phụ huynh:
Trong app/parent/dashboard/page.tsx đã có,
thêm section "Điểm danh" với:

- Tabs chọn con (nếu nhiều con)
- Với mỗi con: nhúng component AttendanceHistory
- Thêm nút "📤 Tạo đơn xin nghỉ" liên kết đến 
  /parent/absence-request/create

Dùng shadcn/ui: Calendar, Card, Badge, 
Popover, Tabs, Button
```

---

## 📋 PROMPT 7 — Dashboard điểm danh cho Admin

```
Tạo trang thống kê điểm danh cho Admin tại:
app/admin/attendance/page.tsx

PHẦN BỘ LỌC:
- Chọn tháng + năm
- Chọn lớp (hoặc "Tất cả lớp")
- Chọn giáo viên (hoặc "Tất cả")
- Nút "Lọc"

PHẦN THỐNG KÊ TỔNG QUAN (4 cards lớn):
- Tổng buổi học đã diễn ra
- Tỷ lệ đi học trung bình toàn trường
- Số học sinh vắng > 20% (cần chú ý)
- Số đơn xin nghỉ đang chờ duyệt

PHẦN BẢNG THEO LỚP:
Cột: Tên lớp | Giáo viên | Số buổi | TB có mặt | TB vắng | % chuyên cần
Click vào lớp → xem chi tiết học sinh trong lớp đó

PHẦN BẢNG HỌC SINH CẦN CHÚ Ý:
Hiển thị học sinh có tỷ lệ vắng > 20% trong tháng
Cột: Tên HS | Lớp | Số buổi vắng | % vắng | Hành động
Nút "Xem chi tiết" → xem toàn bộ lịch sử

XUẤT BÁO CÁO TỔNG HỢP:
Nút "📥 Xuất Excel toàn trường" — xuất tất cả lớp
Nút "📄 Xuất PDF báo cáo tháng"

Dùng shadcn/ui: Card, Table, Select, 
DatePicker, Button, Badge, Tabs
```

---

## 📋 PROMPT 8 — Realtime Notifications

```
Thêm realtime notifications cho hệ thống điểm danh.
Dùng Supabase Realtime.

Tạo file: hooks/useAttendanceRealtime.ts

Hook này lắng nghe các sự kiện:

1. Khi giáo viên lưu điểm danh (INSERT vào attendance_records):
   - Học sinh có status 'absent' hoặc 'late':
     → Gửi thông báo đến học sinh đó
     → Gửi thông báo đến phụ huynh của em đó
     Nội dung: "Buổi học [ngày], [Tên em] [vắng/đi trễ] lớp [Tên lớp]"

2. Khi phụ huynh gửi đơn xin nghỉ (INSERT vào absence_requests):
   → Gửi thông báo đến giáo viên của lớp đó
   Nội dung: "Phụ huynh [Tên HS] gửi đơn xin nghỉ ngày [ngày]"

3. Khi giáo viên duyệt/từ chối đơn (UPDATE absence_requests):
   → Gửi thông báo đến phụ huynh
   Nội dung nếu duyệt: "Đơn xin nghỉ của [Tên HS] đã được duyệt ✅"
   Nội dung nếu từ chối: "Đơn xin nghỉ bị từ chối: [lý do] ❌"

Tất cả thông báo được lưu vào bảng notifications đã có.

Tạo component: components/shared/NotificationBell.tsx
- Icon chuông ở header
- Badge đỏ hiện số thông báo chưa đọc
- Click → dropdown hiện 5 thông báo mới nhất
- Nút "Xem tất cả" → /notifications

Nhúng NotificationBell vào Navbar của tất cả 4 role.
```

---

## 📋 PROMPT 9 — Kiểm tra toàn bộ hệ thống

```
Kiểm tra toàn bộ hệ thống điểm danh.
Đọc tất cả file liên quan và xác nhận từng mục:

DATABASE:
□ 3 bảng được tạo đúng cấu trúc
□ RLS hoạt động đúng cho từng role
□ UNIQUE constraints không bị duplicate

GIÁO VIÊN:
□ Mở phiên điểm danh được
□ Tick trạng thái từng học sinh được
□ Học sinh có đơn xin nghỉ tự động điền "Có phép"
□ Lưu điểm danh thành công
□ Sửa điểm danh trong ngày được
□ Xem lịch sử theo tháng được
□ Xuất Excel đúng format 2 sheet
□ Xuất PDF đúng format báo cáo

PHỤ HUYNH:
□ Tạo đơn xin nghỉ được
□ Upload file đính kèm được
□ Xem trạng thái đơn được
□ Xem lịch sử điểm danh của con được
□ Calendar hiện màu đúng từng ngày

HỌC SINH:
□ Xem lịch sử điểm danh của bản thân
□ Calendar hiện màu đúng

ADMIN:
□ Xem tổng hợp toàn trường được
□ Lọc theo lớp/giáo viên được
□ Xuất báo cáo tổng hợp được

REALTIME:
□ Phụ huynh nhận thông báo khi con vắng
□ Giáo viên nhận thông báo khi có đơn xin nghỉ
□ Phụ huynh nhận thông báo khi đơn được duyệt/từ chối
□ Notification bell hiện số chưa đọc đúng

Với mỗi mục ❌ → fix ngay trước khi báo cáo hoàn thành.
```

---

## ⚠️ Thứ tự build bắt buộc

```
PROMPT 1 — Database (làm trước tiên, mọi thứ phụ thuộc vào đây)
    ↓
PROMPT 2 — Trang điểm danh giáo viên (core feature)
    ↓
PROMPT 3 — Lịch sử + Xuất file
    ↓
PROMPT 4 — Đơn xin nghỉ phụ huynh
    ↓
PROMPT 5 — Duyệt đơn giáo viên
    ↓
PROMPT 6 — Xem điểm danh học sinh & phụ huynh
    ↓
PROMPT 7 — Dashboard admin
    ↓
PROMPT 8 — Realtime notifications (làm cuối vì cần data thật để test)
    ↓
PROMPT 9 — Kiểm tra tổng thể
```

---

## 💡 Lưu ý quan trọng

**Test data sau Prompt 1:**
```
Sau khi tạo database xong, yêu cầu Antigravity:

"Tạo seed data để test:
- 1 lớp học có 5 học sinh
- 10 buổi điểm danh trong tháng này
- Mỗi buổi có học sinh vắng, trễ, có phép ngẫu nhiên
- 2 đơn xin nghỉ: 1 pending, 1 approved
Chèn vào Supabase để tôi test UI"
```

**Về xuất file Excel:**
SheetJS (xlsx) đã có trong stack. Nếu Antigravity 
hỏi cài thêm gì → xác nhận `npm install xlsx`.

**Về xuất PDF:**
@react-pdf/renderer cũng đã có trong stack.

---

*Dùng kết hợp với README.md, FEATURE_LESSON_BUILDER.md, GUIDE_PARENT_STUDENT_LINKING.md*
