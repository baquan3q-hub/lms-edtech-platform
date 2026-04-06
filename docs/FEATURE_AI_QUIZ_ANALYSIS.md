# 🧠 Feature Spec: AI Phân tích Bài Kiểm tra
> Phân tích tổng thể lớp + Cá nhân hóa nhận xét + Bài tập cải thiện

---

## 🔍 Phân tích yêu cầu

```
2 TẦNG PHÂN TÍCH AI:

TẦNG 1 — Phân tích TỔNG THỂ (dành cho Giáo viên)
  Sau khi cả lớp nộp bài → AI đọc toàn bộ kết quả
  → Báo cáo sức khỏe bài kiểm tra của cả lớp
  → Câu nào khó nhất, dễ nhất
  → Kiến thức nào cả lớp đang yếu
  → Gợi ý giáo viên dạy lại phần nào

TẦNG 2 — Phân tích CÁ NHÂN (dành cho từng Học sinh)
  AI đọc đáp án sai của từng em
  → Xác định lỗ hổng kiến thức cụ thể
  → Viết nhận xét cá nhân hóa
  → Tạo bài tập cải thiện phù hợp với lỗ hổng đó
  → Gửi thông báo đến học sinh

LUỒNG DỮ LIỆU:
  Học sinh nộp bài
       ↓
  Hệ thống chấm điểm tự động
       ↓
  AI phân tích cá nhân (chạy nền)
       ↓
  GV xem báo cáo tổng thể
       ↓
  GV review + duyệt nhận xét AI
       ↓
  Học sinh nhận thông báo + bài tập cải thiện
```

---

## 🗺️ Thiết kế UI

### Màn hình 1 — Trang kết quả bài kiểm tra (Giáo viên)

```
┌──────────────────────────────────────────────────────┐
│  📊 Kết quả: Bài KT Unit 3 — Lớp Tiếng Anh B1       │
│  Đã nộp: 25/30 học sinh • Hạn: 10/03/2026           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [📋 Danh sách] [📊 Phân tích AI] [📤 Xuất báo cáo] │
│                                                      │
└──────────────────────────────────────────────────────┘

TAB "Phân tích AI":
┌──────────────────────────────────────────────────────┐
│  🤖 AI đã phân tích 25 bài nộp                       │
│  [✨ Xem phân tích tổng thể]  [📩 Gửi nhận xét]     │
├────────────────┬─────────────────────────────────────┤
│                │                                     │
│  TỔNG QUAN     │  PHÂN TÍCH TỪNG CÂU                │
│                │                                     │
│  Điểm TB: 6.8  │  Câu 1 ✅ Đúng: 92%               │
│  Cao nhất: 10  │  Câu 2 ⚠️ Đúng: 45%  ← Câu khó   │
│  Thấp nhất: 3  │  Câu 3 ✅ Đúng: 88%               │
│  Đạt: 18/25    │  Câu 4 ❌ Đúng: 32%  ← Câu yếu   │
│                │  Câu 5 ⚠️ Đúng: 56%               │
└────────────────┴─────────────────────────────────────┘
```

### Màn hình 2 — Báo cáo AI tổng thể lớp

