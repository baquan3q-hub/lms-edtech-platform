# 🏫 Feature Spec: Quản lý Lớp học — Giáo viên, Học sinh, Phụ huynh

---

## 🧠 Phân tích yêu cầu

```
3 NHÓM TÍNH NĂNG CHÍNH:

┌─────────────────────────────────────────────────────────┐
│ NHÓM 1 — GIÁO VIÊN: Quản lý lớp học                   │
│  ├── Lịch dạy (có thể sửa nội dung từng buổi)          │
│  └── Quản lý học viên                                   │
│       ├── Danh sách + điểm chuyên cần                  │
│       └── Bảng xếp hạng chuyên cần + điểm học tập      │
├─────────────────────────────────────────────────────────┤
│ NHÓM 2 — PHỤ HUYNH: Theo dõi con                      │
│  ├── Lịch học của con                                   │
│  ├── Điểm danh của con                                  │
│  ├── Điểm số & tiến độ của con                         │
│  └── Xin nghỉ học                                       │
├─────────────────────────────────────────────────────────┤
│ NHÓM 3 — HỆ THỐNG: Thông báo tự động                  │
│  └── Gửi điểm số & tiến độ đến phụ huynh              │
└─────────────────────────────────────────────────────────┘
```

---

## 🗺️ Sơ đồ luồng dữ liệu

```
Giáo viên tạo lịch dạy + nội dung buổi học
        ↓
Học sinh tham gia → Giáo viên điểm danh
        ↓
Học sinh làm bài kiểm tra → Hệ thống ghi điểm
        ↓
Hệ thống tính:
  • Điểm chuyên cần = (Số buổi có mặt / Tổng buổi) × 100%
  • Điểm học tập = Trung bình điểm các bài kiểm tra
  • Xếp hạng = Sort toàn lớp theo 2 chỉ số trên
        ↓
Thông báo tự động → Phụ huynh nhận báo cáo tuần/tháng
```

---

## 🗄️ Database Schema bổ sung

```sql
-- Lịch dạy từng buổi (chi tiết hơn classes table)
class_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        uuid REFERENCES classes(id) ON DELETE CASCADE,
  session_number  integer,          -- Buổi thứ mấy
  session_date    date NOT NULL,
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  topic           text,             -- Chủ đề buổi học (GV tự đặt)
  description     text,             -- Mô tả nội dung chi tiết
  materials_url   text[],           -- Link tài liệu đính kèm
  homework        text,             -- Bài tập về nhà
  status          text DEFAULT 'scheduled',
  -- 'scheduled' = Chưa diễn ra
  -- 'ongoing'   = Đang diễn ra  
  -- 'completed' = Đã xong
  -- 'cancelled' = Đã hủy
  cancel_reason   text,
  teacher_notes   text,             -- Ghi chú riêng GV (HS không thấy)
  created_at      timestamp DEFAULT now(),
  updated_at      timestamp
)

-- Thống kê tổng hợp mỗi học sinh trong lớp (cache để query nhanh)
student_class_stats (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid REFERENCES users(id),
  class_id            uuid REFERENCES classes(id),
  total_sessions      integer DEFAULT 0,    -- Tổng buổi học
  present_count       integer DEFAULT 0,    -- Số buổi có mặt
  absent_count        integer DEFAULT 0,    -- Số buổi vắng
  late_count          integer DEFAULT 0,    -- Số buổi trễ
  excused_count       integer DEFAULT 0,    -- Số buổi có phép
  attendance_rate     numeric(5,2),         -- % chuyên cần
  avg_score           numeric(5,2),         -- Điểm TB bài kiểm tra
  attendance_rank     integer,              -- Xếp hạng chuyên cần
  academic_rank       integer,              -- Xếp hạng học tập
  last_updated        timestamp DEFAULT now()
)

-- Thông báo điểm số gửi phụ huynh
grade_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid REFERENCES users(id),
  parent_id       uuid REFERENCES users(id),
  class_id        uuid REFERENCES classes(id),
  type            text,     -- 'weekly' | 'monthly' | 'assignment'
  period_label    text,     -- "Tuần 1 tháng 3" hoặc "Tháng 3/2026"
  summary_data    jsonb,    -- snapshot điểm số tại thời điểm gửi
  sent_at         timestamp DEFAULT now(),
  read_at         timestamp
)
```

---

