# 🤖 Fix Gemini API 429 + Hướng dẫn kết nối AI đúng chuẩn
> Phân tích lỗi, fix code, hướng dẫn cấu hình API key đúng

---

## 🔍 Phân tích lỗi

```
Lỗi: [429 Too Many Requests]
Quota exceeded for metric: 
  generate_content_free_tier_requests — limit: 0

Nguyên nhân: Free tier Gemini API đã hết quota.
Free tier chỉ cho: 15 requests/phút, 1500 requests/ngày
Khi vượt quá → trả về lỗi 429 ngay lập tức.

Vị trí lỗi: 
  components/teacher/AIGenerateModal.tsx dòng 83
  → Đây là nơi throw lỗi, KHÔNG phải nguyên nhân gốc
  → Nguyên nhân gốc nằm ở API route gọi Gemini
```

---

## 🛠️ 2 VIỆC CẦN LÀM SONG SONG

```
VIỆC 1 — Fix code (Antigravity làm)
  Thêm retry logic + error handling đúng chuẩn
  
VIỆC 2 — Fix API key (Bạn tự làm — 5 phút)
  Nâng cấp lên Paid tier hoặc đổi API key mới
```

---

## 👤 HƯỚNG DẪN BẠN TỰ LÀM TRƯỚC (Việc 2)

### Cách 1 — Lấy API key mới (miễn phí, nhanh nhất)

```
Bước 1: Vào https://aistudio.google.com/apikey
Bước 2: Đăng nhập Google account KHÁC với tài khoản hiện tại
         (mỗi Google account có quota free riêng)
Bước 3: Bấm "Create API key"
Bước 4: Copy key mới
Bước 5: Mở file .env.local trong project
Bước 6: Thay dòng GEMINI_API_KEY=... bằng key mới
Bước 7: Restart server: Ctrl+C → npm run dev
```

⚠️ Giới hạn free tier:
- 15 requests / phút
- 1,500 requests / ngày  
- 1 triệu tokens / ngày
Đủ để dev và test, KHÔNG đủ cho production.

### Cách 2 — Nâng lên Paid tier (~$0.10/1M tokens)

```
Bước 1: Vào https://aistudio.google.com
Bước 2: Click avatar góc trên phải → "Billing"
Bước 3: Liên kết thẻ Visa/Mastercard
         (Visa debit của Việt Nam ĐƯỢC chấp nhận)
Bước 4: Paid tier tự động kích hoạt
Bước 5: Dùng lại API key cũ — quota tăng lên rất nhiều:
         - 2,000 requests / phút (thay vì 15)
         - Không giới hạn requests/ngày
Chi phí thực tế: Tạo 100 bộ đề (10 câu) ≈ $0.05
```

---

## 📋 PROMPT 1 — Fix Error Handling trong AIGenerateModal

```
Đọc README.md trước.

Mở file: components/teacher/AIGenerateModal.tsx

Tìm hàm handleGenerate (khoảng dòng 80-90).
Hiện tại code đang throw lỗi thô ra UI.

Viết lại phần xử lý lỗi để thân thiện với người dùng:

// Thay thế đoạn catch hiện tại bằng:
} catch (error: unknown) {
  console.error('AI Generate Error:', error)
  
  const message = error instanceof Error 
    ? error.message 
    : 'Lỗi không xác định'
  
  // Phân loại lỗi để hiện thông báo phù hợp
  if (message.includes('429') || message.includes('quota') || 
      message.includes('Too Many Requests')) {
    setError(
      'AI đang bận, vui lòng thử lại sau 1 phút. ' +
      'Nếu lỗi tiếp tục, hãy liên hệ quản trị viên.'
    )
  } else if (message.includes('401') || message.includes('API key')) {
    setError('Lỗi xác thực API. Vui lòng liên hệ quản trị viên.')
  } else if (message.includes('network') || message.includes('fetch')) {
    setError('Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.')
  } else {
    setError('Đã xảy ra lỗi. Vui lòng thử lại sau.')
  }
}

Thêm vào UI:
- Hiển thị error message bằng shadcn/ui Alert (variant destructive)
- Nút "Thử lại" khi có lỗi 429 (retry sau 60 giây)
- Countdown timer: "Thử lại sau: 45 giây..."
- Nút "Thử lại ngay" active khi countdown về 0

State cần thêm:
const [error, setError] = useState<string | null>(null)
const [retryCountdown, setRetryCountdown] = useState(0)

Khi retryCountdown > 0:
  useEffect chạy setInterval giảm 1 mỗi giây
  Khi về 0 → clear interval
```

---

## 📋 PROMPT 2 — Fix API Route với Retry Logic

