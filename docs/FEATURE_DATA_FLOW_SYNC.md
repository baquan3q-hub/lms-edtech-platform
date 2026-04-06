# 🔄 Luồng Dữ liệu & Realtime Sync — E-Learning Platform
> Chuẩn hóa toàn bộ data flow: Điểm danh → Admin | Phụ huynh theo dõi con | Điểm chuyên cần học sinh

---

## 🧠 Phân tích vấn đề hiện tại

```
VẤN ĐỀ 1 — Điểm danh chưa sync đến Admin
  Giáo viên điểm danh xong → data lưu vào DB
  nhưng Admin không biết, không thấy realtime

VẤN ĐỀ 2 — Phụ huynh thiếu thông tin về con
  Phụ huynh cần thấy: lớp học, lịch học,
  điểm số, chuyên cần, bài tập, nhận xét GV
  → Hiện tại chưa có luồng dữ liệu đồng bộ

VẤN ĐỀ 3 — Học sinh chưa có điểm chuyên cần
  Cần hệ thống tính điểm + hiển thị 
  để khuyến khích học sinh đi học đều
```

---

## 🗺️ Thiết kế Luồng Dữ liệu Chuẩn

```
                    ┌─────────────────┐
                    │   SUPABASE DB   │
                    │  (Source of     │
                    │   Truth)        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     Supabase Realtime   Supabase RLS   TanStack Query
    (Push updates)      (Bảo mật data)  (Cache + Fetch)
              │              │              │
    ┌─────────▼──────────────▼──────────────▼─────────┐
    │                                                  │
    ▼              ▼              ▼              ▼
ADMIN           TEACHER        STUDENT        PARENT
(full view)    (own classes)  (own data)    (children data)
```

---

## 🗄️ Migration: Bổ sung bảng còn thiếu

```sql
-- attendance_sessions (đã có trong FEATURE_ATTENDANCE_SYSTEM.md)
-- attendance_records  (đã có)
-- absence_requests    (đã có)
-- student_class_stats (đã có trong FEATURE_CLASS_MANAGEMENT.md)

-- THÊM MỚI: Điểm chuyên cần học sinh (gamification)
attendance_points (
  id              uuid PRIMARY KEY,
  student_id      uuid REFERENCES users(id),
  class_id        uuid REFERENCES classes(id),
  session_id      uuid REFERENCES attendance_sessions(id),
  points_earned   integer,   -- điểm cộng cho buổi này
  reason          text,      -- lý do: 'present', 'perfect_week', 'streak_5'
  created_at      timestamp DEFAULT now()
)

-- THÊM MỚI: Streak & Badge học sinh
student_achievements (
  id              uuid PRIMARY KEY,
  student_id      uuid REFERENCES users(id),
  class_id        uuid REFERENCES classes(id),
  achievement_type text,
  -- 'streak_3'    = Đi học 3 buổi liên tiếp
  -- 'streak_5'    = Đi học 5 buổi liên tiếp
  -- 'streak_10'   = Đi học 10 buổi liên tiếp
  -- 'perfect_month' = Chuyên cần 100% cả tháng
  -- 'top_3'       = Top 3 chuyên cần lớp
  earned_at       timestamp DEFAULT now()
)
```

---

## 📋 PROMPT 1 — Chuẩn hóa Supabase Realtime cho toàn hệ thống

```
Đọc README.md trước. Tech stack: Next.js 14 App Router + 
Supabase Realtime + TanStack Query + Zustand.

Tạo file: hooks/useRealtimeSync.ts

Hook này là TRUNG TÂM xử lý realtime cho toàn app.
Dùng Supabase Realtime subscribe vào các bảng sau:

1. attendance_records — khi có INSERT hoặc UPDATE:
   Trigger cho: admin, teacher (cùng lớp), 
   student (bản thân), parent (có con trong lớp đó)

2. attendance_sessions — khi có INSERT (mở phiên mới):
   Trigger cho: admin, tất cả teacher

3. absence_requests — khi có INSERT hoặc UPDATE:
   Trigger cho: teacher của lớp đó, parent gửi đơn

4. submissions — khi có INSERT (học sinh nộp bài):
   Trigger cho: teacher của lớp đó

5. grade_reports — khi có INSERT (GV gửi báo cáo):
   Trigger cho: parent của học sinh đó

Cách implement đúng với Next.js 14 App Router:

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useRealtimeSync(userId: string, role: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records'
      }, (payload) => {
        // Invalidate TanStack Query cache để refetch data mới
        queryClient.invalidateQueries({ queryKey: ['attendance'] })
        queryClient.invalidateQueries({ queryKey: ['student-stats'] })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // Cập nhật Zustand notification store
        useNotificationStore.getState().addNotification(payload.new)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])
}

Nhúng hook này vào app/(dashboard)/layout.tsx 
để chạy cho tất cả trang sau khi đăng nhập.
Truyền vào userId và role từ Supabase Auth session.
```