```
┌──────────────────────────────────────────────────────┐
│  🤖 Báo cáo AI — Tổng thể lớp                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📌 TÓM TẮT                                         │
│  Lớp làm tốt kỹ năng [từ vựng], còn yếu ở [ngữ     │
│  pháp thì hiện tại hoàn thành].                     │
│                                                      │
│  💪 ĐIỂM MẠNH CỦA LỚP                              │
│  • 85% học sinh nắm vững từ vựng chủ đề Animals     │
│  • Kỹ năng đọc hiểu đoạn ngắn tốt (TB: 8.2/10)    │
│                                                      │
│  ⚠️ ĐIỂM YẾU CẦN CẢI THIỆN                        │
│  • Ngữ pháp: Present Perfect — 68% trả lời sai      │
│  • Phân biệt "since" vs "for" — 71% chọn sai        │
│  • Câu bị động — 55% còn lúng túng                  │
│                                                      │
│  🎯 GỢI Ý GIÁO VIÊN                                │
│  Nên dạy lại: Present Perfect (1 buổi)             │
│  Bài tập thêm: 10 câu luyện since/for              │
│  Học sinh cần chú ý đặc biệt: [5 em]               │
│                                                      │
│  📊 PHÂN BỐ ĐIỂM SỐ                                │
│  0-4:  ██ 2 HS                                      │
│  5-6:  █████ 5 HS                                   │
│  7-8:  ████████ 8 HS                                │
│  9-10: ██████████ 10 HS                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Màn hình 3 — Nhận xét cá nhân từng học sinh

```
┌──────────────────────────────────────────────────────┐
│  👤 Nguyễn Thị A — 6.5/10 — Chưa đạt               │
├──────────────────────────────────────────────────────┤
│  🤖 Nhận xét AI:                    [✏️ Sửa] [📩 Gửi]│
│  ┌──────────────────────────────────────────────┐   │
│  │ Em làm tốt phần từ vựng (câu 1,3,5 đúng).   │   │
│  │ Tuy nhiên em đang gặp khó khăn với ngữ pháp  │   │
│  │ Present Perfect — đặc biệt cách dùng "since" │   │
│  │ và "for". Em cần ôn lại quy tắc này.         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  🎯 Bài tập cải thiện AI đề xuất:  [✏️ Sửa] [📩 Gửi]│
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. Điền since/for vào chỗ trống (10 câu)    │   │
│  │ 2. Chuyển câu sang Present Perfect (5 câu)  │   │
│  │ 3. Video học: "Since vs For" (10 phút)       │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ⚠️ Kiến thức hổng phát hiện:                      │
│  • Present Perfect tense                            │
│  • Since vs For                                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Màn hình 4 — Học sinh nhận thông báo

```
┌──────────────────────────────────────────────────────┐
│  🔔 Nhận xét bài kiểm tra Unit 3                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Điểm của bạn: 6.5/10                               │
│  [██████░░░░] Chưa đạt (cần ≥ 7.0)                 │
│                                                      │
│  💬 Nhận xét từ giáo viên:                          │
│  "Em làm tốt phần từ vựng... [xem thêm]"           │
│                                                      │
│  📚 Bài tập cải thiện:           Deadline: 15/03   │
│  ┌──────────────────────────────────────────┐       │
│  │ ☐ Bài tập 1: Điền since/for (10 câu)   │       │
│  │ ☐ Bài tập 2: Chuyển câu PP (5 câu)     │       │
│  │ ☐ Xem video: Since vs For              │       │
│  └──────────────────────────────────────────┘       │
│  [✏️ Làm bài tập ngay]                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema bổ sung

```sql
-- Phân tích AI tổng thể cho bài kiểm tra
quiz_class_analysis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id     uuid REFERENCES assignments(id),
  class_id          uuid REFERENCES classes(id),
  teacher_id        uuid REFERENCES users(id),
  total_submissions integer,
  avg_score         numeric(5,2),
  pass_count        integer,
  fail_count        integer,
  -- Kết quả AI phân tích
  strengths         text[],        -- điểm mạnh cả lớp
  weaknesses        text[],        -- điểm yếu cả lớp
  knowledge_gaps    jsonb,         -- kiến thức bị hổng
  question_stats    jsonb,         -- thống kê từng câu
  teaching_suggestions text[],    -- gợi ý cho GV
  score_distribution jsonb,        -- phân bố điểm 0-4,5-6,7-8,9-10
  ai_summary        text,          -- tóm tắt tổng thể bằng văn xuôi
  generated_at      timestamp DEFAULT now(),
  status            text DEFAULT 'draft'
  -- 'draft' = AI đã tạo, GV chưa xem
  -- 'reviewed' = GV đã xem
  -- 'sent' = đã gửi cho học sinh
)

