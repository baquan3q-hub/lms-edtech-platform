# 🚀 Feature Spec: 5 Tính năng Mới & Cải tiến
> Phân tích đầy đủ 5 yêu cầu — Prompt từng bước cho Antigravity

---

## 🔍 Phân tích 5 Yêu cầu

```
YÊU CẦU 1 — Phụ huynh xem full chat thông báo lớp
  Phụ huynh vào app → thấy toàn bộ tin nhắn/thông báo
  mà GV đã gửi đến học sinh và lớp học (read-only)

YÊU CẦU 2 — Thông báo nâng cấp: Multi-file + Quiz đính kèm
  GV tạo thông báo → upload NHIỀU file cùng lúc
  GV đính kèm bài trắc nghiệm ôn tập vào thông báo
  HS nhận thông báo → làm quiz ngay trong thông báo

YÊU CẦU 3 — Đảm bảo thông báo đến đúng người
  Thông báo lớp → ĐẾN ĐƯỢC tài khoản HS + PH
  Feedback GV → ĐẾN ĐƯỢC tài khoản HS + PH
  Kiểm tra và fix luồng dữ liệu

YÊU CẦU 4 — Tính năng Feedback (phản hồi) trong menu avatar
  Học sinh/Phụ huynh có thể gửi phản hồi/góp ý
  Đặt trong menu avatar (cùng với thông tin cá nhân + đăng xuất)

YÊU CẦU 5 — Cải tiến AI nhận xét cá nhân
  AI tự động: tích cực + động viên + điểm mạnh/yếu
  Tự tạo 5 câu trắc nghiệm theo lỗ hổng
  Nếu giỏi → đề xuất bài khó hơn
  GV được sửa trước khi gửi
  HS làm xong → thấy điểm → GV thấy tiến độ
```

---

## 🗄️ Database Schema bổ sung

```sql
-- Nâng cấp bảng announcements (thêm file + quiz)
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]',
  -- [{url, name, size, type}]
  ADD COLUMN IF NOT EXISTS quiz_id uuid REFERENCES assignments(id),
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{student,parent}',
  -- ['student'] | ['parent'] | ['student','parent']
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Bảng feedback phản hồi từ HS/PH
user_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id),
  role        text,         -- 'student' | 'parent'
  type        text,         -- 'bug' | 'suggestion' | 'complaint' | 'praise'
  title       text NOT NULL,
  content     text NOT NULL,
  status      text DEFAULT 'pending',
  -- 'pending' | 'reviewing' | 'resolved' | 'closed'
  admin_reply text,
  created_at  timestamp DEFAULT now(),
  resolved_at timestamp
)

-- Bảng theo dõi tiến độ làm quiz cải thiện
improvement_quiz_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     uuid REFERENCES quiz_individual_analysis(id),
  student_id      uuid REFERENCES users(id),
  answers         jsonb,    -- {q1: 'a', q2: 'c', ...}
  score           integer,  -- số câu đúng
  total           integer,  -- tổng số câu
  percentage      numeric(5,2),
  submitted_at    timestamp DEFAULT now()
)
```

---

## 📋 PROMPT 1 — Migration Database

```
Đọc README.md trước.
Tech stack: Next.js 14 + Supabase + TypeScript.

Tạo migration: supabase/migrations/[timestamp]_features_update.sql

PHẦN 1 — Nâng cấp bảng announcements:
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS quiz_id uuid REFERENCES assignments(id),
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{student,parent}',
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamp;

PHẦN 2 — Tạo bảng user_feedback:
CREATE TABLE IF NOT EXISTS user_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('student','parent')),
  type        text NOT NULL 
    CHECK (type IN ('bug','suggestion','complaint','praise')),
  title       text NOT NULL,
  content     text NOT NULL,
  status      text DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','resolved','closed')),
  admin_reply text,
  created_at  timestamp DEFAULT now(),
  resolved_at timestamp
);

PHẦN 3 — Tạo bảng improvement_quiz_results:
CREATE TABLE IF NOT EXISTS improvement_quiz_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     uuid REFERENCES quiz_individual_analysis(id) 
                  ON DELETE CASCADE,
  student_id      uuid REFERENCES users(id),
  answers         jsonb DEFAULT '{}',
  score           integer DEFAULT 0,
  total           integer DEFAULT 0,
  percentage      numeric(5,2) DEFAULT 0,
  submitted_at    timestamp DEFAULT now(),
  UNIQUE (analysis_id, student_id)
);

RLS:
-- user_feedback:
-- User chỉ INSERT + SELECT feedback của bản thân
-- Admin full access

-- improvement_quiz_results:
-- Student INSERT + SELECT của bản thân
-- Teacher SELECT của học sinh trong lớp mình
-- Admin full access

Đọc lại file sau khi tạo và xác nhận syntax đúng.
```