```
Đọc README.md trước.

Tìm API route xử lý generate câu hỏi AI.
Thường ở: app/api/ai/generate-quiz/route.ts
hoặc: app/api/generate-questions/route.ts

Viết lại route với đầy đủ retry logic và error handling:

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
)

// Helper: chờ X milliseconds
const sleep = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms))

// Helper: retry với exponential backoff
async function generateWithRetry(
  prompt: string, 
  maxRetries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash' 
      })
      const result = await model.generateContent(prompt)
      return result.response.text()
      
    } catch (error: unknown) {
      const isRateLimit = 
        error instanceof Error && 
        (error.message.includes('429') || 
         error.message.includes('quota') ||
         error.message.includes('Too Many Requests'))
      
      // Nếu là rate limit VÀ còn lần retry
      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 5s, 15s, 30s
        const waitTime = Math.pow(3, attempt) * 5000
        console.log(
          `Rate limit hit. Attempt ${attempt}/${maxRetries}.` +
          `Waiting ${waitTime/1000}s...`
        )
        await sleep(waitTime)
        continue // thử lại
      }
      
      // Ném lỗi ra ngoài nếu hết retry
      throw error
    }
  }
  throw new Error('Đã thử 3 lần nhưng vẫn thất bại')
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key tồn tại
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY chưa được cấu hình' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { content, numQuestions, pointsEach, difficulty } = body

    // Validate input
    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Nội dung quá ngắn để tạo câu hỏi' },
        { status: 400 }
      )
    }

    if (numQuestions < 1 || numQuestions > 30) {
      return NextResponse.json(
        { error: 'Số câu hỏi phải từ 1 đến 30' },
        { status: 400 }
      )
    }

    // Build prompt
    const prompt = buildQuizPrompt(
      content, numQuestions, pointsEach, difficulty
    )

    // Gọi AI với retry
    const rawText = await generateWithRetry(prompt, 3)

    // Parse JSON từ response
    const questions = parseQuestionsFromResponse(rawText)

    return NextResponse.json({ 
      questions,
      generated: questions.length,
      model: 'gemini-2.0-flash'
    })

  } catch (error: unknown) {
    console.error('[AI Generate Error]:', error)
    
    const message = error instanceof Error 
      ? error.message 
      : 'Unknown error'

    // Trả về status code phù hợp
    if (message.includes('429') || message.includes('quota')) {
      return NextResponse.json(
        { 
          error: 'AI đang quá tải. Vui lòng thử lại sau 1 phút.',
          retryAfter: 60,
          code: 'RATE_LIMIT'
        },
        { status: 429 }
      )
    }
    
    if (message.includes('API key') || message.includes('401')) {
      return NextResponse.json(
        { error: 'Lỗi API key. Liên hệ quản trị viên.', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại.', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

// Build prompt tiếng Việt chuẩn
function buildQuizPrompt(
  content: string,
  numQuestions: number,
  pointsEach: number,
  difficulty: string
): string {
  const difficultyMap: Record<string, string> = {
    easy: 'dễ, phù hợp học sinh cơ bản',
    medium: 'trung bình, cần hiểu bài mới làm được',
    hard: 'khó, cần tư duy và phân tích sâu'
  }

  return \`
Bạn là giáo viên chuyên nghiệp. 
Tạo ${numQuestions} câu hỏi trắc nghiệm ${difficultyMap[difficulty] || 'trung bình'}.

Nội dung tham khảo:
---
${content.slice(0, 4000)}
---

YÊU CẦU QUAN TRỌNG:
- Mỗi câu có đúng 4 đáp án (A, B, C, D)
- Chỉ 1 đáp án đúng
- Câu hỏi rõ ràng, không mơ hồ
- Ngôn ngữ: Tiếng Việt
- Trả về JSON THUẦN TÚY, không có markdown, không có backtick

FORMAT JSON BẮT BUỘC:
{
  "questions": [
    {
      "id": "q1",
      "content": "Câu hỏi ở đây?",
      "options": [
        {"id": "a", "text": "Đáp án A"},
        {"id": "b", "text": "Đáp án B"},
        {"id": "c", "text": "Đáp án C"},
        {"id": "d", "text": "Đáp án D"}
      ],
      "correct": "a",
      "points": ${pointsEach},
      "explanation": "Giải thích tại sao đáp án này đúng"
    }
  ]
}
\`
}

// Parse JSON an toàn từ AI response  
function parseQuestionsFromResponse(rawText: string) {
  try {
    // Xóa markdown backticks nếu AI trả về
    const cleaned = rawText
      .replace(/\`\`\`json/g, '')
      .replace(/\`\`\`/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Response không có trường questions')
    }

    // Validate từng câu hỏi
    return parsed.questions.filter((q: unknown) => {
      if (typeof q !== 'object' || q === null) return false
      const question = q as Record<string, unknown>
      return (
        question.content &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        question.correct
      )
    })

  } catch (err) {
    console.error('JSON parse error:', err)
    console.error('Raw text:', rawText.slice(0, 500))
    throw new Error('AI trả về dữ liệu không đúng định dạng. Vui lòng thử lại.')
  }
}

Sau khi cập nhật xong:
1. Restart dev server
2. Test tạo câu hỏi và xác nhận không còn crash
3. Test với content ngắn < 10 ký tự → phải hiện lỗi validate
4. Báo cáo kết quả
```

---