-- Phân tích AI cá nhân từng học sinh
quiz_individual_analysis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     uuid REFERENCES submissions(id),
  student_id        uuid REFERENCES users(id),
  assignment_id     uuid REFERENCES assignments(id),
  -- Lỗ hổng kiến thức
  knowledge_gaps    text[],        -- ["Present Perfect", "Since vs For"]
  wrong_questions   jsonb,         -- chi tiết câu sai + lý do
  -- Nhận xét AI
  ai_feedback       text,          -- nhận xét cá nhân hóa
  -- Bài tập cải thiện
  improvement_tasks jsonb,
  -- [{
  --   "type": "exercise"|"video"|"reading",
  --   "title": "Điền since/for",
  --   "description": "...",
  --   "content": "...",  ← nội dung bài tập thật
  --   "estimated_time": "15 phút"
  -- }]
  -- Trạng thái duyệt
  teacher_edited_feedback text,    -- GV có thể sửa nhận xét AI
  teacher_edited_tasks    jsonb,   -- GV có thể sửa bài tập
  status            text DEFAULT 'ai_draft',
  -- 'ai_draft'    = AI tạo xong, GV chưa duyệt
  -- 'approved'    = GV đã duyệt (dùng nguyên AI)
  -- 'edited'      = GV đã sửa
  -- 'sent'        = Đã gửi cho học sinh
  sent_at           timestamp,
  deadline          timestamp,     -- deadline làm bài tập cải thiện
  created_at        timestamp DEFAULT now()
)

-- Tiến độ làm bài tập cải thiện
improvement_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       uuid REFERENCES quiz_individual_analysis(id),
  student_id        uuid REFERENCES users(id),
  task_index        integer,       -- bài tập thứ mấy
  status            text DEFAULT 'pending',
  -- 'pending' | 'in_progress' | 'completed'
  completed_at      timestamp
)
```

---

## 📋 PROMPT 1 — Database Migration

```
Đọc README.md trước.
Tech stack: Next.js 14 + Supabase + TypeScript.

Tạo migration: supabase/migrations/[timestamp]_quiz_ai_analysis.sql

Tạo đúng 3 bảng:

1. quiz_class_analysis:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE
   - class_id uuid REFERENCES classes(id)
   - teacher_id uuid REFERENCES users(id)
   - total_submissions integer DEFAULT 0
   - avg_score numeric(5,2)
   - pass_count integer DEFAULT 0
   - fail_count integer DEFAULT 0
   - strengths text[] DEFAULT '{}'
   - weaknesses text[] DEFAULT '{}'
   - knowledge_gaps jsonb DEFAULT '[]'
   - question_stats jsonb DEFAULT '{}'
   - teaching_suggestions text[] DEFAULT '{}'
   - score_distribution jsonb DEFAULT '{}'
   - ai_summary text
   - generated_at timestamp DEFAULT now()
   - status text DEFAULT 'draft'
     CHECK (status IN ('draft','reviewed','sent'))
   - UNIQUE (assignment_id)

2. quiz_individual_analysis:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - submission_id uuid REFERENCES submissions(id) ON DELETE CASCADE
   - student_id uuid REFERENCES users(id)
   - assignment_id uuid REFERENCES assignments(id)
   - knowledge_gaps text[] DEFAULT '{}'
   - wrong_questions jsonb DEFAULT '[]'
   - ai_feedback text
   - improvement_tasks jsonb DEFAULT '[]'
   - teacher_edited_feedback text
   - teacher_edited_tasks jsonb
   - status text DEFAULT 'ai_draft'
     CHECK (status IN ('ai_draft','approved','edited','sent'))
   - sent_at timestamp
   - deadline timestamp
   - created_at timestamp DEFAULT now()
   - UNIQUE (submission_id)