## 📋 PROMPT 1 — Database Migration

```
Đọc README.md trước.

Tạo migration file: supabase/migrations/[timestamp]_class_management.sql

Tạo 3 bảng sau:

1. class_sessions:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - class_id uuid REFERENCES classes(id) ON DELETE CASCADE
   - session_number integer NOT NULL
   - session_date date NOT NULL
   - start_time time NOT NULL
   - end_time time NOT NULL
   - topic text
   - description text
   - materials_url text[] DEFAULT '{}'
   - homework text
   - status text DEFAULT 'scheduled' 
     CHECK (status IN ('scheduled','ongoing','completed','cancelled'))
   - cancel_reason text
   - teacher_notes text
   - created_at timestamp DEFAULT now()
   - updated_at timestamp
   - UNIQUE (class_id, session_date, start_time)

2. student_class_stats:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - student_id uuid REFERENCES users(id)
   - class_id uuid REFERENCES classes(id)
   - total_sessions integer DEFAULT 0
   - present_count integer DEFAULT 0
   - absent_count integer DEFAULT 0
   - late_count integer DEFAULT 0
   - excused_count integer DEFAULT 0
   - attendance_rate numeric(5,2) DEFAULT 0
   - avg_score numeric(5,2) DEFAULT 0
   - attendance_rank integer
   - academic_rank integer
   - last_updated timestamp DEFAULT now()
   - UNIQUE (student_id, class_id)

3. grade_notifications:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - student_id uuid REFERENCES users(id)
   - parent_id uuid REFERENCES users(id)
   - class_id uuid REFERENCES classes(id)
   - type text CHECK (type IN ('weekly','monthly','assignment'))
   - period_label text
   - summary_data jsonb
   - sent_at timestamp DEFAULT now()
   - read_at timestamp

Tạo Supabase Function tự động cập nhật student_class_stats
khi có INSERT/UPDATE vào attendance_records hoặc quiz_attempts:

CREATE OR REPLACE FUNCTION update_student_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Tính lại stats cho student trong class đó
  -- Cập nhật attendance_rate, avg_score
  -- Cập nhật rank toàn lớp
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

RLS:
- Teacher: CRUD class_sessions của class mình
- Student: SELECT class_sessions của class mình enrolled
- Parent: SELECT class_sessions và student_class_stats của con mình
- Admin: Full access

Đọc lại file sau khi tạo và xác nhận syntax đúng.
```

---

## 📋 PROMPT 2 — Lịch dạy Giáo viên (có chỉnh sửa nội dung)

```
Tạo trang lịch dạy cho giáo viên tại:
app/teacher/classes/[classId]/schedule/page.tsx

LAYOUT: 2 chế độ xem — Toggle giữa "Lịch" và "Danh sách"

════════════════════════════════════════
CHẾ ĐỘ 1 — XEM DẠNG LỊCH (Calendar View)
════════════════════════════════════════
- Calendar tháng hiện tại
- Mỗi ngày có buổi học → hiện block màu với tên chủ đề
  Màu theo trạng thái:
  Xanh dương = Scheduled (sắp tới)
  Xanh lá    = Completed (đã xong)
  Đỏ         = Cancelled (đã hủy)
  Cam        = Ongoing (đang diễn ra)
- Click vào buổi học → mở Drawer bên phải để xem + sửa

════════════════════════════════════════
CHẾ ĐỘ 2 — XEM DẠNG DANH SÁCH (List View)
════════════════════════════════════════
Mỗi buổi là một Card gồm:
- Header: "Buổi [số] — [Ngày] [Giờ bắt đầu] - [Giờ kết thúc]"
- Badge trạng thái
- Chủ đề buổi học (topic)
- Tóm tắt nội dung (description — truncate 100 ký tự)
- Bài tập về nhà (nếu có)
- Nút [✏️ Sửa nội dung] [📋 Điểm danh] [🚫 Hủy buổi]

════════════════════════════════════════
DRAWER/DIALOG SỬA NỘI DUNG BUỔI HỌC
════════════════════════════════════════
Khi giáo viên bấm "Sửa nội dung", mở Drawer bên phải với form:

1. Chủ đề buổi học (Input — VD: "Module 1: Animals - Listening")
2. Mô tả nội dung chi tiết (Textarea — GV ghi kế hoạch dạy)
3. Tài liệu đính kèm:
   - Danh sách link tài liệu đã thêm
   - Nút "+ Thêm link" → input nhập URL
   - Hoặc nút "Upload file" → upload lên Supabase Storage
4. Bài tập về nhà (Textarea)
5. Ghi chú riêng giáo viên (Textarea — học sinh không thấy)
   Badge nhỏ: "🔒 Chỉ giáo viên thấy"
6. Nếu cần hủy buổi:
   - Checkbox "Hủy buổi học này"
   - Input lý do hủy (bắt buộc nếu tick)
   - Khi hủy → tự động gửi thông báo đến học sinh + phụ huynh

Nút "💾 Lưu thay đổi" → UPDATE class_sessions table
Toast: "Đã cập nhật nội dung buổi học"

Dùng shadcn/ui: Calendar, Card, Drawer, Sheet,
Form, Input, Textarea, Badge, Button, Toast
```