## 📋 PROMPT 3 — Thêm Rate Limit Indicator cho Teacher

```
Đọc README.md trước.

Tạo component: components/teacher/AIUsageIndicator.tsx

Component nhỏ hiện ở góc AIGenerateModal,
cho giáo viên biết tình trạng AI:

Giao diện:
┌─────────────────────────────┐
│ 🤖 AI Status                │
│ ● Sẵn sàng      [Normal]   │
│ hoặc                        │
│ ⏳ Đang hồi phục  [45s]     │
│ hoặc                        │  
│ ⚠️ Quá tải       [Retry]   │
└─────────────────────────────┘

Logic:
- Mặc định: hiện "● Sẵn sàng" màu xanh
- Khi nhận lỗi 429 từ API: 
  → Chuyển sang "⏳ Đang hồi phục"
  → Countdown từ 60 về 0
  → Khi về 0: tự động đổi lại "● Sẵn sàng"
- Lưu trạng thái vào sessionStorage để giữ 
  giữa các lần mở/đóng modal

Nhúng vào AIGenerateModal.tsx phía dưới title.

Dùng shadcn/ui: Badge, Alert
```

---

## 📋 PROMPT 4 — Kiểm tra cấu hình môi trường

```
Đọc README.md trước.

Kiểm tra toàn bộ cấu hình AI trong project.

BƯỚC 1 — Kiểm tra .env.local:
Xác nhận các biến sau TỒN TẠI (không cần thấy giá trị):
□ GEMINI_API_KEY có trong .env.local
□ GEMINI_API_KEY được đọc đúng trong API route
   (console.log('Key exists:', !!process.env.GEMINI_API_KEY))

BƯỚC 2 — Kiểm tra API route:
Tìm tất cả file trong app/api/ có gọi Gemini API.
Với mỗi file kiểm tra:
□ Import đúng: @google/generative-ai
□ Dùng process.env.GEMINI_API_KEY (không hardcode key)
□ Có try/catch bao quanh lời gọi API
□ Có xử lý lỗi 429 riêng

BƯỚC 3 — Test API trực tiếp:
Tạo file tạm: app/api/test-ai/route.ts

export async function GET() {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent('Trả lời: 1+1=?')
    return Response.json({ 
      ok: true, 
      response: result.response.text() 
    })
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'unknown'
    }, { status: 500 })
  }
}

Sau khi tạo, mở browser: http://localhost:3000/api/test-ai
Kết quả mong đợi: {"ok": true, "response": "2"}

Nếu thấy ok: true → API key hoạt động tốt
Nếu thấy 429 → Đổi API key theo hướng dẫn trong tài liệu
Nếu thấy lỗi khác → báo cáo error message cụ thể

SAU KHI TEST XONG: Xóa file app/api/test-ai/route.ts
(không để file test trong production)
```

---

## 📋 PROMPT 5 — Kiểm tra tổng thể

```
Sau khi đã fix xong tất cả, kiểm tra lại:

□ Mở AIGenerateModal
□ Nhập nội dung > 10 ký tự
□ Chọn 5 câu hỏi, độ khó trung bình
□ Bấm "Tạo câu hỏi"
□ Câu hỏi được tạo thành công → hiện Review Panel
□ Nếu 429: hiện thông báo thân thiện + countdown
□ Không có lỗi crash trong console

Test edge cases:
□ Nhập nội dung < 10 ký tự → validate error
□ Chọn 0 câu hỏi → validate error  
□ Tắt internet → hiện lỗi kết nối mạng
□ Câu hỏi tạo xong → có thể sửa và publish

Báo cáo kết quả từng mục ✅ / ❌
```

---

## ⚠️ Thứ tự thực hiện

```
BẠN LÀM TRƯỚC (5 phút):
  → Lấy API key mới tại aistudio.google.com
  → Cập nhật GEMINI_API_KEY trong .env.local
  → Restart: Ctrl+C → npm run dev
  → Test ngay: mở web thử tạo câu hỏi
  
Nếu hết lỗi 429 → dùng tạm được rồi,
sau đó cho Antigravity chạy PROMPT 1→5 để code sạch hơn.

Nếu vẫn còn lỗi → chạy Antigravity PROMPT 1→5 trước.
```

---

## 💡 Phòng tránh lỗi này trong tương lai

```
1. Môi trường DEV: dùng free tier là đủ
   → Chỉ tạo đề thử, không test liên tục

2. Môi trường PRODUCTION: 
   → Bắt buộc dùng Paid tier
   → Chi phí rất thấp: ~$1-2/tháng cho trường nhỏ

3. Thêm cache vào API route:
   → Nếu cùng nội dung được request nhiều lần
   → Cache kết quả 1 giờ → tiết kiệm quota đáng kể

4. Giới hạn số lần tạo đề/ngày per teacher:
   → Lưu vào DB: ai_usage_log (teacher_id, date, count)
   → Giới hạn 20 lần/ngày/giáo viên trong free tier
```

---

*Dùng kết hợp với README.md và FEATURE_AI_QUIZ_GENERATOR.md*