3. improvement_progress:
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - analysis_id uuid REFERENCES quiz_individual_analysis(id)
   - student_id uuid REFERENCES users(id)
   - task_index integer NOT NULL
   - status text DEFAULT 'pending'
     CHECK (status IN ('pending','in_progress','completed'))
   - completed_at timestamp
   - UNIQUE (analysis_id, task_index)

RLS:
- Teacher: CRUD quiz_class_analysis và quiz_individual_analysis
  của assignment trong class mình dạy
- Student: SELECT quiz_individual_analysis của bản thân
  (chỉ khi status = 'sent')
- Student: UPDATE improvement_progress của bản thân
- Admin: Full access

Đọc lại file và xác nhận syntax đúng trước khi báo cáo xong.
```

---

## 📋 PROMPT 2 — API Route: Phân tích tổng thể lớp

```
Đọc README.md trước.

Tạo file: app/api/ai/analyze-quiz-class/route.ts

API nhận POST với body:
{ assignmentId: string, classId: string }

Logic xử lý:

BƯỚC 1 — Thu thập dữ liệu:
Query tất cả submissions của assignment này:
const submissions = await supabase
  .from('submissions')
  .select(`
    *,
    users!student_id (id, full_name),
    quiz_attempts (answers, score)
  `)
  .eq('assignment_id', assignmentId)

Query tất cả câu hỏi của bài kiểm tra:
const questions = await supabase
  .from('quiz_questions')
  .select('*')
  .eq('assignment_id', assignmentId)
  .order('order_index')

BƯỚC 2 — Tính thống kê từng câu:
Với mỗi câu hỏi, tính:
- Số học sinh trả lời đúng / tổng
- Đáp án nào được chọn nhiều nhất (kể cả sai)
- % đúng của câu đó

const questionStats = questions.map(q => {
  const answers = submissions.map(s => 
    s.quiz_attempts?.[0]?.answers?.[q.id]
  )
  const correctCount = answers.filter(a => a === q.correct).length
  return {
    questionId: q.id,
    content: q.content,
    correctRate: correctCount / submissions.length * 100,
    mostChosenWrong: /* tính đáp án sai phổ biến nhất */,
    difficulty: correctRate < 40 ? 'hard' : 
                correctRate < 70 ? 'medium' : 'easy'
  }
})

BƯỚC 3 — Tính phân bố điểm:
const scoreDistribution = {
  '0-4':  submissions.filter(s => s.score <= 4).length,
  '5-6':  submissions.filter(s => s.score > 4 && s.score <= 6).length,
  '7-8':  submissions.filter(s => s.score > 6 && s.score <= 8).length,
  '9-10': submissions.filter(s => s.score > 8).length,
}

BƯỚC 4 — Gọi Gemini API phân tích:
Prompt gửi cho Gemini:

const prompt = `
Bạn là chuyên gia phân tích giáo dục.
Phân tích kết quả bài kiểm tra sau và trả về JSON thuần túy.

THÔNG TIN BÀI KIỂM TRA:
- Tổng số bài nộp: ${submissions.length}
- Điểm trung bình: ${avgScore}
- Điểm cao nhất: ${maxScore}, thấp nhất: ${minScore}
- Tỷ lệ đạt: ${passRate}%

THỐNG KÊ TỪNG CÂU:
${JSON.stringify(questionStats, null, 2)}

Trả về JSON với cấu trúc:
{
  "ai_summary": "Tóm tắt tổng thể bằng 2-3 câu tiếng Việt",
  "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
  "weaknesses": ["điểm yếu 1", "điểm yếu 2"],
  "knowledge_gaps": [
    {
      "topic": "Tên kiến thức bị hổng",
      "severity": "high|medium|low",
      "affected_students_percent": 68,
      "evidence": "Câu 4,7 có tỷ lệ sai cao"
    }
  ],
  "teaching_suggestions": [
    "Gợi ý cụ thể cho giáo viên 1",
    "Gợi ý cụ thể cho giáo viên 2"
  ]
}
`

const result = await callGeminiWithRetry(prompt)