---

## 📋 PROMPT 2 — Phụ huynh xem full thông báo lớp

```
Đọc README.md trước.

YÊU CẦU 1: Phụ huynh xem toàn bộ thông báo
mà giáo viên đã gửi đến lớp của con.

BƯỚC 1 — Cập nhật RLS bảng announcements:
Tìm file migration hoặc RLS policy của bảng announcements.

Thêm policy cho phụ huynh:
-- Parent xem được announcements của lớp con mình
-- Điều kiện: class_id nằm trong enrollments của student
-- mà student đó nằm trong parent_students của parent

CREATE POLICY "parent_view_class_announcements"
ON announcements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parent_students ps
    JOIN enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid()
    AND e.class_id = announcements.class_id
  )
  AND 'parent' = ANY(target_roles)
);

BƯỚC 2 — Tạo trang thông báo lớp cho Phụ huynh:
app/parent/children/[studentId]/announcements/page.tsx

LAYOUT:
Header:
- "📢 Thông báo lớp — [Tên con]"
- Dropdown chọn lớp (nếu con học nhiều lớp)
- Badge số thông báo chưa đọc

Danh sách thông báo (dạng chat/feed):
Mỗi thông báo hiện dạng Card:
┌─────────────────────────────────────────┐
│ 📌 [GHIM] (nếu is_pinned)              │
│ Avatar GV + Tên GV        12/03 14:30  │
├─────────────────────────────────────────┤
│ 📢 Thông báo lịch học tuần tới         │
│                                         │
│ Nội dung đầy đủ hiển thị không truncate│
│ (Phụ huynh được đọc toàn bộ)           │
│                                         │
│ 📎 File đính kèm (nếu có):             │
│   📄 LichHoc_Tuan3.pdf  [Tải về]      │
│   📄 BaiTap_Module1.docx [Tải về]     │
│                                         │
│ 📝 Kèm bài trắc nghiệm (nếu có):      │
│   "Bài ôn tập Unit 3" — [Xem bài]     │
│   (Phụ huynh chỉ xem, không làm được) │
└─────────────────────────────────────────┘

Tính năng:
- Thông báo mới nhất ở trên cùng
- Ghim (pinned) luôn ở đầu
- Infinite scroll hoặc load more (20 thông báo/lần)
- Filter: Tất cả / Có file đính kèm / Có bài tập

BƯỚC 3 — Thêm link vào dashboard phụ huynh:
Trong app/parent/dashboard/page.tsx:
Thêm card "📢 Thông báo lớp" với:
- Số thông báo mới chưa đọc (badge đỏ)
- 3 thông báo gần nhất (preview ngắn)
- Nút "Xem tất cả" → /parent/children/[id]/announcements

BƯỚC 4 — Thêm vào Bottom Nav phụ huynh:
Trong component BottomNav, thêm tab 
"📢 Thông báo" cho role parent.

Dùng shadcn/ui: Card, Badge, Button, Avatar,
ScrollArea, Select, Separator
```

---

## 📋 PROMPT 3 — Nâng cấp tạo thông báo: Multi-file + Quiz đính kèm

