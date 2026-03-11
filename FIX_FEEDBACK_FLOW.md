# 🔧 Fix: Thông báo → Dashboard → Nhận xét + Bài tập cải thiện
> Sửa luồng: Học sinh/Phụ huynh nhận thông báo → Xem được đầy đủ → Làm bài cải thiện

---

## 🔍 Phân tích lỗi hiện tại

```
LỖI 1 — Notification không dẫn đúng chỗ
  Học sinh nhận thông báo ✅
  Nhưng bấm vào → không xem được nhận xét ❌
  Nguyên nhân: notification metadata không có link đúng
  hoặc trang feedback chưa được render đúng data

LỖI 2 — Dashboard không hiện gợi ý
  Học sinh/Phụ huynh vào dashboard
  Không thấy card "Có nhận xét mới" hoặc "Bài tập cần làm" ❌
  Nguyên nhân: dashboard chưa query quiz_individual_analysis

LỖI 3 — Nội dung cải thiện thiếu chiều sâu
  Bài tập cải thiện chỉ có tên + mô tả ❌
  Thiếu: lý thuyết/công thức ngắn gọn ❌
  Thiếu: bài trắc nghiệm mini để luyện tập ❌
```

---

## 📋 PROMPT 1 — Chẩn đoán: Đọc code, chưa sửa gì

```
Đọc README.md trước.

Tôi đang bị lỗi: học sinh nhận được thông báo 
nhận xét bài kiểm tra nhưng bấm vào không đọc 
được nội dung, và dashboard không hiện gợi ý.

Nhiệm vụ: CHỈ ĐỌC VÀ BÁO CÁO, chưa sửa gì.

Đọc các file sau và báo cáo:

1. File xử lý gửi notification khi GV gửi nhận xét
   (tìm trong app/api/ai/send-feedback/ 
   hoặc nơi INSERT vào bảng notifications)
   → metadata có chứa link/url để navigate không?
   → link đó trỏ đến đâu?

2. File trang feedback của học sinh
   (tìm app/student/assignments/[id]/feedback/
   hoặc tên tương tự)
   → Trang này tồn tại không?
   → Có đang query quiz_individual_analysis không?
   → Data có được render ra UI không?

3. File dashboard học sinh
   (app/student/dashboard hoặc app/student/page.tsx)
   → Có query quiz_individual_analysis chưa?
   → Có hiện card "Nhận xét mới" không?

4. File dashboard phụ huynh
   (app/parent/dashboard)
   → Có hiện thông tin nhận xét của con không?

5. Bảng quiz_individual_analysis trong database
   → Có data không? (query thử xem)
   → Cột improvement_tasks có chứa nội dung không?
   → improvement_tasks có trường 
     "theory", "mini_quiz" chưa?

Liệt kê từng vấn đề tìm được.
Sau đó tôi sẽ cho phép sửa từng bước.
```

---

## 📋 PROMPT 2 — Fix notification dẫn đúng trang