BƯỚC 5 — Lưu vào database:
INSERT vào quiz_class_analysis với:
- Tất cả dữ liệu tính được ở trên
- status: 'draft'

Trả về kết quả phân tích.

Xử lý lỗi:
- Chưa đủ submissions (< 3) → báo lỗi "Cần ít nhất 3 bài nộp để phân tích"
- Gemini 429 → retry 3 lần với exponential backoff
- Parse JSON lỗi → retry 1 lần với prompt đơn giản hơn
```

---

## 📋 PROMPT 3 — API Route: Phân tích cá nhân từng học sinh

```
Đọc README.md trước.

Tạo file: app/api/ai/analyze-quiz-individual/route.ts

API nhận POST với body:
{ submissionId: string }

Hoặc nhận POST với body:
{ assignmentId: string }  ← phân tích tất cả học sinh cùng lúc

Logic xử lý (cho 1 học sinh):

BƯỚC 1 — Lấy dữ liệu submission:
const submission = await supabase
  .from('submissions')
  .select(`
    *,
    users!student_id (id, full_name),
    quiz_attempts (answers, score, submitted_at),
    assignments (title, max_score,
      quiz_questions (*)
    )
  `)
  .eq('id', submissionId)
  .single()

BƯỚC 2 — Xác định câu sai và phân tích:
const wrongQuestions = submission.assignments.quiz_questions
  .filter(q => 
    submission.quiz_attempts[0]?.answers?.[q.id] !== q.correct
  )
  .map(q => ({
    questionId: q.id,
    content: q.content,
    studentAnswer: submission.quiz_attempts[0]?.answers?.[q.id],
    correctAnswer: q.correct,
    options: q.options,
    explanation: q.explanation
  }))

BƯỚC 3 — Gọi Gemini phân tích cá nhân:
const prompt = `
Bạn là gia sư tiếng Anh chuyên nghiệp, thân thiện.
Phân tích bài làm của học sinh và tạo nhận xét + bài tập cá nhân hóa.

HỌC SINH: ${student.full_name}
ĐIỂM: ${submission.score}/${submission.assignments.max_score}

CÂU LÀM SAI:
${JSON.stringify(wrongQuestions, null, 2)}

Trả về JSON thuần túy:
{
  "knowledge_gaps": ["Tên kiến thức 1", "Tên kiến thức 2"],
  "ai_feedback": "Nhận xét thân thiện, cụ thể, bằng tiếng Việt, 
                  3-4 câu. Khen điểm tốt trước, góp ý sau.",
  "improvement_tasks": [
    {
      "type": "exercise",
      "title": "Tên bài tập ngắn gọn",
      "description": "Mô tả bài tập",
      "content": "Nội dung bài tập thật (3-5 câu hỏi cụ thể)",
      "answer_key": "Đáp án tham khảo",
      "estimated_time": "10 phút"
    },
    {
      "type": "video",
      "title": "Video học bù",
      "description": "Xem video để hiểu rõ hơn về [chủ đề]",
      "content": "Tìm kiếm: [từ khóa YouTube]",
      "estimated_time": "15 phút"
    }
  ]
}
`

Tạo tối đa 3 bài tập cải thiện, ưu tiên:
- 1 bài tập trực tiếp về kiến thức hổng
- 1 bài tập ứng dụng tổng hợp  
- 1 tài nguyên học thêm (video/đọc)

BƯỚC 4 — Lưu vào quiz_individual_analysis:
- Lưu tất cả kết quả phân tích
- status: 'ai_draft'
- deadline: 7 ngày từ hôm nay

Xử lý hàng loạt (khi nhận assignmentId):
- Dùng Promise.allSettled để chạy song song tối đa 5 học sinh/lúc
- Tránh gọi Gemini quá nhanh → thêm delay 1s giữa các batch
- Trả về: { success: X, failed: Y, errors: [...] }
```

---

## 📋 PROMPT 4 — Trang Giáo viên: Xem & Duyệt phân tích

```
Đọc README.md trước.