---

## 📋 PROMPT 3 — Quản lý Học viên (Tab 1: Danh sách + Chuyên cần)

```
Tạo trang quản lý học viên trong lớp tại:
app/teacher/classes/[classId]/students/page.tsx

Trang có 2 TABS chính:
Tab 1: "👥 Danh sách học viên"
Tab 2: "🏆 Bảng xếp hạng"

════════════════════════════════════════
TAB 1 — DANH SÁCH HỌC VIÊN + CHUYÊN CẦN
════════════════════════════════════════

PHẦN HEADER:
- Tổng số học viên: X em
- Nút "📥 Xuất danh sách" → Excel
- Search box tìm tên học sinh

BẢNG DANH SÁCH:
Mỗi hàng là 1 học sinh gồm:

Cột 1 — Thông tin:
  - STT
  - Avatar + Họ tên
  - Email / SĐT liên hệ

Cột 2 — Chuyên cần:
  - Mini progress bar hiện % chuyên cần
  - Số liệu: "X/Y buổi" (đã đi / tổng buổi)
  - % chuyên cần (màu xanh ≥80%, vàng 60-79%, đỏ <60%)

Cột 3 — Phân loại vắng:
  - Có mặt: X | Vắng: Y | Trễ: Z | Có phép: W
  - Hiện dạng badge nhỏ màu sắc

Cột 4 — Điểm TB:
  - Điểm trung bình các bài kiểm tra
  - Số bài đã làm / tổng số bài

Cột 5 — Hành động:
  - Nút "👁️ Chi tiết" → mở Dialog xem toàn bộ lịch sử
  - Nút "📩 Nhắn phụ huynh" → tạo thông báo gửi phụ huynh

DIALOG CHI TIẾT HỌC SINH:
Khi click "Chi tiết", mở Dialog full màn hình:
- Thông tin cơ bản học sinh
- Tab "Điểm danh": calendar view + bảng chi tiết từng buổi
- Tab "Điểm số": danh sách các bài kiểm tra + điểm
- Tab "Phụ huynh": thông tin liên hệ phụ huynh
- Nút "📤 Gửi báo cáo cho phụ huynh" → gửi ngay

Dùng shadcn/ui: Tabs, Table, Progress, Badge,
Dialog, Avatar, Input, Button, Calendar
```

---

## 📋 PROMPT 4 — Bảng xếp hạng (Tab 2)

```
Trong trang app/teacher/classes/[classId]/students/page.tsx
Xây dựng nội dung Tab 2 "🏆 Bảng xếp hạng"

PHẦN BỘ LỌC:
- Toggle chọn xếp hạng theo:
  [🎯 Chuyên cần] hoặc [📝 Điểm học tập] hoặc [⭐ Tổng hợp]
- Chọn kỳ: Tháng này / Tháng trước / Toàn khóa

BẢNG XẾP HẠNG:
Top 3 đặc biệt — hiện card lớn với icon vàng/bạc/đồng:
  🥇 Hạng 1 — [Tên] — [Điểm/Tỷ lệ]
  🥈 Hạng 2 — [Tên] — [Điểm/Tỷ lệ]  
  🥉 Hạng 3 — [Tên] — [Điểm/Tỷ lệ]

Từ hạng 4 trở đi — bảng thông thường:
Cột: Hạng | Tên HS | Chuyên cần | Điểm TB | Xu hướng | Điểm tổng hợp

Cột "Xu hướng":
  ↑ Xanh = tăng so với tháng trước
  ↓ Đỏ   = giảm so với tháng trước
  → Xám  = không đổi

PHẦN THỐNG KÊ LỚP:
4 card nhỏ:
  - Điểm TB toàn lớp
  - % Chuyên cần TB
  - Học sinh xuất sắc (≥90% cả 2 chỉ số)
  - Học sinh cần hỗ trợ (<60% bất kỳ chỉ số nào)

NÚT "📢 Thông báo xếp hạng cho phụ huynh":
Khi click → Dialog xác nhận:
  "Gửi bảng xếp hạng tháng [X] đến phụ huynh của 
   tất cả [Y] học sinh?"
Nút "Gửi" → tạo grade_notifications cho từng học sinh
→ Phụ huynh nhận thông báo trong app

Dùng shadcn/ui: Card, Table, Badge, Button,
Select, Tabs, Dialog, Progress
```