```
Đọc README.md trước.

YÊU CẦU 2: Giáo viên tạo thông báo với 
nhiều file + quiz đính kèm.

BƯỚC 1 — Cập nhật form tạo thông báo:
Tìm trang tạo thông báo của giáo viên.
Thường ở: app/teacher/classes/[classId]/announcements/create/
hoặc component CreateAnnouncementModal.tsx

Viết lại form với các trường:

Tiêu đề (Input — bắt buộc)
Nội dung (Textarea — rich text hoặc markdown)
Ghim thông báo (Toggle/Switch)
Gửi đến (CheckboxGroup):
  ☑ Học sinh
  ☑ Phụ huynh

Upload NHIỀU FILE:
- Vùng kéo thả (drag & drop) hỗ trợ nhiều file
- Click để chọn nhiều file cùng lúc (multiple attribute)
- Chấp nhận: PDF, DOCX, PPTX, JPG, PNG, MP4
- Mỗi file tối đa 50MB, tổng tối đa 200MB
- Hiển thị danh sách file đã chọn:
  📄 LichHoc.pdf (2.3MB)  [✕ Xóa]
  📄 BaiTap.docx (1.1MB) [✕ Xóa]
  [+ Thêm file]
- Upload lên Supabase Storage bucket: "announcements"
- Sau khi upload → lưu array URL vào cột attachments

Đính kèm Quiz ôn tập (tùy chọn):
- Toggle "Đính kèm bài trắc nghiệm ôn tập"
- Khi bật → dropdown chọn bài quiz đã tạo:
  Select: [Chọn bài quiz...]
          Bài ôn tập Unit 3
          Kiểm tra từ vựng Module 1
          ...
- Hoặc nút "➕ Tạo quiz mới" → mở AIGenerateModal

BƯỚC 2 — Upload logic:
Tạo hàm uploadAnnouncementFiles:

async function uploadAnnouncementFiles(
  files: File[], 
  classId: string
): Promise<AttachmentInfo[]> {
  const results = []
  
  for (const file of files) {
    const fileName = `${classId}/${Date.now()}-${file.name}`
    
    const { data, error } = await supabase.storage
      .from('announcements')
      .upload(fileName, file, { upsert: false })
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from('announcements')
      .getPublicUrl(fileName)
    
    results.push({
      url: urlData.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type
    })
  }
  
  return results
}

BƯỚC 3 — Hiển thị thông báo có file cho Học sinh:
Tìm component hiển thị thông báo trong student view.
Cập nhật để render phần đính kèm:

// Với mỗi file trong attachments:
const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return '📄'
  if (type.includes('word')) return '📝'
  if (type.includes('presentation')) return '📊'
  if (type.includes('image')) return '🖼️'
  if (type.includes('video')) return '🎥'
  return '📎'
}

File list UI:
📎 File đính kèm (3 file):
[📄 LichHoc.pdf 2.3MB] [Tải về ↓]
[📝 BaiTap.docx 1.1MB] [Tải về ↓]
[🖼️ SoDoLopHoc.jpg] [Xem] [Tải về ↓]

BƯỚC 4 — Quiz đính kèm trong thông báo:
Nếu thông báo có quiz_id, thêm section:

📝 Bài ôn tập kèm theo:
┌────────────────────────────────────┐
│ 📝 Bài ôn tập Unit 3              │
│ 10 câu • 15 phút • Không giới hạn │
│                                    │
│ Của bạn: Chưa làm                 │
│ [▶️ Làm bài ngay]                 │
│                                    │
│ hoặc (nếu đã làm):               │
│ Điểm: 8/10 ✅  [Làm lại]         │
└────────────────────────────────────┘

Khi bấm "Làm bài" → mở QuizModal
(dùng lại component quiz đã có)

Tạo Supabase Storage bucket "announcements":
- Public bucket
- Max file size: 52428800 (50MB)
- Allowed types: tất cả common types

Dùng shadcn/ui: Switch, Checkbox, Select,
Button, Progress, Card, Badge
```

---

## 📋 PROMPT 4 — Đảm bảo thông báo đến đúng người