Tạo trang tại:
app/teacher/classes/[classId]/assignments/[assignmentId]/analysis/page.tsx

PHẦN HEADER:
- Tên bài kiểm tra + Tên lớp
- Badge: "X/Y học sinh đã nộp"
- Nút "🤖 Chạy phân tích AI" 
  (disabled nếu < 3 submissions hoặc đang xử lý)
- Loading state khi AI đang chạy: 
  "🤖 AI đang phân tích X bài nộp..."

═══════════════════════════════════════
TABS: [📊 Tổng thể lớp] [👤 Từng học sinh]
═══════════════════════════════════════

TAB 1 — TỔNG THỂ LỚP:
Hiển thị quiz_class_analysis nếu đã có, 
nếu chưa có hiện nút "Chạy phân tích".

Section A — Tổng quan (4 stat cards):
Điểm TB | Tỷ lệ đạt | Câu khó nhất | Kiến thức yếu nhất

Section B — Phân bố điểm (BarChart Recharts):
Trục X: khoảng điểm (0-4, 5-6, 7-8, 9-10)
Trục Y: số học sinh
Màu bars: đỏ→vàng→xanh theo thứ tự

Section C — Thống kê từng câu:
Bảng: STT | Nội dung câu | % đúng | Độ khó | Đáp án sai phổ biến
Row màu đỏ nhạt nếu % đúng < 50%

Section D — AI Analysis (Card nổi bật):
┌─────────────────────────────────────┐
│ 🤖 Nhận xét của AI                  │
│ [ai_summary hiển thị ở đây]         │
│                                     │
│ 💪 Điểm mạnh:                      │
│ • [strength 1]                      │
│ • [strength 2]                      │
│                                     │
│ ⚠️ Kiến thức cần ôn lại:           │
│ • [weakness 1] — X% học sinh yếu   │
│ • [weakness 2] — Y% học sinh yếu   │
│                                     │
│ 💡 Gợi ý cho giáo viên:            │
│ • [suggestion 1]                    │
│ • [suggestion 2]                    │
└─────────────────────────────────────┘

TAB 2 — TỪNG HỌC SINH:
Bảng danh sách học sinh đã nộp:
Cột: Tên | Điểm | Xếp loại | Kiến thức hổng | Trạng thái | Hành động

Cột "Hành động":
- Badge "AI Draft" → nút [👁️ Xem] [✅ Duyệt] [✏️ Sửa]
- Badge "Đã duyệt" → nút [📩 Gửi]
- Badge "Đã gửi" → nút [👁️ Xem]

Nút "📩 Gửi tất cả" → gửi cho tất cả học sinh đã được duyệt

DRAWER "Xem/Sửa nhận xét":
Mở Drawer bên phải khi click [Xem] hoặc [Sửa]:
- Thông tin học sinh + điểm
- Textarea nhận xét (có thể sửa nội dung AI)
- List bài tập cải thiện (có thể sửa từng bài)
- DatePicker chọn deadline
- Nút [💾 Lưu] [📩 Gửi ngay]

Dùng shadcn/ui: Tabs, Card, Table, Drawer,
Badge, Button, Textarea, DatePicker
Dùng Recharts: BarChart cho phân bố điểm
```

---

## 📋 PROMPT 5 — Trang Học sinh: Nhận & Làm bài tập cải thiện

```
Đọc README.md trước.

Tạo trang tại:
app/student/assignments/[assignmentId]/feedback/page.tsx

Trang này hiện sau khi học sinh nhận được nhận xét từ GV.

PHẦN TRÊN — KẾT QUẢ BÀI LÀM:
- Tên bài kiểm tra
- Điểm số lớn: "6.5 / 10"
- Progress bar điểm (màu theo mức: đỏ/vàng/xanh)
- Badge: Đạt / Chưa đạt

