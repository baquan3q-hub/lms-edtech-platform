# 🎓 E-Learning Platform — Project Context & Technical Blueprint

> **Dành cho Antigravity Agent:** Đây là file context chính. Đọc toàn bộ trước khi bắt đầu bất kỳ task nào. Không được bỏ qua hoặc giả định thông tin ngoài file này.

---

## 📌 Tổng quan dự án

| Thuộc tính | Giá trị |
|---|---|
| **Tên dự án** | E-Learning Platform (tên tạm) |
| **Loại** | Web App — Nền tảng học trực tuyến |
| **Người dùng** | Admin, Teacher, Student, Phụ huynh |
| **Ngôn ngữ UI** | Tiếng Việt |
| **Môi trường dev** | Google Antigravity IDE (agent-first) |
| **Model AI** | Claude Sonnet 4.6 (ưu tiên) / Gemini 3 Pro |

---

## 🧩 Các Role & Chức năng chính (FDD)

### 1. ADMIN
- Quản lý hệ thống và phân bổ user (CRUD User, phân quyền đa cấp độ)
- Quản lý Học vụ & Lớp học (Khung chương trình, Tạo lớp, Quản lý đa lớp/phòng học/ca học, Duyệt lịch học bù)
- Hệ thống Giao tiếp đa kênh (Gửi thông báo tự động theo target group)
- Quản lý Tài chính (Tích hợp Payment Gateway, Quản lý trạng thái & xuất hóa đơn)
- Dashboard & AI Analytics (Báo cáo trực quan, AI dự báo học sinh có lỗi churn)

### 2. TEACHER
- Tạo và quản lý thông báo lớp học
- Xem lịch dạy và nội dung bài giảng theo lộ trình
- Điểm danh điện tử
- Xác nhận lớp học bù cho học sinh chuyển đến
- Quản lý học liệu số (CRUD bài giảng, Tạo bài kiểm tra bằng AI, Giao bài tập/kiểm tra & cài deadline, Kho học liệu mở)
- Đánh giá & Báo cáo tự động (Theo dõi tiến độ-điểm số cả lớp, AI chấm điểm trắc nghiệm tự động, Phân tích học sinh qua bài test, Tự động gửi bảng điểm và nhận xét cho phụ huynh)
- Xem lịch sử/báo cáo chuyên cần (Xem danh sách thông tin học viên, Quản lý điểm chuyên cần, Thông tin phụ huynh học viên)

### 3. STUDENT
- Lớp học cá nhân (Xem lịch học và lộ trình học tập, Tham gia bài học trực tuyến, Làm bài tập - bài kiểm tra, Nộp bài đa phương tiện)
- Động lực học và cộng đồng (Bảng vàng thành tích, Kho trò chơi giáo dục và video hoạt hình, Cộng đồng nhận thông báo lớp và giao tiếp nội bộ)

### 4. PHỤ HUYNH
- Theo dõi tiến độ (Dashboard xem điểm số, lời nhận xét từ giáo viên, điểm mạnh và yếu, Lịch sử học tập và điểm danh hàng ngày)
- Dịch vụ & Giao tiếp (Tạo đơn xin phép nghỉ học, Thanh toán học phí trực tuyến, Cổng gửi feedback trực tiếp đến trung tâm)

---

## 🛠️ Tech Stack

### Frontend
```
Framework:     Next.js 14 (App Router)
Language:      TypeScript (strict mode)
UI Components: shadcn/ui
Styling:       Tailwind CSS v3
Icons:         Lucide React
Charts:        Recharts
Forms:         React Hook Form + Zod (validation)
State:         Zustand (client state) + TanStack Query (server state)
```

### Backend / Database
```
Platform:      Supabase (PostgreSQL + Auth + Realtime + Storage)
Auth:          Supabase Auth (email/password + Google OAuth)
DB:            PostgreSQL via Supabase (Row Level Security per role)
Realtime:      Supabase Realtime (thông báo, điểm danh live)
Storage:       Supabase Storage (bài giảng, file nộp bài)
Edge Functions: Supabase Edge Functions (Deno) — gửi email, webhook
```

### AI Features
```
AI Provider:   Google Gemini API (gemini-2.5-flash / gemini-2.5-pro)
Chấm điểm:    Gemini API — tự động chấm trắc nghiệm
Phân tích:     Gemini API — phân tích học sinh qua bài test
Dự báo churn:  Gemini API + Supabase pgvector
Tạo đề thi:    Gemini API — sinh câu hỏi từ nội dung bài giảng
```

### Payments
```
Provider:      Stripe (quốc tế) + VNPay (Việt Nam)
Webhook:       Supabase Edge Functions xử lý payment events
Invoice:       Tự động xuất PDF qua @react-pdf/renderer
```

### Infrastructure
```
Hosting:       Vercel (Next.js)
Database:      Supabase Cloud (free tier → Pro khi scale)
CDN/Media:     Cloudflare R2 (video bài giảng dung lượng lớn)
Email:         Resend (gửi bảng điểm, thông báo tự động)
Monitoring:    Vercel Analytics + Sentry
```

---