```
Đọc README.md trước.

YÊU CẦU 3: Kiểm tra và fix toàn bộ luồng
thông báo đến đúng tài khoản HS và PH.

BƯỚC 1 — Chẩn đoán (đọc code, chưa sửa):
Tìm tất cả nơi trong code có INSERT vào bảng notifications.
Với mỗi nơi, kiểm tra:
□ Có query đúng danh sách người nhận không?
□ user_id được truyền vào có đúng không?
□ target_roles được lọc đúng chưa?

Liệt kê kết quả.

BƯỚC 2 — Tạo helper function trung tâm:
Tạo file: lib/notifications/send-notification.ts

// Helper gửi notification đến nhiều người
export async function sendNotificationToClass({
  classId,
  title,
  message,
  type,
  metadata,
  targetRoles = ['student', 'parent']
}: {
  classId: string
  title: string
  message: string
  type: string
  metadata?: Record<string, unknown>
  targetRoles?: ('student' | 'parent' | 'teacher' | 'admin')[]
}) {
  const supabase = createClient()
  const notifications = []

  // Lấy danh sách học sinh trong lớp
  if (targetRoles.includes('student')) {
    const { data: students } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'active')

    students?.forEach(s => {
      notifications.push({
        user_id: s.student_id,
        title, message, type,
        metadata: metadata || {},
        read: false
      })
    })
  }

  // Lấy danh sách phụ huynh của học sinh trong lớp
  if (targetRoles.includes('parent')) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'active')

    const studentIds = enrollments?.map(e => e.student_id) || []

    const { data: parents } = await supabase
      .from('parent_students')
      .select('parent_id')
      .in('student_id', studentIds)

    // Deduplicate parent IDs (1 PH có thể có 2 con trong lớp)
    const uniqueParentIds = [...new Set(parents?.map(p => p.parent_id))]

    uniqueParentIds.forEach(parentId => {
      notifications.push({
        user_id: parentId,
        title, message, type,
        metadata: metadata || {},
        read: false
      })
    })
  }

  // Bulk insert
  if (notifications.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('Send notification error:', error)
      throw error
    }
  }

  return { sent: notifications.length }
}

BƯỚC 3 — Thay thế tất cả chỗ gửi thông báo:
Tìm tất cả nơi gửi notification trong app/api/
Thay thế bằng hàm sendNotificationToClass từ BƯỚC 2.

Các trường hợp cần fix:
a) Khi GV tạo announcement mới
b) Khi GV gửi feedback/nhận xét học sinh
c) Khi GV điểm danh xong
d) Khi GV hủy buổi học

BƯỚC 4 — Thêm cột metadata vào bảng notifications:
Kiểm tra bảng notifications có cột metadata chưa.
Nếu chưa:
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

BƯỚC 5 — Test gửi thông báo:
Tạo announcement test:
- Gửi đến: Học sinh + Phụ huynh
- Login từng account → kiểm tra có nhận được không
- Bấm vào notification → navigate đúng chỗ không

Báo cáo: X học sinh nhận được, Y phụ huynh nhận được.
```

---

## 📋 PROMPT 5 — Tính năng Feedback trong menu Avatar