```
Đọc README.md trước.

Dựa trên kết quả chẩn đoán, fix luồng notification.

BƯỚC 1 — Fix API gửi notification:
Tìm file xử lý gửi nhận xét 
(app/api/ai/send-feedback/route.ts hoặc tương tự).

Khi INSERT vào bảng notifications cho học sinh,
đảm bảo metadata có đủ thông tin để navigate:

// Notification cho HỌC SINH:
await supabase.from('notifications').insert({
  user_id: studentId,
  title: '📝 Nhận xét bài kiểm tra mới',
  message: `Giáo viên đã gửi nhận xét cho bài "${assignmentTitle}". 
            Xem nhận xét và làm bài tập cải thiện ngay!`,
  type: 'quiz_feedback',
  metadata: {
    url: `/student/feedback/${analysisId}`,  // ← URL QUAN TRỌNG
    analysisId: analysisId,
    assignmentId: assignmentId,
    assignmentTitle: assignmentTitle,
    score: submission.score,
    maxScore: assignment.max_score,
    deadline: deadline,
    taskCount: improvement_tasks.length
  },
  read: false
})

// Notification cho PHỤ HUYNH:
await supabase.from('notifications').insert({
  user_id: parentId,
  title: `📊 Kết quả bài kiểm tra của ${studentName}`,
  message: `Điểm: ${score}/${maxScore}. Có ${taskCount} bài tập 
            cải thiện cần hoàn thành trước ${deadlineFormatted}.`,
  type: 'child_quiz_feedback',
  metadata: {
    url: `/parent/children/${studentId}/feedback/${analysisId}`,
    analysisId: analysisId,
    studentId: studentId,
    studentName: studentName,
    score: score,
    maxScore: maxScore,
    deadline: deadline
  },
  read: false
})

BƯỚC 2 — Fix component NotificationBell:
Tìm file: components/shared/NotificationBell.tsx

Khi user click vào 1 notification:
- Đọc metadata.url
- Nếu có metadata.url → navigate đến URL đó
- Đánh dấu notification là đã đọc (update read = true)

// Thêm vào onClick handler:
const handleNotificationClick = async (notification) => {
  // Đánh dấu đã đọc
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notification.id)
  
  // Navigate đến URL nếu có
  if (notification.metadata?.url) {
    router.push(notification.metadata.url)
  }
  
  setOpen(false)
}

BƯỚC 3 — Tạo route trang feedback học sinh:
Đảm bảo route sau tồn tại:
app/student/feedback/[analysisId]/page.tsx

Nếu chưa có → tạo mới (xem PROMPT 4 bên dưới).
Nếu đã có nhưng tên khác → cập nhật URL trong notification.

Kiểm tra lại: restart server, gửi test notification,
bấm vào → xác nhận navigate đúng trang.
```

---

## 📋 PROMPT 3 — Fix Dashboard: Hiện gợi ý nhận xét mới

```
Đọc README.md trước.

Thêm section "Nhận xét & Bài tập cải thiện" 
vào dashboard học sinh và phụ huynh.

════════════════════════════════════════
DASHBOARD HỌC SINH
app/student/dashboard/page.tsx (hoặc app/student/page.tsx)
════════════════════════════════════════

Thêm TanStack Query hook để fetch nhận xét chưa hoàn thành:

// Trong lib/queries/student-queries.ts, thêm:
export function useMyPendingFeedback(studentId: string) {
  return useQuery({
    queryKey: ['pending-feedback', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('quiz_individual_analysis')
        .select(`
          id,
          ai_feedback,
          teacher_edited_feedback,
          knowledge_gaps,
          improvement_tasks,
          deadline,
          sent_at,
          assignments (
            id,
            title,
            classes ( name )
          ),
          improvement_progress (
            task_index,
            status
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(5)
      return data
    }
  })
}

Thêm section vào dashboard (đặt ngay dưới stat cards):

// Component: components/student/FeedbackSuggestionCard.tsx
Giao diện 1 card nhận xét:

┌──────────────────────────────────────────────┐
│ 🔴 Cần cải thiện          Còn 5 ngày        │
├──────────────────────────────────────────────┤
│ 📝 Bài KT Unit 3 — Tiếng Anh B1            │
│                                              │
│ 💬 "Em làm tốt từ vựng, cần ôn lại         │
│    Present Perfect..." [Xem đầy đủ →]       │
│                                              │
│ ⚠️ Kiến thức cần ôn:                        │
│    🔴 Present Perfect  🔴 Since vs For      │
│                                              │
│ 📚 Tiến độ bài tập: 1/3 hoàn thành         │
│    [██░░░░░░] 33%                           │
│                                              │
│         [📖 Xem nhận xét & Làm bài]         │
└──────────────────────────────────────────────┘

Logic hiển thị:
- Nếu có ≥ 1 nhận xét chưa hoàn thành → hiện section
- Sort: deadline gần nhất lên đầu
- Badge màu đỏ nếu deadline < 3 ngày
- Nút "Xem nhận xét & Làm bài" → /student/feedback/[analysisId]
- Nếu không có nhận xét nào → ẩn section (không hiện)