---

## 📋 PROMPT 2 — Luồng điểm danh → Admin realtime

```
Đọc README.md trước.

Cập nhật luồng điểm danh để Admin nhận được 
thông tin ngay khi Giáo viên lưu xong.

BƯỚC 1 — Cập nhật API Route lưu điểm danh:
Tìm file xử lý lưu điểm danh (app/api/attendance/ hoặc 
server action trong app/teacher/...)

Sau khi INSERT attendance_records thành công, 
thêm logic:

// Tính tổng kết buổi điểm danh
const summary = {
  sessionId: session.id,
  classId: session.class_id,
  className: class.name,
  teacherName: teacher.full_name,
  sessionDate: session.session_date,
  totalStudents: records.length,
  presentCount: records.filter(r => r.status === 'present').length,
  absentCount: records.filter(r => r.status === 'absent').length,
  lateCount: records.filter(r => r.status === 'late').length,
  excusedCount: records.filter(r => r.status === 'excused').length,
  attendanceRate: (presentCount / totalStudents * 100).toFixed(1)
}

// Tạo notification cho Admin
await supabase.from('notifications').insert({
  user_id: adminId,  // query lấy tất cả user có role='admin'
  title: `Điểm danh hoàn tất — ${class.name}`,
  message: `GV ${teacher.full_name} vừa điểm danh. 
            Có mặt: ${summary.presentCount}/${summary.totalStudents} 
            (${summary.attendanceRate}%)`,
  type: 'attendance_completed',
  metadata: summary  -- thêm cột metadata jsonb vào bảng notifications
})

// Cập nhật student_class_stats cho từng học sinh
// (trigger PostgreSQL function đã tạo ở migration)

BƯỚC 2 — Dashboard Admin hiển thị realtime:
Tìm file: app/admin/dashboard/page.tsx
Hoặc tạo mới: app/admin/attendance/overview/page.tsx

Thêm section "📋 Điểm danh hôm nay":
- Dùng TanStack Query để fetch:
  useQuery({ queryKey: ['admin-attendance-today'] })
- useRealtimeSync hook đã tạo sẽ tự invalidate cache
  → UI tự cập nhật không cần reload

Hiển thị bảng:
Tên lớp | Giáo viên | Giờ điểm danh | Có mặt | Vắng | % | Trạng thái

Badge trạng thái:
  "Vừa cập nhật" (xanh, mờ dần sau 30s)
  "Đã điểm danh" (xám)
  "Chưa điểm danh" (đỏ nhạt — lớp đang học mà chưa có data)

BƯỚC 3 — Thêm cột metadata vào bảng notifications:
Tạo migration:
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ADD COLUMN IF NOT EXISTS type text DEFAULT 'general';

Đảm bảo RLS cho notifications:
- Admin xem được tất cả notifications của mình
- Mỗi user chỉ xem được notifications của bản thân
```

---

## 📋 PROMPT 3 — Luồng dữ liệu đầy đủ cho Phụ huynh