```
Đọc README.md trước.

YÊU CẦU 4: Thêm "Gửi phản hồi" vào menu avatar.

BƯỚC 1 — Cập nhật UserMenu/AvatarMenu:
Tìm component menu avatar (thường trong Navbar hoặc Header).
Tên thường là: UserMenu.tsx, AvatarDropdown.tsx, ProfileMenu.tsx

Thêm item "📝 Gửi phản hồi" vào dropdown menu:

Menu hiện tại:          Menu sau khi thêm:
┌──────────────┐        ┌──────────────────┐
│ 👤 Hồ sơ    │        │ 👤 Hồ sơ         │
│ ⚙️ Cài đặt  │   →    │ ⚙️ Cài đặt       │
│ ─────────── │        │ ─────────────────│
│ 🚪 Đăng xuất│        │ 📝 Gửi phản hồi  │ ← THÊM MỚI
└──────────────┘        │ ─────────────────│
                        │ 🚪 Đăng xuất     │
                        └──────────────────┘

Chỉ hiện với role: student và parent
Không hiện với: teacher và admin

BƯỚC 2 — Tạo FeedbackModal component:
components/shared/FeedbackModal.tsx

Dialog/Sheet mở khi click "Gửi phản hồi":

┌────────────────────────────────────────┐
│ 📝 Gửi phản hồi                    [✕]│
├────────────────────────────────────────┤
│                                        │
│ Loại phản hồi:                        │
│ ○ 🐛 Báo lỗi                          │
│ ○ 💡 Góp ý cải thiện                  │
│ ○ 😤 Khiếu nại                        │
│ ○ 👏 Khen ngợi                        │
│                                        │
│ Tiêu đề: [_________________________]  │
│                                        │
│ Nội dung:                              │
│ ┌──────────────────────────────────┐  │
│ │ Nhập nội dung phản hồi...        │  │
│ │ (tối thiểu 20 ký tự)            │  │
│ └──────────────────────────────────┘  │
│ [Còn X ký tự]                         │
│                                        │
│ [Hủy]           [📤 Gửi phản hồi]    │
└────────────────────────────────────────┘

Validation:
- Loại phản hồi: bắt buộc chọn
- Tiêu đề: bắt buộc, 5-100 ký tự
- Nội dung: bắt buộc, tối thiểu 20 ký tự

Sau khi gửi:
- INSERT vào user_feedback table
- Toast: "✅ Phản hồi đã được gửi! Chúng tôi sẽ xem xét sớm."
- Đóng modal

BƯỚC 3 — Tạo trang Admin xem phản hồi:
app/admin/feedback/page.tsx

Bảng quản lý phản hồi:
Cột: Người gửi | Role | Loại | Tiêu đề | Ngày | Trạng thái | Hành động

Filter: Tất cả / Báo lỗi / Góp ý / Khiếu nại / Khen ngợi
Filter: Tất cả / Chờ xử lý / Đang xem xét / Đã giải quyết

Khi click "Xem chi tiết":
- Mở Dialog hiện đầy đủ nội dung
- Textarea nhập phản hồi từ Admin
- Nút "Cập nhật trạng thái" + "Gửi phản hồi"
- Nếu admin reply → gửi notification đến user

Dùng shadcn/ui: Dialog, RadioGroup, Textarea,
Select, Table, Badge, Button, Toast
```

---

## 📋 PROMPT 6 — Cải tiến AI nhận xét cá nhân (YÊU CẦU 5)