---

## 📋 PROMPT 5 — Phụ huynh: Lịch học của con

```
Tạo trang lịch học cho phụ huynh tại:
app/parent/children/[studentId]/schedule/page.tsx

Và thêm section này vào dashboard phụ huynh.

PHẦN HEADER:
- Ảnh + Tên con
- Tên lớp đang học
- Badge trạng thái lớp (Đang học / Đã kết thúc)

PHẦN LỊCH HỌC — 2 chế độ:

CHẾ ĐỘ CALENDAR:
- Hiện tháng hiện tại
- Mỗi ngày có buổi học → hiện block màu:
  Xanh dương = Buổi học bình thường
  Xanh lá    = Đã điểm danh có mặt
  Đỏ         = Vắng không phép
  Vàng        = Đi trễ
  Xanh nhạt  = Vắng có phép
  Xám         = Đã hủy
- Click vào buổi → Popover hiện chi tiết:
  Thời gian | Chủ đề | Tình trạng điểm danh của con | Bài tập về nhà

CHẾ ĐỘ DANH SÁCH (tuần hiện tại):
Hiện 7 ngày gần nhất và 7 ngày tới:
Mỗi buổi: Ngày | Giờ | Chủ đề | Trạng thái điểm danh

PHẦN XIN NGHỈ HỌC (tích hợp vào đây):
Nút nổi bật "📝 Tạo đơn xin nghỉ" ở góc phải
→ Mở Sheet/Drawer từ phải với form:
  1. Ngày xin nghỉ (DatePicker — highlight ngày có lịch học)
  2. Lý do (Textarea — bắt buộc)
  3. Giấy tờ đính kèm (tùy chọn — PDF/ảnh)
  4. Nút "📤 Gửi đơn"

Danh sách đơn đã gửi phía dưới:
  Ngày | Lý do | Trạng thái | Phản hồi GV

Dùng shadcn/ui: Calendar, Card, Popover, Sheet,
Badge, Button, DatePicker, Textarea, Table
```

---

## 📋 PROMPT 6 — Phụ huynh: Điểm số & Tiến độ của con

```
Tạo trang xem điểm số cho phụ huynh tại:
app/parent/children/[studentId]/progress/page.tsx

PHẦN TỔNG QUAN — 4 cards lớn:
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Chuyên cần  │  Điểm TB     │  Xếp hạng   │  Xu hướng   │
│    85%       │   7.5/10     │   5/30 HS   │    ↑ Tốt    │
└──────────────┴──────────────┴──────────────┴──────────────┘

PHẦN BIỂU ĐỒ TIẾN ĐỘ:
- LineChart hiện điểm qua các bài kiểm tra theo thời gian
  (Trục X = tên bài kiểm tra, Trục Y = điểm)
- Đường xu hướng (trend line) — màu xanh = tốt lên, đỏ = kém đi
- Dùng thư viện Recharts đã có trong stack

PHẦN LỊCH SỬ BÀI KIỂM TRA:
Bảng gồm:
Tên bài | Loại | Ngày | Điểm | / Tổng | Xếp loại | Nhận xét GV

Xếp loại tự động:
  Xuất sắc  = 9-10 điểm (badge vàng)
  Giỏi      = 8-8.9 (badge xanh)
  Khá       = 6.5-7.9 (badge xanh nhạt)
  Trung bình = 5-6.4 (badge vàng nhạt)
  Yếu       = < 5 (badge đỏ)

PHẦN ĐIỂM DANH TÓM TẮT:
- Progress bar chuyên cần tháng này
- Mini calendar tháng hiện tại (màu theo trạng thái)
- Số liệu: Có mặt X | Vắng Y | Trễ Z | Có phép W

PHẦN THÔNG BÁO TỪ GIÁO VIÊN:
- Danh sách các báo cáo giáo viên đã gửi
- Badge "Mới" cho báo cáo chưa đọc
- Click → mở Dialog đọc nội dung đầy đủ

Dùng shadcn/ui: Card, Badge, Table, Dialog
Dùng Recharts: LineChart, Line, XAxis, YAxis, Tooltip, Legend
```