════════════════════════════════════════
DASHBOARD PHỤ HUYNH
app/parent/dashboard/page.tsx
════════════════════════════════════════

Thêm hook tương tự cho phụ huynh:

export function useChildPendingFeedback(studentId: string) {
  // Query giống trên nhưng thêm:
  // .select('... users!student_id (full_name)')
}

Section trong dashboard phụ huynh:

┌──────────────────────────────────────────────┐
│ 📊 Nhận xét bài kiểm tra — [Tên con]        │
├──────────────────────────────────────────────┤
│ 📝 Bài KT Unit 3 • Điểm: 6.5/10            │
│                                              │
│ ⚠️ Kiến thức cần cải thiện:                │
│    • Present Perfect                         │
│    • Since vs For                            │
│                                              │
│ 📚 Con đã làm: 1/3 bài tập cải thiện       │
│ ⏰ Deadline: 15/03/2026 (còn 5 ngày)        │
│                                              │
│    [👀 Xem chi tiết tiến độ của con]         │
└──────────────────────────────────────────────┘

Nút "Xem chi tiết" → /parent/children/[studentId]/feedback/[analysisId]

Dùng shadcn/ui: Card, Badge, Progress, Button
```

---

## 📋 PROMPT 4 — Xây dựng lại trang Feedback đầy đủ

```
Đọc README.md trước.

Tạo (hoặc viết lại hoàn toàn) trang feedback học sinh:
app/student/feedback/[analysisId]/page.tsx

Trang này phải hiển thị ĐẦY ĐỦ:
nhận xét + lý thuyết + bài trắc nghiệm mini

════════════════════════
PHẦN 1 — HEADER KẾT QUẢ
════════════════════════
- Tên bài kiểm tra + Tên lớp
- Điểm to: "6.5 / 10"
- Progress bar điểm màu theo mức
- Badge "Chưa đạt" / "Đạt" / "Giỏi"
- Text nhỏ: "Giáo viên [Tên GV] đã gửi nhận xét"

════════════════════════
PHẦN 2 — NHẬN XÉT GIÁO VIÊN
════════════════════════
Card nổi bật với avatar giáo viên:

Ưu tiên hiện: teacher_edited_feedback nếu có,
không thì hiện ai_feedback.

Nội dung hiện ĐẦY ĐỦ (không truncate, không "xem thêm").

Phía dưới nhận xét, hiện danh sách kiến thức hổng:
"⚠️ Kiến thức cần cải thiện:"
- 🔴 Present Perfect Tense
- 🔴 Since vs For

════════════════════════
PHẦN 3 — BÀI TẬP CẢI THIỆN (QUAN TRỌNG NHẤT)
════════════════════════

Query improvement_tasks từ quiz_individual_analysis.
Mỗi task hiện thành 1 Card riêng với 3 phần:

┌─────────────────────────────────────────────────┐
│ 📘 Bài tập 1: Present Perfect Tense            │
│ ⏱️ 15 phút  •  ☐ Chưa hoàn thành              │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📖 LÝ THUYẾT NHANH                            │
│ ┌─────────────────────────────────────────┐    │
│ │ Present Perfect dùng khi:               │    │
│ │ • Hành động xảy ra trong quá khứ,       │    │
│ │   kết quả ảnh hưởng đến hiện tại        │    │
│ │                                         │    │
│ │ Công thức:                              │    │
│ │ (+) S + have/has + V3                   │    │
│ │ (-) S + haven't/hasn't + V3             │    │
│ │ (?) Have/Has + S + V3?                  │    │
│ │                                         │    │
│ │ Since = mốc thời gian cụ thể           │    │
│ │   VD: since 2020, since Monday         │    │
│ │ For = khoảng thời gian                 │    │
│ │   VD: for 3 years, for a week          │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ✏️ BÀI LUYỆN TẬP (5 câu trắc nghiệm)         │
│                                                 │
│ Câu 1: I ___ here since 2020.                  │
│ ○ A. live                                       │
│ ○ B. have lived  ← chọn vào                    │
│ ○ C. lived                                      │
│ ○ D. am living                                  │
│                                                 │
│ Câu 2: She ___ here for 3 years.               │
│ ○ A. works                                      │
│ ...                                             │
│                                                 │
│ [Kiểm tra đáp án]  ← hiện sau khi làm xong    │
│                                                 │
│ Sau khi submit → hiện kết quả từng câu:        │
│ ✅ Câu 1: Đúng!                                │
│ ❌ Câu 2: Sai. Đáp án đúng là B "has worked"  │
│    Giải thích: "for 3 years" dùng với PP...    │
│                                                 │
│ Kết quả: 4/5 đúng ✅                           │
│                                                 │
│ [✅ Đánh dấu hoàn thành bài tập này]           │
└─────────────────────────────────────────────────┘