```
Đọc README.md trước.

Tạo data layer hoàn chỉnh cho phụ huynh theo dõi con.
Tất cả query đều phải đi qua RLS — phụ huynh 
chỉ thấy data của con mình (kiểm tra bảng parent_students).

Tạo file: lib/queries/parent-queries.ts

File này chứa tất cả TanStack Query hooks cho phụ huynh:

// 1. Lấy danh sách con của phụ huynh
export function useMyChildren(parentId: string) {
  return useQuery({
    queryKey: ['my-children', parentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('parent_students')
        .select(`
          student_id,
          relationship,
          users!student_id (
            id, full_name, avatar_url, email
          )
        `)
        .eq('parent_id', parentId)
      return data
    }
  })
}

// 2. Lớp học của con
export function useChildClasses(studentId: string) {
  return useQuery({
    queryKey: ['child-classes', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          class_id,
          status,
          enrolled_at,
          classes (
            id, name, room, schedule,
            users!teacher_id ( full_name, avatar_url )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')
      return data
    }
  })
}

// 3. Lịch học của con (upcoming sessions)
export function useChildSchedule(studentId: string, classId: string) {
  return useQuery({
    queryKey: ['child-schedule', studentId, classId],
    queryFn: async () => {
      const { data } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(10)
      return data
    }
  })
}

// 4. Điểm danh của con
export function useChildAttendance(studentId: string, classId: string) {
  return useQuery({
    queryKey: ['child-attendance', studentId, classId],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select(`
          *,
          attendance_sessions ( session_date, start_time, topic )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      return data
    }
  })
}