---

## 📋 PROMPT 7 — Thông báo điểm số tự động đến Phụ huynh

```
Tạo hệ thống gửi báo cáo điểm số tự động cho phụ huynh.

PHẦN 1 — Giáo viên gửi thủ công:

Trong trang quản lý học viên (Tab Danh sách),
với mỗi học sinh có nút "📩 Gửi báo cáo cho phụ huynh".

Khi click → mở Dialog với form:
1. Chọn phụ huynh nhận (nếu có nhiều phụ huynh)
2. Kỳ báo cáo: [Tuần này] [Tháng này] [Tùy chỉnh]
3. Preview nội dung báo cáo sẽ gửi:
   ┌─────────────────────────────────┐
   │ 📊 Báo cáo học tập — Tháng 3  │
   │ Học sinh: Nguyễn Thị B          │
   │ Lớp: Tiếng Anh B1              │
   │                                 │
   │ 📅 Chuyên cần: 85% (17/20 buổi)│
   │ 📝 Điểm TB: 7.8/10             │
   │ 🏆 Xếp hạng lớp: 5/30         │
   │                                 │
   │ ✅ Điểm mạnh: Kỹ năng nghe tốt │
   │ ⚠️ Cần cải thiện: Ngữ pháp    │
   │                                 │
   │ 💬 Nhận xét: [GV nhập vào đây] │
   └─────────────────────────────────┘
4. Textarea nhận xét thêm của giáo viên
5. Nút "📤 Gửi báo cáo"

Sau khi gửi:
- Lưu vào grade_notifications table
- Gửi in-app notification đến phụ huynh (Supabase Realtime)
- Gửi email tóm tắt qua Resend (nếu phụ huynh có email)
- Toast: "Đã gửi báo cáo đến phụ huynh của [Tên HS]"

PHẦN 2 — Nút "Gửi hàng loạt" (toàn lớp):

Trong Tab Bảng xếp hạng, nút "📢 Thông báo xếp hạng":
- Gửi báo cáo ngắn đến TẤT CẢ phụ huynh trong lớp cùng lúc
- Nội dung tự động: điểm, xếp hạng, chuyên cần của từng con
- Có thể thêm lời nhắn chung của giáo viên

PHẦN 3 — Template email (Resend):
Tạo file: emails/GradeReportEmail.tsx
Dùng @react-email/components để tạo email đẹp:
- Logo trung tâm ở header
- Thông tin học sinh
- Bảng điểm số + chuyên cần
- Nhận xét giáo viên
- Footer với thông tin liên hệ

Cài thêm: npm install resend @react-email/components
```

---

## 📋 PROMPT 8 — Navigation & Liên kết các trang

```
Cập nhật navigation cho từng role để liên kết 
tất cả trang vừa tạo.

SIDEBAR GIÁO VIÊN — trong lớp học [classId]:
app/teacher/classes/[classId]/layout.tsx

Menu items:
├── 📚 Nội dung bài giảng    → /teacher/classes/[id]/content
├── 📅 Lịch dạy              → /teacher/classes/[id]/schedule  ← MỚI
├── 👥 Học viên              → /teacher/classes/[id]/students  ← MỚI
│   ├── Danh sách & Chuyên cần
│   └── Bảng xếp hạng
├── 📋 Điểm danh             → /teacher/classes/[id]/attendance
├── 📝 Đơn xin nghỉ         → /teacher/absence-requests
└── 📊 Báo cáo              → /teacher/classes/[id]/reports

BOTTOM NAV PHỤ HUYNH (mobile-first):
app/parent/layout.tsx

Menu items:
├── 🏠 Tổng quan            → /parent/dashboard
├── 📅 Lịch học             → /parent/children/[id]/schedule  ← MỚI
├── 📊 Điểm số              → /parent/children/[id]/progress  ← MỚI
├── 📝 Xin nghỉ            → /parent/absence-request
└── 🔔 Thông báo           → /parent/notifications

Nếu phụ huynh có nhiều con:
- Thêm selector chọn con ở top của mỗi trang
- Lưu con đang chọn vào localStorage để nhớ lần sau

Đảm bảo tất cả route được bảo vệ đúng role 
bằng middleware đã có.
```