## 📁 Cấu trúc thư mục

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: đăng nhập/đăng ký
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Route group: sau khi đăng nhập
│   │   ├── admin/                # Chỉ role: admin
│   │   ├── teacher/              # Chỉ role: teacher
│   │   ├── student/              # Chỉ role: student
│   │   └── parent/               # Chỉ role: parent (phụ huynh)
│   ├── api/                      # API Routes
│   │   ├── ai/                   # AI endpoints (chấm điểm, phân tích)
│   │   ├── payment/              # Stripe/VNPay webhooks
│   │   └── notifications/        # Push notification triggers
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui components (auto-generated)
│   ├── shared/                   # Dùng chung mọi role
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── NotificationBell.tsx
│   ├── admin/                    # Components riêng cho Admin
│   ├── teacher/                  # Components riêng cho Teacher
│   ├── student/                  # Components riêng cho Student
│   └── parent/                   # Components riêng cho Parent
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (RSC)
│   │   └── middleware.ts         # Auth middleware
│   ├── gemini.ts                 # Google Gemini client config
│   ├── stripe.ts                 # Stripe client config
│   ├── validations/              # Zod schemas
│   └── utils.ts
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useRealtime.ts            # Supabase Realtime hooks
│   └── useRole.ts
│
├── types/
│   ├── database.ts               # Supabase generated types
│   └── index.ts
│
├── stores/                       # Zustand stores
│   ├── authStore.ts
│   └── notificationStore.ts
│
└── supabase/
    ├── migrations/               # Database migrations
    ├── functions/                # Edge Functions
    │   ├── send-grade-report/    # Gửi bảng điểm tự động
    │   └── payment-webhook/      # Xử lý thanh toán
    └── seed.sql                  # Dữ liệu mẫu
```

---

## 🗄️ Database Schema (Supabase PostgreSQL)

```sql
-- Core
users           (id, email, role, full_name, phone, avatar_url, created_at)
profiles        (user_id, bio, date_of_birth, address)

-- Academic
courses         (id, name, description, teacher_id, created_at)
classes         (id, course_id, teacher_id, room, schedule, max_students)
enrollments     (id, student_id, class_id, enrolled_at, status)

-- Content
lessons         (id, class_id, title, content, video_url, order, published_at)
assignments     (id, lesson_id, title, type, deadline, max_score, ai_graded)
questions       (id, assignment_id, content, options, correct_answer, points)

-- Student Activity
submissions     (id, student_id, assignment_id, content_url, score, submitted_at)
attendance      (id, student_id, class_id, date, status, note)

-- Communication
notifications   (id, user_id, title, message, type, read, created_at)
announcements   (id, class_id, teacher_id, title, content, created_at)
feedback        (id, parent_id, content, type, status, created_at)

-- Financial
payments        (id, user_id, amount, currency, status, provider, created_at)
invoices        (id, payment_id, pdf_url, issued_at)

-- AI
ai_analyses     (id, student_id, type, result_json, created_at)
grade_reports   (id, student_id, class_id, period, report_json, sent_at)
```

---

## 🔐 Phân quyền (Row Level Security)

| Role | Quyền truy cập |
|---|---|
| `admin` | Full access toàn bộ data |
| `teacher` | CRUD data thuộc classes mình dạy |
| `student` | Read data classes mình enrolled, CRUD submissions của bản thân |
| `parent` | Read-only data con em (liên kết qua parent_students table) |

---

## 🤖 Hướng dẫn cho Antigravity Agent

### ⚠️ Quy tắc bắt buộc
1. **Luôn dùng TypeScript** — không dùng `.js`, chỉ dùng `.ts` và `.tsx`
2. **Luôn dùng Server Components** cho data fetching, Client Components chỉ khi cần interactivity
3. **Luôn validate với Zod** trước khi insert/update database
4. **Luôn dùng Supabase RLS** — không bypass security bằng service role ở frontend
5. **Không hardcode API keys** — luôn dùng `process.env.VARIABLE_NAME`
6. **Luôn handle loading và error states** trong mọi component
7. **Dùng shadcn/ui components** trước khi tự build UI mới
8. **Comment bằng tiếng Việt** cho business logic, tiếng Anh cho technical code

### 📝 Quy ước đặt tên
```
Components:    PascalCase       → StudentDashboard.tsx
Hooks:         camelCase + use  → useStudentGrades.ts
Utils:         camelCase        → formatDate.ts
Constants:     UPPER_SNAKE_CASE → MAX_FILE_SIZE
DB tables:     snake_case       → grade_reports
Env vars:      UPPER_SNAKE_CASE → NEXT_PUBLIC_SUPABASE_URL
```

### 🎯 Thứ tự ưu tiên build
```
Phase 1: Auth + Layout + Role routing
Phase 2: Admin — quản lý user, lớp học
Phase 3: Teacher — quản lý lớp, điểm danh, bài giảng
Phase 4: Student — xem lịch, nộp bài, học trực tuyến
Phase 5: AI features — chấm điểm, phân tích, dự báo
Phase 6: Payment — Stripe + VNPay
Phase 7: Parent portal + báo cáo tự động
Phase 8: Optimization, testing, deployment
```

---

## 🌿 Environment Variables cần thiết

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini
GEMINI_API_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# VNPay
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=

# Email (Resend)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📦 Package cần cài khi khởi tạo project

```bash
# Core
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false

# shadcn/ui
npx shadcn-ui@latest init

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# State Management
npm install zustand @tanstack/react-query

# AI
npm install @google/generative-ai

# Payment
npm install stripe @stripe/stripe-js

# Email
npm install resend

# Charts
npm install recharts

# PDF
npm install @react-pdf/renderer

# Utilities
npm install date-fns clsx tailwind-merge lucide-react
```

---

*File này được tạo để làm context cho Google Antigravity Agent. Cập nhật file này mỗi khi có thay đổi lớn về architecture hoặc requirements.*