State quản lý bài luyện tập:
- useState cho answers: { [taskIndex]: { [questionIndex]: string } }
- useState cho submitted: { [taskIndex]: boolean }
- useState cho showResults: { [taskIndex]: boolean }

Khi submit từng task:
- Tính điểm mini quiz
- Hiện kết quả + giải thích từng câu
- Nút "Đánh dấu hoàn thành" active
- Khi mark complete → UPDATE improvement_progress

PHẦN 4 — PROGRESS TỔNG THỂ (sticky bottom bar trên mobile):
"Hoàn thành: 2/3 bài tập [████████░░] 67%"

PHẦN 5 — KHI HOÀN THÀNH TẤT CẢ:
Hiện banner success:
"🎉 Xuất sắc! Bạn đã hoàn thành tất cả bài tập cải thiện!"
Badge "Hoàn thành" xuất hiện trên card dashboard

Data fetch:
const { data: analysis } = useQuery({
  queryKey: ['feedback-detail', analysisId],
  queryFn: async () => {
    const { data } = await supabase
      .from('quiz_individual_analysis')
      .select(`
        *,
        improvement_progress (*),
        assignments (
          title,
          classes ( name ),
          users!teacher_id ( full_name, avatar_url )
        ),
        submissions ( score, assignments ( max_score ) )
      `)
      .eq('id', analysisId)
      .eq('student_id', currentUserId)  // ← RLS check
      .single()
    
    if (!data) throw new Error('Không tìm thấy nhận xét')
    return data
  }
})

Dùng shadcn/ui: Card, Progress, Badge, 
RadioGroup, Button, Separator, Alert
```

---

## 📋 PROMPT 5 — Cập nhật AI Prompt để sinh lý thuyết + mini quiz

```
Đọc README.md trước.

Cập nhật file: app/api/ai/analyze-quiz-individual/route.ts

Tìm hàm buildIndividualPrompt hoặc phần tạo prompt
gửi cho Gemini để phân tích cá nhân học sinh.

Viết lại prompt để AI tạo ra improvement_tasks 
có đủ 3 phần: lý thuyết + công thức + bài trắc nghiệm:

const prompt = `
Bạn là gia sư giáo dục chuyên nghiệp.
Phân tích bài làm và tạo bài học cải thiện cá nhân hóa.

HỌC SINH: ${studentName}
MÔN HỌC: ${subject}
ĐIỂM: ${score}/${maxScore}

CÁC CÂU LÀM SAI:
${JSON.stringify(wrongQuestions, null, 2)}

Trả về JSON THUẦN TÚY (không markdown, không backtick):
{
  "knowledge_gaps": ["tên kiến thức 1", "tên kiến thức 2"],
  
  "ai_feedback": "Nhận xét 3-4 câu tiếng Việt, thân thiện.
                  Khen điểm tốt trước, góp ý cụ thể sau.
                  Kết thúc bằng câu động viên.",
  
  "improvement_tasks": [
    {
      "title": "Tên ngắn gọn của kiến thức cần ôn",
      "knowledge_topic": "Tên kiến thức chính xác",
      "estimated_time": "15 phút",
      
      "theory": {
        "explanation": "Giải thích ngắn gọn 2-3 câu khi nào dùng",
        "formula": "Công thức hoặc quy tắc (nếu có)",
        "examples": [
          "Ví dụ 1: câu ví dụ cụ thể",
          "Ví dụ 2: câu ví dụ cụ thể"
        ],
        "tip": "Mẹo ghi nhớ nhanh (nếu có)"
      },
      
      "mini_quiz": [
        {
          "id": "q1",
          "question": "Câu hỏi trắc nghiệm liên quan trực tiếp",
          "options": [
            {"id": "a", "text": "Đáp án A"},
            {"id": "b", "text": "Đáp án B"},
            {"id": "c", "text": "Đáp án C"},
            {"id": "d", "text": "Đáp án D"}
          ],
          "correct": "b",
          "explanation": "Giải thích tại sao đáp án này đúng"
        }
      ]
    }
  ]
}

YÊU CẦU:
- Tạo 2-3 improvement_tasks tương ứng với kiến thức hổng
- Mỗi task có đúng 3-5 câu trong mini_quiz
- Câu hỏi mini_quiz phải liên quan trực tiếp đến câu sai
- Lý thuyết ngắn gọn, dễ hiểu, có ví dụ thực tế
- Ngôn ngữ: Tiếng Việt (trừ ví dụ tiếng Anh nếu môn tiếng Anh)
`