PHẦN GIỮA — NHẬN XÉT GIÁO VIÊN:
Card với icon giáo viên:
┌─────────────────────────────────────┐
│ 💬 Nhận xét từ Giáo viên [Tên GV] │
│ [Nội dung nhận xét hiển thị đây]   │
│                                     │
│ ⚠️ Kiến thức cần cải thiện:        │
│ 🔴 Present Perfect                 │
│ 🔴 Since vs For                    │
└─────────────────────────────────────┘

PHẦN DƯỚI — BÀI TẬP CẢI THIỆN:
Header: "📚 Bài tập cải thiện" + Badge deadline còn X ngày

Với mỗi bài tập (Card):
┌─────────────────────────────────────┐
│ ☐ Bài tập 1: [title]   ⏱️ 10 phút │
│ [description]                       │
│                                     │
│ [Nội dung bài tập nếu type=exercise]│
│                                     │
│ [Nút: Bắt đầu làm / Đánh dấu xong]│
└─────────────────────────────────────┘

Khi học sinh bấm "Đánh dấu xong":
- UPDATE improvement_progress status = 'completed'
- Checkbox tick ✅
- Hiện confetti animation nhỏ
- Nếu xong tất cả → hiện banner "🎉 Hoàn thành tất cả bài tập!"

Progress tổng thể:
"Đã hoàn thành: 2/3 bài tập"
[████████░░] 67%

THÔNG BÁO:
Khi GV gửi nhận xét → học sinh nhận Supabase Realtime notification:
title: "📝 Có nhận xét bài kiểm tra [Tên bài]"
message: "Giáo viên đã gửi nhận xét và bài tập cải thiện cho bạn"
→ Click vào notification → redirect đến trang này

Dùng shadcn/ui: Card, Progress, Badge, 
Checkbox, Button, Separator
```

---

## 📋 PROMPT 6 — Notification & Gửi thông báo

```
Đọc README.md trước.

Tạo API route: app/api/ai/send-feedback/route.ts

API nhận POST với body:
{
  analysisIds: string[],  // mảng quiz_individual_analysis ids
  deadline: string        // ISO date string
}

Logic:
1. Query từng analysis record
2. Lấy thông tin học sinh + phụ huynh liên kết
3. Với mỗi học sinh:
   a. UPDATE quiz_individual_analysis:
      - status = 'sent'
      - sent_at = now()
      - deadline = deadline từ input
   
   b. Tạo improvement_progress records:
      INSERT cho mỗi task trong improvement_tasks
      với status = 'pending'
   
   c. Tạo in-app notification cho học sinh:
      {
        user_id: studentId,
        title: "📝 Nhận xét bài kiểm tra",
        message: "GV đã gửi nhận xét và X bài tập cải thiện",
        type: "quiz_feedback",
        metadata: { assignmentId, analysisId, deadline }
      }
   
   d. Tạo in-app notification cho phụ huynh:
      {
        user_id: parentId,
        title: "📊 Kết quả bài kiểm tra của [Tên con]",
        message: "Điểm: X/Y. [Tên GV] đã gửi nhận xét",
        type: "child_quiz_feedback",
        metadata: { studentId, score, assignmentId }
      }

4. Trả về: { sent: X, failed: Y }

Dùng Supabase Realtime để push notification real-time
đến học sinh và phụ huynh đang online.
```

---

## 📋 PROMPT 7 — Thêm nút vào trang kết quả bài kiểm tra hiện có

```
Đọc README.md trước.

Tìm trang hiện tại xem kết quả bài kiểm tra của giáo viên.
Thường ở: app/teacher/classes/[classId]/assignments/[id]/results/

Thêm section "🤖 Phân tích AI" vào trang này:

Nếu chưa có phân tích:
┌─────────────────────────────────────┐
│ 🤖 Phân tích AI                    │
│ Chưa có phân tích cho bài này.     │
│ [✨ Chạy phân tích AI ngay]        │
│ Phân tích: tổng thể lớp +          │
│ nhận xét cá nhân từng học sinh     │
└─────────────────────────────────────┘