// 5. Điểm số của con
export function useChildGrades(studentId: string, classId: string) {
  return useQuery({
    queryKey: ['child-grades', studentId, classId],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments (
            title, type, max_score, deadline,
            lessons ( title )
          )
        `)
        .eq('student_id', studentId)
        .not('score', 'is', null)
        .order('submitted_at', { ascending: false })
      return data
    }
  })
}

// 6. Bài tập đang pending của con
export function useChildPendingAssignments(studentId: string) {
  return useQuery({
    queryKey: ['child-pending', studentId],
    queryFn: async () => {
      // Lấy assignments chưa có submission
      const { data } = await supabase
        .from('assignments')
        .select(`
          *,
          lessons ( class_id, classes ( name ) )
        `)
        .gt('deadline', new Date().toISOString())
        .not('id', 'in', 
          supabase
            .from('submissions')
            .select('assignment_id')
            .eq('student_id', studentId)
        )
      return data
    }
  })
}

// 7. Nhận xét của giáo viên
export function useChildTeacherFeedback(studentId: string) {
  return useQuery({
    queryKey: ['child-feedback', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('grade_reports')
        .select(`
          *,
          classes ( name ),
          users!teacher_id ( full_name, avatar_url )
        `)
        .eq('student_id', studentId)
        .order('sent_at', { ascending: false })
        .limit(20)
      return data
    }
  })
}

// 8. Thống kê tổng hợp của con
export function useChildStats(studentId: string, classId: string) {
  return useQuery({
    queryKey: ['child-stats', studentId, classId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_class_stats')
        .select('*')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .single()
      return data
    }
  })
}

Sau khi tạo xong file này, nhúng các hooks vào 
các trang phụ huynh tương ứng:
- app/parent/dashboard → useMyChildren + useChildStats
- app/parent/children/[id]/schedule → useChildSchedule
- app/parent/children/[id]/progress → useChildGrades + useChildAttendance
```

---

## 📋 PROMPT 4 — Dashboard Phụ huynh tổng hợp

```
Đọc README.md trước.

Cập nhật toàn bộ trang: app/parent/dashboard/page.tsx
Dùng tất cả hooks từ lib/queries/parent-queries.ts

Layout trang (dùng Server Component cho phần trên,
Client Component cho phần realtime):

PHẦN 1 — CHỌN CON (nếu có nhiều con):
Component: components/parent/ChildSelector.tsx
- Hiện avatar + tên từng con dạng Tab hoặc Card
- Lưu selectedChildId vào Zustand store
- Khi đổi con → tất cả section bên dưới cập nhật

PHẦN 2 — TỔNG QUAN (4 stat cards):
Dùng useChildStats hook:
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Chuyên cần  │  Điểm TB    │ Bài tập     │  Xếp hạng  │
│   X%        │   Y/10      │ Z còn lại   │  A/B HS    │
│ [progress]  │ [badge màu] │ [deadline]  │ [trend ↑↓] │
└─────────────┴─────────────┴─────────────┴─────────────┘

PHẦN 3 — LỊCH HỌC TUẦN NÀY:
Dùng useChildSchedule hook:
Hiện dạng timeline ngang 7 ngày:
[Thứ 2] [Thứ 3] [Thứ 4] [Thứ 5] [Thứ 6] [Thứ 7] [CN]
  ●                ●                ●
Có lớp   Không    Có lớp  Không   Có lớp
9:00AM           14:00PM         9:00AM

Click vào buổi học → Popover chi tiết:
  Tên lớp | Giờ | Phòng | Chủ đề hôm nay

PHẦN 4 — ĐIỂM DANH GẦN ĐÂY:
Dùng useChildAttendance hook:
Hiện 10 buổi gần nhất dạng list:
[✅ Thứ 2, 03/03] Tiếng Anh B1 — Có mặt
[❌ Thứ 4, 05/03] Tiếng Anh B1 — Vắng không phép
[📝 Thứ 6, 07/03] Tiếng Anh B1 — Vắng có phép

Nút "Xem tất cả" → /parent/children/[id]/attendance

PHẦN 5 — BÀI TẬP CẦN NỘP:
Dùng useChildPendingAssignments hook:
Hiện dạng list với badge deadline:
[🔴 Hôm nay]  Bài tập nghe Module 1
[🟡 2 ngày]   Bài kiểm tra Unit 3
[🟢 1 tuần]   Essay Writing

PHẦN 6 — ĐIỂM SỐ & NHẬN XÉT GẦN ĐÂY:
Dùng useChildGrades + useChildTeacherFeedback:
Hiện 5 điểm gần nhất + 2 nhận xét GV mới nhất
Nút "Xem chi tiết" → /parent/children/[id]/progress

PHẦN 7 — ĐƠN XIN NGHỈ:
Nút "📝 Tạo đơn xin nghỉ" → drawer form
Trạng thái các đơn gần đây

Tất cả data tự động cập nhật nhờ useRealtimeSync
đã được nhúng vào layout chung.

Dùng shadcn/ui: Card, Tabs, Badge, Progress,
Popover, Button, Separator, Avatar, Skeleton
(Skeleton cho loading state mỗi section)
```

---

## 📋 PROMPT 5 — Hệ thống Điểm Chuyên Cần cho Học Sinh

```
Đọc README.md trước.

Tạo hệ thống điểm chuyên cần gamification cho học sinh.
Mục tiêu: khuyến khích đi học đều, tạo động lực.

BƯỚC 1 — Migration bổ sung:
Tạo file: supabase/migrations/[timestamp]_attendance_points.sql

CREATE TABLE IF NOT EXISTS attendance_points (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid REFERENCES users(id),
  class_id        uuid REFERENCES classes(id),
  session_id      uuid REFERENCES attendance_sessions(id),
  points_earned   integer NOT NULL DEFAULT 0,
  reason          text NOT NULL,
  created_at      timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_achievements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid REFERENCES users(id),
  class_id         uuid REFERENCES classes(id),
  achievement_type text NOT NULL,
  earned_at        timestamp DEFAULT now(),
  UNIQUE (student_id, class_id, achievement_type)
);

-- View tổng điểm chuyên cần mỗi học sinh mỗi lớp
CREATE OR REPLACE VIEW student_attendance_points_summary AS
SELECT 
  student_id,
  class_id,
  SUM(points_earned) as total_points,
  COUNT(*) as total_sessions_rewarded
FROM attendance_points
GROUP BY student_id, class_id;

RLS:
- Student: SELECT của bản thân
- Parent: SELECT của con mình
- Teacher: SELECT của học sinh trong lớp mình
- Admin: Full access

BƯỚC 2 — Logic tính điểm (thêm vào API lưu điểm danh):
Tìm file xử lý POST điểm danh.
Sau khi lưu attendance_records, thêm logic tính điểm:

// Quy tắc tính điểm chuyên cần:
const POINTS_RULES = {
  present: 10,        // Có mặt đúng giờ: +10 điểm
  late: 5,           // Đi trễ: +5 điểm  
  excused: 8,        // Vắng có phép: +8 điểm
  absent: 0,         // Vắng không phép: 0 điểm
  
  // Bonus điểm đặc biệt (tính sau khi lưu tất cả):
  streak_3: 15,      // Đi học 3 buổi liên tiếp: +15 bonus
  streak_5: 30,      // Đi học 5 buổi liên tiếp: +30 bonus
  streak_10: 80,     // Đi học 10 buổi liên tiếp: +80 bonus
  perfect_week: 20,  // Có mặt đủ cả tuần: +20 bonus
}

// Sau khi tính điểm → INSERT vào attendance_points
// Kiểm tra streak → INSERT vào student_achievements nếu đạt

BƯỚC 3 — Hiển thị điểm chuyên cần cho Học sinh:
Tạo component: components/student/AttendancePointsCard.tsx

Giao diện:
┌────────────────────────────────────────┐
│  ⭐ Điểm Chuyên Cần                    │
│                                        │
│     🏆 1,250 điểm                      │
│     Xếp hạng: 3/30 trong lớp          │
│                                        │
│  Chuỗi hiện tại: 🔥 7 buổi liên tiếp  │
│  [████████░░] Còn 3 buổi → +80 điểm  │
│                                        │
│  Thành tích:                           │
│  🥉 Streak 3  🥈 Streak 5  ⬜ Streak 10│
│  ✅ Tuần hoàn hảo × 2                  │
└────────────────────────────────────────┘

Nhúng component này vào:
- app/student/dashboard/page.tsx
- app/student/classes/[classId]/page.tsx

BƯỚC 4 — Bảng xếp hạng điểm chuyên cần trong lớp:
Thêm vào Tab "Bảng xếp hạng" ở trang teacher và student:

Component: components/shared/AttendanceLeaderboard.tsx

Hiện top học sinh theo tổng điểm chuyên cần:
🥇 Nguyễn Thị A — 1,450 điểm — 🔥 12 buổi
🥈 Trần Văn B   — 1,280 điểm — 🔥 8 buổi  
🥉 Lê Thị C     — 1,250 điểm — 🔥 7 buổi
   ...

Dùng shadcn/ui: Card, Progress, Badge, Avatar
Dùng Recharts: BarChart cho lịch sử điểm theo tuần
```

---

## 📋 PROMPT 6 — Thông báo tự động đến Phụ huynh

```
Đọc README.md trước.

Tạo Supabase Edge Function để gửi thông báo 
tự động đến phụ huynh sau mỗi buổi điểm danh.

Tạo file: supabase/functions/notify-parents/index.ts

Function này được trigger bởi Database Webhook
khi có INSERT vào attendance_sessions với status='closed'
(tức là giáo viên đã đóng phiên điểm danh)

Logic xử lý:

1. Query tất cả attendance_records của session này
2. Với mỗi học sinh bị vắng (absent/late):
   a. Tìm phụ huynh của học sinh đó 
      (query parent_students table)
   b. Tạo in-app notification:
      INSERT vào notifications table:
      {
        user_id: parentId,
        title: "⚠️ Thông báo vắng học",
        message: "[Tên con] đã [vắng/đi trễ] buổi học 
                  [Tên lớp] ngày [ngày] lúc [giờ]",
        type: "attendance_alert",
        metadata: { studentId, classId, sessionId, status }
      }
   c. Gửi email qua Resend (nếu parent có email):
      Template ngắn gọn:
      "Con bạn [Tên] đã vắng buổi học hôm nay.
       Xem chi tiết: [link app]"

3. Với học sinh có mặt đủ (nếu đã 1 tuần đủ buổi):
   Gửi thông báo tích cực:
   "🌟 [Tên con] đã có mặt đủ cả tuần! Tuyệt vời!"

4. Gửi tóm tắt ngày cho TẤT CẢ phụ huynh trong lớp
   (dù con có vắng hay không):
   {
     title: "📊 Tóm tắt buổi học hôm nay — [Tên lớp]",
     message: "Chủ đề: [topic]. Con bạn: [trạng thái].
               Bài tập về nhà: [homework nếu có]"
   }

Đăng ký Database Webhook trong Supabase Dashboard:
Table: attendance_sessions
Event: UPDATE (khi status đổi thành 'closed')
URL: [Supabase Edge Function URL]

Sau khi tạo Edge Function:
- Deploy: supabase functions deploy notify-parents
- Test bằng cách đóng 1 phiên điểm danh thử
```

---

## 📋 PROMPT 7 — Kiểm tra toàn bộ Data Flow

```
Kiểm tra toàn bộ luồng dữ liệu của hệ thống.
Đọc tất cả file liên quan, test từng luồng.

LUỒNG 1 — Điểm danh → Admin:
□ Giáo viên lưu điểm danh
□ notification được tạo cho tất cả admin
□ Admin dashboard hiện cập nhật trong vòng 3 giây
□ Không cần reload trang
□ Badge số thông báo admin tăng lên

LUỒNG 2 — Phụ huynh xem lớp học của con:
□ useChildClasses hook trả về đúng lớp đang học
□ RLS chặn phụ huynh xem lớp của người khác
□ Thông tin giáo viên hiển thị đúng

LUỒNG 3 — Phụ huynh xem lịch học:
□ Calendar hiện đúng các buổi có lịch học
□ Màu sắc theo trạng thái điểm danh
□ Click vào ngày → hiện đúng thông tin buổi học
□ Chủ đề buổi học (topic từ class_sessions) hiển thị

LUỒNG 4 — Phụ huynh xem điểm số:
□ useChildGrades hook trả về đúng điểm
□ Biểu đồ LineChart hiện đúng trend
□ Phụ huynh không xem được điểm của học sinh khác

LUỒNG 5 — Phụ huynh xem bài tập:
□ useChildPendingAssignments hiện đúng bài chưa nộp
□ Deadline được highlight đúng màu
□ Bài đã nộp không hiện trong pending list

LUỒNG 6 — Phụ huynh xem nhận xét GV:
□ grade_reports hiện đúng nhận xét theo thời gian
□ Nhận xét mới nhất ở trên cùng

LUỒNG 7 — Thông báo tự động:
□ Phụ huynh nhận thông báo khi con vắng
□ Phụ huynh nhận tóm tắt cuối buổi học
□ Email gửi thành công qua Resend
□ In-app notification bell cập nhật

LUỒNG 8 — Điểm chuyên cần học sinh:
□ Điểm được tính đúng sau khi điểm danh
□ Streak được phát hiện và thưởng điểm bonus
□ Achievements được cấp đúng điều kiện
□ Bảng xếp hạng sort đúng thứ tự
□ Phụ huynh cũng thấy điểm chuyên cần của con

Với mỗi mục ❌:
1. Đọc code liên quan
2. Tìm nguyên nhân  
3. Fix và test lại
4. Xác nhận ✅ trước khi báo cáo xong
```

---

## ⚠️ Thứ tự Build & Lưu ý

```
PROMPT 1 — Realtime Sync hook (nền tảng realtime)
    ↓
PROMPT 2 — Điểm danh → Admin (fix luồng đang thiếu)
    ↓
PROMPT 3 — Data layer phụ huynh (tất cả queries)
    ↓
PROMPT 4 — Dashboard phụ huynh (dùng queries từ P3)
    ↓
PROMPT 5 — Điểm chuyên cần học sinh (gamification)
    ↓
PROMPT 6 — Edge Function thông báo tự động
    ↓
PROMPT 7 — Test toàn bộ
```

---

## 🔑 Nguyên tắc Data Flow trong project này

```
ĐÚNG ✅ — Luồng chuẩn Next.js 14 + Supabase:

Server Component         Client Component
(fetch 1 lần)    +      (realtime update)
     ↓                        ↓
TanStack Query          Supabase Realtime
(cache + refetch)       (invalidate cache)
     ↓                        ↓
     └──────────────┬──────────┘
                    ↓
               UI tự cập nhật

SAI ❌ — Tránh làm:
- Dùng useEffect + fetch thủ công thay TanStack Query
- Subscribe Realtime nhưng không invalidate cache
- Fetch data trong Client Component mà không có Server Component
- Để business logic trong component thay vì lib/queries
```

---

*Dùng kết hợp với toàn bộ các file spec đã có trong project*