```
Đọc README.md trước.
Đọc thêm: FEATURE_AI_QUIZ_ANALYSIS.md

YÊU CẦU 5: Nâng cấp toàn diện AI nhận xét cá nhân.

BƯỚC 1 — Cập nhật Gemini Prompt:
Tìm file: app/api/ai/analyze-quiz-individual/route.ts
Viết lại hoàn toàn prompt gửi cho Gemini:

const isHighPerformer = (score / maxScore) >= 0.85

const prompt = isHighPerformer
  ? buildHighPerformerPrompt(studentName, score, maxScore, correctQuestions)
  : buildImprovementPrompt(studentName, score, maxScore, wrongQuestions)

// Prompt cho học sinh GIỎI (≥85%):
function buildHighPerformerPrompt(...) {
  return \`
Bạn là gia sư chuyên nghiệp, nhiệt tình.
Học sinh này đạt kết quả xuất sắc, hãy khen ngợi và thách thức thêm.

HỌC SINH: ${studentName}
ĐIỂM: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)
CÁC CÂU ĐÃ LÀM ĐÚNG: ${JSON.stringify(correctQuestions)}

Trả về JSON THUẦN TÚY:
{
  "performance_level": "excellent",
  "ai_feedback": "Lời khen ngợi chân thành 3-4 câu tiếng Việt.
    Nhấn mạnh điểm mạnh cụ thể. Động viên thử thách cao hơn.",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2", "Điểm mạnh 3"],
  "challenge_suggestion": "Đề xuất cụ thể nên học gì tiếp theo 
    để nâng cao hơn nữa (1-2 câu)",
  "improvement_tasks": [
    {
      "title": "Thử thách nâng cao: [Chủ đề khó hơn]",
      "knowledge_topic": "Chủ đề nâng cao",
      "difficulty": "hard",
      "estimated_time": "20 phút",
      "theory": {
        "explanation": "Kiến thức nâng cao...",
        "formula": "Công thức/quy tắc phức tạp hơn",
        "examples": ["Ví dụ khó hơn 1", "Ví dụ khó hơn 2"]
      },
      "mini_quiz": [
        5 câu hỏi mức độ KHÓ liên quan chủ đề nâng cao
      ]
    }
  ]
}
\`
}

// Prompt cho học sinh CẦN CẢI THIỆN (<85%):
function buildImprovementPrompt(...) {
  return \`
Bạn là gia sư chuyên nghiệp, thân thiện và kiên nhẫn.
Hãy viết nhận xét tích cực, động viên, KHÔNG chỉ trích.

HỌC SINH: ${studentName}
ĐIỂM: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)
CÁC CÂU LÀM SAI:
${JSON.stringify(wrongQuestions, null, 2)}

Trả về JSON THUẦN TÚY:
{
  "performance_level": "needs_improvement",
  "ai_feedback": "Nhận xét 4-5 câu tiếng Việt:
    1. Khen điểm tốt đã đạt được (tìm điểm sáng)
    2. Nhẹ nhàng chỉ ra phần cần cải thiện  
    3. Nêu điểm mạnh cụ thể
    4. Khuyến khích và tin tưởng em sẽ làm tốt hơn
    TUYỆT ĐỐI KHÔNG dùng từ: kém, tệ, sai nhiều, thất vọng",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "areas_to_improve": ["Kiến thức cần cải thiện 1", "...2"],
  "knowledge_gaps": ["Lỗ hổng cụ thể 1", "Lỗ hổng cụ thể 2"],
  "improvement_tasks": [
    {
      "title": "Tên kiến thức cần ôn",
      "knowledge_topic": "Tên chính xác",
      "difficulty": "medium",
      "estimated_time": "15 phút",
      "theory": {
        "explanation": "Giải thích đơn giản, dễ hiểu 2-3 câu",
        "formula": "Công thức/quy tắc (nếu có)",
        "examples": ["Ví dụ 1 dễ", "Ví dụ 2 vừa"],
        "tip": "Mẹo nhớ nhanh"
      },
      "mini_quiz": [
        ĐÚNG 5 câu trắc nghiệm liên quan trực tiếp 
        đến kiến thức bị sai trong bài kiểm tra.
        Câu hỏi phải khác với câu trong bài kiểm tra gốc
        nhưng test cùng kiến thức đó.
        Format mỗi câu:
        {
          "id": "q1",
          "question": "Câu hỏi?",
          "options": [
            {"id":"a","text":"Đáp án A"},
            {"id":"b","text":"Đáp án B"},
            {"id":"c","text":"Đáp án C"},
            {"id":"d","text":"Đáp án D"}
          ],
          "correct": "b",
          "explanation": "Giải thích tại sao đúng"
        }
      ]
    }
  ]
}

Tạo tối đa 2-3 improvement_tasks, 
mỗi task ứng với 1 lỗ hổng kiến thức khác nhau.
\`
}

BƯỚC 2 — Cập nhật TypeScript types:
Tìm file types/ hoặc thêm vào types/index.ts:

interface ImprovementTask {
  title: string
  knowledge_topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimated_time: string
  theory: {
    explanation: string
    formula?: string
    examples: string[]
    tip?: string
  }
  mini_quiz: MiniQuizQuestion[]
}

interface IndividualAnalysisResult {
  performance_level: 'excellent' | 'good' | 'needs_improvement'
  ai_feedback: string
  strengths: string[]
  areas_to_improve?: string[]
  knowledge_gaps?: string[]
  challenge_suggestion?: string  // chỉ có khi excellent
  improvement_tasks: ImprovementTask[]
}

BƯỚC 3 — Thêm điểm mini_quiz update đến GV:
Tìm hoặc tạo API: app/api/improvement-quiz/submit/route.ts

Khi học sinh submit mini_quiz:
1. Tính điểm: đếm số câu đúng
2. INSERT vào improvement_quiz_results
3. UPDATE improvement_progress status = 'completed'
4. Gửi notification đến GIÁO VIÊN:
   {
     title: "📊 [Tên HS] đã hoàn thành bài tập cải thiện",
     message: "Bài '[Tên task]': ${score}/${total} câu đúng 
               (${percentage}%)",
     type: "improvement_completed",
     metadata: {
       studentId, analysisId, taskTitle,
       score, total, percentage,
       url: "/teacher/classes/[classId]/students/[studentId]/progress"
     }
   }

BƯỚC 4 — Hiển thị trong trang theo dõi tiến độ GV:
Tìm trang giáo viên theo dõi học sinh.
Thêm section "Bài tập cải thiện đã làm":

Với mỗi học sinh đã làm improvement quiz:
┌──────────────────────────────────────────┐
│ 📊 Bài tập cải thiện — Nguyễn Thị A    │
│                                          │
│ ✅ Present Perfect: 4/5 đúng (80%)      │
│ ✅ Since vs For: 5/5 đúng (100%)        │
│ ⏳ Câu bị động: Chưa làm               │
│                                          │
│ Tổng tiến độ: 2/3 hoàn thành           │
└──────────────────────────────────────────┘
```