Nếu đã có phân tích:
┌─────────────────────────────────────┐
│ ✅ Đã phân tích — [Xem chi tiết →] │
│ X học sinh có nhận xét chờ gửi     │
│ [📩 Gửi nhận xét cho học sinh]     │
└─────────────────────────────────────┘

Khi click "Chạy phân tích AI":
1. Gọi POST /api/ai/analyze-quiz-class
2. Sau đó gọi POST /api/ai/analyze-quiz-individual 
   (tất cả học sinh)
3. Hiện loading: "🤖 Đang phân tích X bài nộp..."
4. Xong → hiện toast + redirect sang trang analysis
```

---

## 📋 PROMPT 8 — Kiểm tra toàn bộ

```
Kiểm tra toàn bộ tính năng AI phân tích bài kiểm tra.

DATABASE:
□ 3 bảng tồn tại với đúng cấu trúc
□ RLS cho phép teacher CRUD, student chỉ SELECT của bản thân

PHÂN TÍCH TỔNG THỂ:
□ Nút "Chạy phân tích AI" hoạt động
□ Loading state hiện trong lúc AI xử lý
□ Kết quả hiện đúng: điểm TB, phân bố, câu yếu
□ BarChart Recharts render đúng
□ AI summary hiện bằng tiếng Việt

PHÂN TÍCH CÁ NHÂN:
□ Mỗi học sinh có nhận xét riêng phù hợp với câu sai
□ Bài tập cải thiện liên quan đến kiến thức hổng
□ GV có thể sửa nhận xét trong Drawer
□ GV có thể sửa bài tập trong Drawer

GỬI THÔNG BÁO:
□ Học sinh nhận notification khi GV gửi
□ Phụ huynh nhận notification kèm điểm số
□ Trang feedback hiện đúng cho học sinh

BÀI TẬP CẢI THIỆN:
□ Checkbox tick được
□ Progress bar cập nhật đúng
□ Khi hoàn thành tất cả hiện thông báo

Với mỗi mục ❌ → fix ngay, báo cáo sau khi xong.
```

---

## ⚠️ Thứ tự build

```
PROMPT 1 — Migration database
    ↓
PROMPT 2 — API phân tích tổng thể
    ↓
PROMPT 3 — API phân tích cá nhân
    ↓
PROMPT 4 — UI giáo viên xem & duyệt
    ↓
PROMPT 5 — UI học sinh nhận & làm bài
    ↓
PROMPT 6 — Notification & gửi thông báo
    ↓
PROMPT 7 — Tích hợp vào trang hiện có
    ↓
PROMPT 8 — Kiểm tra tổng thể
```

---

## 💡 Lưu ý kỹ thuật quan trọng

```
CHI PHÍ GEMINI API:
Phân tích 1 lớp 30 học sinh ≈ 30 lần gọi API
≈ ~30,000 tokens ≈ $0.01-0.03 / lần
→ Rất rẻ, không đáng lo ngại

TRÁNH GỌI API SONG SONG NHIỀU QUÁ:
Với analyze-quiz-individual:
- KHÔNG dùng Promise.all cho 30 học sinh cùng lúc
- Dùng batch 5 học sinh/lần + delay 2s giữa các batch
- Tránh 429 rate limit

GV LUÔN LÀ NGƯỜI DUYỆT CUỐI:
AI chỉ đề xuất, GV mới quyết định gửi.
Đây là thiết kế có chủ ý — không bao giờ 
auto-send nhận xét AI thẳng cho học sinh.

GEMINI PROMPT TIẾNG VIỆT:
Nhận xét phải thân thiện, khuyến khích.
Không dùng ngôn ngữ tiêu cực.
Luôn khen điểm tốt trước, góp ý sau.
```

---

*Dùng kết hợp với: README.md, FEATURE_AI_QUIZ_GENERATOR.md,
FEATURE_DATA_FLOW_SYNC.md*