Sau khi cập nhật prompt:
Cũng cập nhật TypeScript interface/type cho improvement_tasks:

// types/index.ts hoặc types/analysis.ts
interface TheoryContent {
  explanation: string
  formula?: string
  examples: string[]
  tip?: string
}

interface MiniQuizQuestion {
  id: string
  question: string
  options: { id: string; text: string }[]
  correct: string
  explanation: string
}

interface ImprovementTask {
  title: string
  knowledge_topic: string
  estimated_time: string
  theory: TheoryContent
  mini_quiz: MiniQuizQuestion[]
}

Cập nhật cả component trang feedback để render
theo interface mới này.
```

---

## 📋 PROMPT 6 — Trang phụ huynh xem chi tiết feedback con

```
Đọc README.md trước.

Tạo trang: app/parent/children/[studentId]/feedback/[analysisId]/page.tsx

Trang này giống trang feedback học sinh nhưng:
- Read-only (phụ huynh CHỈ XEM, không làm bài)
- Thêm thông tin tiến độ con đã làm bài chưa
- Có nút nhắn tin/liên hệ giáo viên

LAYOUT:

PHẦN 1 — THÔNG TIN CON + KẾT QUẢ:
- Avatar + Tên con
- Tên bài kiểm tra + Lớp
- Điểm: X/Y
- Ngày kiểm tra

PHẦN 2 — NHẬN XÉT GIÁO VIÊN:
Hiện đầy đủ (giống trang học sinh)
Label: "💬 Giáo viên [Tên GV] nhận xét:"

PHẦN 3 — TIẾN ĐỘ BÀI TẬP CỦA CON:
Với mỗi task:
┌────────────────────────────────────┐
│ 📘 Bài tập 1: Present Perfect     │
│ [✅ Con đã hoàn thành]             │
│ hoặc                               │
│ [⏳ Con chưa làm — còn 5 ngày]    │
└────────────────────────────────────┘

Phụ huynh thấy được lý thuyết và câu hỏi
nhưng KHÔNG thấy kết quả làm bài của con
(để tránh làm hộ)

Progress tổng: "Con đã hoàn thành 1/3 bài tập"

PHẦN 4 — NÚT LIÊN HỆ:
"📩 Gửi câu hỏi cho giáo viên"
→ Mở Dialog soạn tin nhắn
→ Lưu vào bảng feedback (đã có trong schema)

Data fetch với RLS check:
Đảm bảo phụ huynh chỉ xem được feedback
của con mình (kiểm tra bảng parent_students)

Dùng shadcn/ui: Card, Badge, Progress,
Button, Dialog, Textarea, Avatar
```

---

## 📋 PROMPT 7 — Kiểm tra toàn bộ luồng

```
Kiểm tra toàn bộ luồng từ đầu đến cuối.
Tạo test scenario và thực hiện từng bước:

SETUP TEST:
Dùng 2 account test:
- Teacher: teacher@test.com
- Student: student@test.com  
- Parent: parent@test.com (liên kết với student)