---

## 📋 PROMPT 7 — Trang GV xem + duyệt nhận xét trước khi gửi

```
Đọc README.md trước.

Cập nhật trang giáo viên xem và duyệt nhận xét AI:
app/teacher/classes/[classId]/assignments/[assignmentId]/analysis/page.tsx

TAB "Từng học sinh" — Cải tiến Drawer xem/sửa:

DRAWER MỞ RA KHI CLICK "Xem/Sửa":

SECTION 1 — Thông tin học sinh + điểm:
Avatar + Tên + Điểm X/Y
Badge performance: 
  "🌟 Xuất sắc" (≥85%) màu vàng
  "✅ Tốt" (70-84%) màu xanh
  "⚠️ Cần cải thiện" (<70%) màu cam

SECTION 2 — Nhận xét AI (GV có thể sửa):
Label: "💬 Lời nhận xét (GV có thể chỉnh sửa)"
Textarea với nội dung AI đã tạo
Badge nhỏ: "🤖 AI tạo" → đổi thành "✏️ Đã chỉnh sửa" khi GV sửa

SECTION 3 — Điểm mạnh + cần cải thiện:
Hiện dạng chips/tags có thể xóa hoặc thêm

SECTION 4 — Bài tập cải thiện (GV có thể sửa):
Với MỖI task, hiện 3 phần có thể edit:

[Task 1: Present Perfect]
┌─────────────────────────────────────┐
│ 📖 Lý thuyết:         [✏️ Sửa]    │
│ [Nội dung theory.explanation]       │
│                                     │
│ 📝 5 câu trắc nghiệm: [✏️ Sửa]   │
│ Câu 1: [nội dung] — Đáp án: B     │
│ Câu 2: [nội dung] — Đáp án: A     │
│ ...                                 │
│                                     │
│ [🔄 Tạo lại câu này bằng AI]       │
└─────────────────────────────────────┘

Nút "🔄 Tạo lại câu này bằng AI":
→ Gọi lại Gemini chỉ cho task đó
→ Hiện loading → thay thế content cũ bằng content mới

FOOTER DRAWER:
- DatePicker: Deadline làm bài tập
- [💾 Lưu nháp] — lưu không gửi
- [✅ Duyệt & Gửi] — lưu và gửi notification ngay

Khi bấm "Duyệt & Gửi":
1. Lưu teacher_edited_feedback + teacher_edited_tasks
2. UPDATE status = 'sent'
3. Gọi sendNotificationToClass() từ lib/notifications/
4. Toast: "✅ Đã gửi nhận xét đến [Tên HS] và phụ huynh"
5. Cập nhật badge trong bảng: "Đã gửi ✅"

Dùng shadcn/ui: Sheet, Textarea, Badge, 
DatePicker, Button, Separator, Skeleton
```

---

## 📋 PROMPT 8 — Kiểm tra toàn bộ 5 tính năng