---

## 📋 PROMPT 9 — Seed Data & Kiểm tra tổng thể

```
Tạo seed data để test toàn bộ tính năng vừa build.

BƯỚC 1 — Tạo dữ liệu mẫu:
Chèn vào database:
- 1 lớp học có 10 học sinh
- 20 buổi học trong class_sessions 
  (10 buổi đã qua, 10 buổi sắp tới)
  Mỗi buổi có topic, description, homework
- Điểm danh cho 10 buổi đã qua
  (mỗi học sinh có tỷ lệ vắng khác nhau từ 0-30%)
- 5 bài kiểm tra với điểm của từng học sinh
- 2 phụ huynh liên kết với 2 học sinh khác nhau
- 3 đơn xin nghỉ: 1 pending, 1 approved, 1 rejected
Chạy: npx supabase db seed

BƯỚC 2 — Kiểm tra từng tính năng:

GIÁO VIÊN:
□ Trang lịch dạy hiện đúng calendar view
□ Click buổi học → mở drawer sửa nội dung
□ Lưu chỉnh sửa → data update trong DB
□ Hủy buổi học → badge đổi màu đỏ
□ Tab Danh sách học viên hiện đúng stats
□ Progress bar chuyên cần hiện đúng màu
□ Tab Bảng xếp hạng sort đúng thứ tự
□ Nút gửi báo cáo → phụ huynh nhận được

PHỤ HUYNH:
□ Lịch học hiện đúng màu từng ngày
□ Click ngày → popover hiện chi tiết buổi
□ Tạo đơn xin nghỉ thành công
□ Xem trạng thái đơn đã gửi
□ Trang điểm số hiện đúng biểu đồ
□ Nhận thông báo báo cáo từ GV

THÔNG BÁO:
□ Phụ huynh nhận in-app notification
□ Email được gửi qua Resend (check inbox test)
□ Badge thông báo cập nhật đúng số

Với mỗi mục ❌ → fix ngay.
```

---

## ⚠️ Thứ tự build bắt buộc

```
PROMPT 1 — Database (nền tảng)
    ↓
PROMPT 2 — Lịch dạy giáo viên
    ↓
PROMPT 3 — Danh sách học viên + Chuyên cần
    ↓
PROMPT 4 — Bảng xếp hạng
    ↓
PROMPT 5 — Phụ huynh: Lịch học + Xin nghỉ
    ↓
PROMPT 6 — Phụ huynh: Điểm số + Tiến độ
    ↓
PROMPT 7 — Thông báo tự động
    ↓
PROMPT 8 — Navigation & Liên kết
    ↓
PROMPT 9 — Seed data & Test
```

---

## 💡 Lưu ý kỹ thuật

**Tính điểm tổng hợp xếp hạng:**
```
Điểm tổng hợp = (Chuyên cần × 40%) + (Điểm học tập × 60%)
Ví dụ: Chuyên cần 90% và Điểm TB 8.0
→ Tổng hợp = (90 × 0.4) + (8.0 × 10 × 0.6) = 36 + 48 = 84/100
```

**Màu sắc chuẩn cho toàn hệ thống:**
```
Có mặt / Tốt      = green-500
Đi trễ / Trung bình = yellow-500
Vắng / Kém         = red-500
Có phép / Thông tin = blue-500
Chưa có dữ liệu    = gray-300
```

**Recharts — LineChart điểm số:**
```
Prompt thêm cho Antigravity nếu cần:
"Tạo LineChart với Recharts hiện điểm 
qua các bài kiểm tra. Trục X là tên bài,
Trục Y từ 0-10. Thêm ReferenceLine ở 5 
điểm (đường trung bình) màu đỏ nét đứt."
```

---

*Dùng kết hợp với: README.md, FEATURE_LESSON_BUILDER.md, 
FEATURE_ATTENDANCE_SYSTEM.md, GUIDE_PARENT_STUDENT_LINKING.md*