SCENARIO: GV gửi nhận xét → HS làm bài cải thiện

BƯỚC 1 — GV gửi nhận xét:
□ Login teacher → vào bài kiểm tra có kết quả
□ Bấm "Chạy phân tích AI"
□ Chờ AI tạo xong
□ Vào tab "Từng học sinh" → thấy nhận xét của student
□ improvement_tasks có đủ: theory + mini_quiz không?
□ Bấm "Gửi" cho student

BƯỚC 2 — Học sinh nhận thông báo:
□ Login student → thấy notification bell có số đỏ
□ Bấm vào bell → thấy thông báo "Nhận xét bài KT"
□ Bấm vào thông báo → navigate đến đúng trang feedback
□ KHÔNG bị lỗi 404 hoặc trang trắng

BƯỚC 3 — Học sinh đọc nhận xét:
□ Trang hiện đầy đủ: điểm + nhận xét GV + danh sách task
□ Nhận xét hiện TOÀN BỘ (không bị cắt)
□ Kiến thức hổng hiện đúng

BƯỚC 4 — Học sinh làm bài cải thiện:
□ Mở card Task 1 → thấy phần lý thuyết
□ Lý thuyết có: giải thích + công thức + ví dụ
□ Phần mini_quiz hiện 3-5 câu trắc nghiệm
□ Chọn đáp án → bấm "Kiểm tra"
□ Hiện kết quả đúng/sai + giải thích từng câu
□ Bấm "Đánh dấu hoàn thành"
□ Progress bar cập nhật

BƯỚC 5 — Dashboard hiện đúng:
□ Student dashboard có section "Bài tập cải thiện"
□ Hiện card với progress 1/3 (sau khi làm 1 task)
□ Parent dashboard hiện tiến độ của con

BƯỚC 6 — Phụ huynh xem:
□ Login parent → thấy notification
□ Bấm vào → đến trang /parent/children/.../feedback/...
□ Thấy nhận xét + tiến độ con
□ KHÔNG thể làm bài thay con

Với mỗi bước ❌:
1. Đọc code liên quan
2. Tìm nguyên nhân cụ thể
3. Fix và test lại bước đó
4. Xác nhận ✅ trước khi báo cáo
```

---

## ⚠️ Thứ tự thực hiện

```
PROMPT 1 — Chẩn đoán (BẮT BUỘC làm trước)
    ↓ Đọc kết quả, xác định lỗi ở đâu
    ↓
PROMPT 2 — Fix notification → navigate đúng
    ↓
PROMPT 3 — Fix dashboard hiện gợi ý
    ↓
PROMPT 4 — Xây dựng lại trang feedback đầy đủ
    ↓
PROMPT 5 — Cập nhật AI prompt sinh lý thuyết + mini quiz
    ↓
PROMPT 6 — Trang phụ huynh xem feedback
    ↓
PROMPT 7 — Test toàn bộ luồng
```

---

## 💡 Lưu ý quan trọng

```
VỀ PROMPT 1 (chẩn đoán):
Bắt buộc chạy trước. Đừng để Antigravity 
sửa mù — cần biết chính xác lỗi ở đâu trước.

VỀ DATA CŨ TRONG DATABASE:
Các bản ghi quiz_individual_analysis cũ 
(trước khi thêm theory + mini_quiz) sẽ thiếu data.

Yêu cầu Antigravity:
"Sau khi cập nhật prompt AI, chạy lại phân tích
cho các bài kiểm tra hiện có để tạo lại data mới
với đủ theory và mini_quiz"

VỀ RLS (bảo mật):
Học sinh A KHÔNG được xem feedback của học sinh B.
Phụ huynh chỉ xem được feedback của con mình.
Kiểm tra kỹ 2 điểm này trong PROMPT 7.

VỀ MOBILE:
Trang feedback có nhiều content → đảm bảo
scroll mượt trên mobile, không có element tràn.
```

---

*Dùng kết hợp với README.md và FEATURE_AI_QUIZ_ANALYSIS.md*