```
Kiểm tra toàn bộ 5 tính năng vừa build.
Tạo test với 3 account: teacher@test, student@test, parent@test

━━━━━━━━━━━━━━━━━━━━━━━━
YC1 — PHỤ HUYNH XEM THÔNG BÁO LỚP:
□ PH login → thấy section "Thông báo lớp" trong dashboard
□ Vào trang announcements → thấy đầy đủ thông báo GV gửi
□ Nội dung hiện TOÀN BỘ (không bị cắt)
□ File đính kèm hiện và tải được
□ Quiz đính kèm hiện (read-only, không làm được)

━━━━━━━━━━━━━━━━━━━━━━━━
YC2 — THÔNG BÁO MULTI-FILE + QUIZ:
□ GV tạo thông báo → chọn nhiều file cùng lúc
□ File upload lên Supabase Storage thành công
□ Chọn quiz đính kèm từ danh sách
□ HS nhận thông báo → thấy file + quiz
□ HS bấm "Làm bài" → quiz mở được

━━━━━━━━━━━━━━━━━━━━━━━━
YC3 — THÔNG BÁO ĐẾN ĐÚNG NGƯỜI:
□ GV gửi thông báo lớp
□ TẤT CẢ học sinh trong lớp nhận được
□ TẤT CẢ phụ huynh của HS đó nhận được
□ HS lớp KHÁC không nhận được
□ PH của HS lớp KHÁC không nhận được

━━━━━━━━━━━━━━━━━━━━━━━━
YC4 — FEEDBACK TRONG MENU AVATAR:
□ HS login → click avatar → thấy "📝 Gửi phản hồi"
□ PH login → click avatar → thấy "📝 Gửi phản hồi"
□ GV login → click avatar → KHÔNG thấy mục này
□ Điền form → gửi → toast thành công
□ Admin login → vào /admin/feedback → thấy phản hồi vừa gửi

━━━━━━━━━━━━━━━━━━━━━━━━
YC5 — AI NHẬN XÉT CÁ NHÂN:
□ HS điểm thấp: nhận xét tích cực, có 5 câu quiz cải thiện
□ HS điểm cao (≥85%): nhận xét khen + bài thách thức hơn
□ GV xem drawer: thấy đầy đủ nhận xét + lý thuyết + quiz
□ GV sửa nội dung → badge đổi thành "✏️ Đã chỉnh sửa"
□ GV bấm "Duyệt & Gửi" → HS + PH nhận được
□ HS làm mini quiz → thấy kết quả từng câu + giải thích
□ HS submit → GV nhận notification tiến độ
□ GV vào trang theo dõi → thấy điểm mini quiz của HS

Với mỗi mục ❌ → fix ngay, test lại, confirm ✅.
```

---

## ⚠️ Thứ tự build bắt buộc

```
PROMPT 1 — Migration (nền tảng, làm trước tiên)
    ↓
PROMPT 2 — Phụ huynh xem thông báo lớp
    ↓
PROMPT 3 — Nâng cấp tạo thông báo (multi-file + quiz)
    ↓
PROMPT 4 — Fix luồng thông báo đến đúng người
    ↓
PROMPT 5 — Feedback trong menu avatar
    ↓
PROMPT 6 — Cải tiến AI nhận xét + mini quiz 5 câu
    ↓
PROMPT 7 — GV xem & duyệt nhận xét cải tiến
    ↓
PROMPT 8 — Test toàn bộ
```

---

## 💡 Lưu ý kỹ thuật

```
VỀ UPLOAD MULTI-FILE:
Không dùng Promise.all để upload song song
→ Dùng for...of loop để upload tuần tự
→ Tránh Supabase Storage rate limit

VỀ AI PROMPT CHO HỌC SINH GIỎI:
Phân ngưỡng:
  ≥85% → performance_level: "excellent" → bài thách thức
  70-84% → performance_level: "good" → ôn củng cố
  <70% → performance_level: "needs_improvement" → bài cải thiện

VỀ 5 CÂU QUIZ:
Đúng 5 câu, không ít hơn không nhiều hơn.
Nếu AI trả về ≠ 5 câu → validate và retry.

VỀ NOTIFICATION BULK INSERT:
Nếu lớp có 30 HS + 30 PH = 60 notifications
Dùng bulk insert 1 lần, không insert từng cái.
```

---

*Dùng kết hợp với: README.md, FEATURE_AI_QUIZ_ANALYSIS.md,
FIX_FEEDBACK_FLOW.md, FEATURE_DATA_FLOW_SYNC.md*
