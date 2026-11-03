# 📐 Quy Tắc Hệ Thống — LMS EdTech Platform

> **Mục đích**: Tổng hợp tất cả quy tắc kiến trúc, API, UI, cấu trúc thư mục và bảo mật mà AI hoặc developer phải tuân thủ khi code trên dự án này.
>
> **Last updated**: 2026-09-09

---

## 1. Quy Tắc Kiến Trúc

### 1.1 Nguyên tắc tổng quát

| # | Quy tắc | Giải thích |
|---|---|---|
| A1 | **Monorepo full-stack** | Toàn bộ frontend + backend nằm trong 1 repo Next.js App Router. Không có backend service riêng |
| A2 | **Server Actions cho nghiệp vụ nội bộ** | Mọi CRUD database từ UI phải đi qua `lib/actions/*.ts`. Đây là nơi chứa business logic chính |
| A3 | **API Routes cho tích hợp ngoài** | `app/api/*` **chỉ** dùng cho: AI Gemini, Payment webhooks/IPN, Activity tracking, Notifications |
| A4 | **Không thêm bảng mới nếu mở rộng bảng cũ được** | Tránh tạo bảng trùng ý nghĩa. Ưu tiên `ALTER TABLE ... ADD COLUMN` |
| A5 | **Feature mới phải cập nhật docs** | Phải cập nhật đặc tả tính năng và ít nhất một tài liệu liên quan trong: `ARCHITECTURE.md`, `DB_SCHEMA.md`, `SECURITY_CHECKLIST.md`, `TEST_PLAN.md` |
| A6 | **Mỗi thay đổi lớn gắn với actor + workflow + bảng dữ liệu** | Không code feature mơ hồ; phải rõ ai dùng, luồng nào, bảng nào |

### 1.2 Data Access Patterns — Khi nào dùng client nào?

| Pattern | File | Khi dùng | Ví dụ |
|---|---|---|---|
| **Browser Supabase client** | `lib/supabase/client.ts` | Client component cần đọc data công khai theo RLS hoặc realtime | Subscription realtime, client-side fetch |
| **Server Supabase client** | `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers — dùng session user | Mọi CRUD trong `lib/actions/` |
| **Admin Supabase client** | `lib/supabase/admin.ts` | Tác vụ admin, webhook, system job — **bypass RLS** | Tạo user, webhook handler |
| **Middleware Supabase client** | `lib/supabase/middleware.ts` | Next.js middleware — refresh session, cookie handling | `proxy.ts` |

> [!CAUTION]
> **Admin client (`createAdminClient`)** chỉ dùng server-only. Code phải nằm trong file có `"use server"` hoặc Route Handler. PHẢI kiểm quyền trước khi đọc/ghi dữ liệu người khác.

### 1.3 Khi nào dùng Server Action vs API Route?

```
┌─────────────────────────────────────────────────────────────────┐
│ Server Action (lib/actions/)                                    │
│ ✅ Form submit từ UI                                            │
│ ✅ CRUD database nội bộ                                         │
│ ✅ Nghiệp vụ chỉ gọi từ trong app                              │
│ ✅ Cần revalidate page sau khi ghi                              │
├─────────────────────────────────────────────────────────────────┤
│ API Route (app/api/)                                            │
│ ✅ Webhook từ bên ngoài (Stripe, VNPay)                         │
│ ✅ Tích hợp AI (Gemini API)                                     │
│ ✅ Activity tracking (client gửi event)                         │
│ ✅ Notification triggers                                        │
│ ✅ Endpoint cần gọi từ client bằng fetch()                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Quy Tắc API

### 2.1 Auth & Authorization

| # | Quy tắc | Chi tiết |
|---|---|---|
| B1 | **`proxy.ts` bỏ qua `/api`** | Tất cả API routes **PHẢI tự kiểm quyền** (session + role + ownership). Không được dựa vào proxy |
| B2 | **Không tin `role` từ client payload** | Role phải đọc từ Supabase Auth session hoặc `user_metadata` server-side |
| B3 | **Mọi Server Action phải xác định user** | Gọi `createClient()` → `supabase.auth.getUser()` trước khi thực thi |
| B4 | **Teacher chỉ thao tác lớp mình dạy** | Kiểm `teacher_id` hoặc substitute assignment |
| B5 | **Parent chỉ xem student liên kết** | Kiểm `parent_students` relationship |
| B6 | **Student chỉ thao tác dữ liệu mình** | Kiểm `student_id === auth.user.id` |

### 2.2 Request/Response

| # | Quy tắc | Chi tiết |
|---|---|---|
| B7 | **Response thành công** | JSON object có dữ liệu hoặc trạng thái |
| B8 | **Response lỗi** | JSON `{ error: string, message?: string }` + HTTP status phù hợp |
| B9 | **Error không lộ nội bộ** | KHÔNG trả stack trace, secret, hoặc SQL error chi tiết cho client |
| B10 | **Input validation** | Dùng Zod schema (`lib/validations/`) hoặc kiểm tra tường minh ở server |

### 2.3 AI API

| # | Quy tắc | Chi tiết |
|---|---|---|
| B11 | **AI output phải parse + validate** | JSON trả về từ Gemini phải qua regex extract + `JSON.parse()` + schema check |
| B12 | **Retry với rate-limit** | Dùng `callGeminiWithRetry()` — exponential backoff cho 429/503, max 4 retries |
| B13 | **Key rotation** | 5 API keys round-robin qua `getRotatingGeminiModel()` khi batch processing |
| B14 | **Không gửi PII không cần** | Chỉ gửi dữ liệu tối thiểu vào prompt |
| B15 | **AI không tự quyết định điểm/kỷ luật** | Phải có human review hoặc rule rõ ràng |

### 2.4 Payment API

| # | Quy tắc | Chi tiết |
|---|---|---|
| B16 | **Verify signature** | Stripe: `STRIPE_WEBHOOK_SECRET`. VNPay: `vnp_SecureHash` HMAC-SHA512 |
| B17 | **Không tin client** | Amount, currency, status phải lấy từ provider, KHÔNG từ client |
| B18 | **Idempotent** | Xử lý theo event ID / payment intent ID / order ID — tránh duplicate |
| B19 | **Manual transfer** | Parent chỉ gửi yêu cầu, Admin mới duyệt paid |

---

## 3. Quy Tắc UI

### 3.1 Component & Styling

| # | Quy tắc | Chi tiết |
|---|---|---|
| C1 | **Component Library** | Shadcn/UI (28 primitives trong `components/ui/`) + Radix UI |
| C2 | **Styling** | Tailwind CSS **v4** — utility classes, design tokens qua CSS variables |
| C3 | **Font** | Inter (Google Fonts), CSS var `--font-sans` |
| C4 | **Icons** | Lucide React (`lucide-react`) — KHÔNG dùng icon library khác |
| C5 | **Biểu đồ** | Recharts — Radar Chart, Line Chart, Bar Chart |
| C6 | **Toast notifications** | Sonner — `position: "top-right"`, `richColors`, `closeButton`, `4000ms` |
| C7 | **Drag & Drop** | `@dnd-kit/core` + `@dnd-kit/sortable` (chỉ dùng trong Course Builder) |
| C8 | **Markdown render** | `react-markdown` + `remark-math` + `rehype-katex` (hỗ trợ công thức toán) |
| C9 | **PDF** | `@react-pdf/renderer` (tạo PDF) + `react-pdf` (xem PDF) |
| C10 | **Animation** | `@lottiefiles/dotlottie-react` cho Lottie, `tw-animate-css` cho CSS animations |

### 3.2 State Management

| # | Quy tắc | Chi tiết |
|---|---|---|
| C11 | **Server cache** | TanStack React Query — query key theo entity (`classId`, `studentId`, `examId`) |
| C12 | **Client state** | Zustand — cho notifications store, auth store |
| C13 | **Realtime sync** | Supabase Realtime + `useRealtimeSync` hook + TanStack Query invalidation |
| C14 | **Invalidate đúng scope** | Tránh refetch toàn dashboard — chỉ invalidate query key liên quan |

### 3.3 Layout & Responsive

| # | Quy tắc | Chi tiết |
|---|---|---|
| C15 | **Mobile-first** | PWA installable, `MobileHeader` + `BottomNav` cho mobile |
| C16 | **Desktop** | Sidebar cho desktop (`hidden lg:block`), ẩn MobileHeader/BottomNav |
| C17 | **Dashboard layout** | `app/(dashboard)/layout.tsx` wrap `RealtimeSyncProvider` + `MobileHeader` + `BottomNav` + `InstallBanner` |
| C18 | **Mỗi role có layout riêng** | `admin/layout.tsx`, `teacher/layout.tsx`, `student/layout.tsx`, `parent/layout.tsx` |
| C19 | **Ngôn ngữ** | UI bằng **tiếng Việt** (`<html lang="vi">`) |

### 3.4 Components riêng theo role

| Thư mục | Nội dung |
|---|---|
| `components/admin/` | Components chỉ dùng trong admin portal |
| `components/teacher/` | Components chỉ dùng trong teacher portal |
| `components/student/` | Components chỉ dùng trong student portal |
| `components/parent/` | Components chỉ dùng trong parent portal |
| `components/shared/` | 22 components dùng chung: Sidebar, Navbar, Modals, Charts, Leaderboard... |

---

## 4. Quy Tắc Cấu Trúc Thư Mục

### 4.1 Cấu trúc tổng quan

```
lms-edtech-platform/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Route group: Xác thực
│   │   ├── layout.tsx                # Auth layout (không Sidebar/BottomNav)
│   │   └── login/                    # Trang đăng nhập
│   │       └── page.tsx
│   ├── (dashboard)/                  # Route group: Dashboard chung
│   │   ├── layout.tsx                # Wrap RealtimeSync, MobileHeader, BottomNav
│   │   ├── admin/                    # 🔴 Admin Portal
│   │   │   ├── layout.tsx            # Admin sidebar, admin-specific providers
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── users/                # Quản lý user
│   │   │   ├── courses/              # Quản lý khóa học
│   │   │   ├── classes/              # Quản lý lớp học
│   │   │   ├── rooms/                # Quản lý phòng học
│   │   │   ├── attendance/           # Điểm danh
│   │   │   ├── grades/               # Bảng điểm
│   │   │   ├── finance/              # Tài chính
│   │   │   ├── surveys/              # Khảo sát
│   │   │   ├── feedback/             # Phản hồi
│   │   │   ├── announcements/        # Thông báo
│   │   │   ├── students/             # Quản lý học sinh
│   │   │   ├── behavior/             # Phân tích hành vi
│   │   │   └── tracking/             # Activity tracking
│   │   ├── teacher/                  # 🟢 Teacher Portal
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Teacher dashboard
│   │   │   ├── classes/              # Lớp đang dạy
│   │   │   ├── lessons/              # Course Builder
│   │   │   ├── assignments/          # Bài tập / kiểm tra
│   │   │   ├── schedule/             # Lịch dạy
│   │   │   ├── absence-requests/     # Đơn xin nghỉ
│   │   │   ├── announcements/        # Thông báo
│   │   │   ├── students/             # Học sinh + nhận xét
│   │   │   ├── reports/              # Báo cáo chuyên cần
│   │   │   ├── behavior/             # Phân tích hành vi HS
│   │   │   ├── feedback/             # Phản hồi
│   │   │   ├── tracking/             # Tracking
│   │   │   └── profile/              # Hồ sơ cá nhân
│   │   ├── student/                  # 🔵 Student Portal
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Student dashboard
│   │   │   ├── classes/              # Lớp đang học
│   │   │   ├── lessons/              # Xem bài học
│   │   │   ├── assignments/          # Bài tập / thi
│   │   │   ├── grades/               # Bảng điểm cá nhân
│   │   │   ├── schedule/             # Lịch học
│   │   │   ├── attendance/           # Điểm danh
│   │   │   ├── announcements/        # Thông báo
│   │   │   ├── goals/                # Mục tiêu & thói quen
│   │   │   ├── notifications/        # Thông báo cá nhân
│   │   │   └── profile/              # Hồ sơ
│   │   └── parent/                   # 🟡 Parent Portal
│   │       ├── layout.tsx
│   │       ├── page.tsx              # Parent dashboard (ParentDashboardClient)
│   │       ├── children/             # Thông tin con
│   │       ├── link-student/         # Liên kết con
│   │       ├── progress/             # Tiến độ học tập
│   │       ├── payments/             # Thanh toán học phí
│   │       ├── schedule/             # Lịch học con
│   │       ├── absence-request/      # Xin nghỉ cho con
│   │       ├── announcements/        # Thông báo
│   │       ├── feedback/             # Gửi phản hồi
│   │       ├── surveys/              # Khảo sát
│   │       ├── goals/                # Mục tiêu con
│   │       ├── notifications/        # Thông báo
│   │       └── profile/              # Hồ sơ
│   ├── api/                          # API Route Handlers
│   │   ├── activity/                 # Log + page session tracking
│   │   ├── ai/                       # 8+ AI endpoints (generate, analyze, feedback...)
│   │   ├── payment/                  # Stripe webhook, VNPay IPN, parent/admin APIs
│   │   ├── notifications/            # Notification trigger
│   │   └── improvement-quiz/         # Submit quiz cải thiện
│   ├── payment/vnpay/return/         # Trang return sau thanh toán VNPay
│   ├── layout.tsx                    # Root layout: Inter font, QueryProvider, Toaster
│   ├── page.tsx                      # Landing page (trang chủ)
│   ├── globals.css                   # Global styles + Tailwind directives
│   └── manifest.ts                   # PWA manifest
├── components/
│   ├── ui/                           # 28 Shadcn primitives (Button, Dialog, Card...)
│   ├── shared/                       # 22 shared components (Sidebar, Navbar, Charts...)
│   ├── admin/                        # Admin-only components
│   ├── teacher/                      # Teacher-only components
│   ├── student/                      # Student-only components
│   └── parent/                       # Parent-only components
├── hooks/                            # 7 custom hooks
│   ├── useAuth.ts                    # Auth state
│   ├── useActivityTracker.ts         # Activity tracking
│   ├── useNotifications.ts           # Notifications
│   ├── usePageTracker.ts             # Page tracking
│   ├── useRealtimeSync.ts            # Realtime data sync
│   ├── useRealtime.ts                # Realtime base
│   └── useRole.ts                    # Role detection
├── lib/
│   ├── actions/                      # 36 Server Action files (nghiệp vụ chính)
│   ├── supabase/                     # 4 Supabase clients
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   ├── admin.ts                  # Admin client (bypass RLS)
│   │   └── middleware.ts             # Middleware client
│   ├── providers/                    # React providers
│   │   ├── QueryProvider.tsx         # TanStack Query provider
│   │   └── RealtimeSyncProvider.tsx  # Supabase Realtime provider
│   ├── constants/                    # App constants
│   ├── queries/                      # Complex queries (parent-queries.ts)
│   ├── validations/                  # Zod validation schemas
│   ├── notifications/                # Notification helpers
│   ├── utils/                        # Utility functions
│   ├── gemini.ts                     # Gemini AI: client, key rotation, retry
│   ├── stripe.ts                     # Stripe PaymentIntent
│   ├── vnpay.ts                      # VNPay URL + verify
│   └── utils.ts                      # Date/currency/score formatters
├── docs/                             # 27+ tài liệu kỹ thuật
├── proxy.ts                          # Next.js middleware (auth + RBAC routing)
├── next.config.ts                    # Next.js + PWA config
├── package.json                      # Dependencies & scripts
└── tsconfig.json                     # TypeScript config
```

### 4.2 Quy tắc đặt file

| Loại file | Đặt ở đâu | Ví dụ |
|---|---|---|
| **Trang mới** | `app/(dashboard)/[role]/[feature]/page.tsx` | `app/(dashboard)/teacher/exams/page.tsx` |
| **Layout role** | `app/(dashboard)/[role]/layout.tsx` | Sidebar riêng cho role |
| **Server Action mới** | `lib/actions/[tên-module].ts` | `lib/actions/new-feature.ts` |
| **API route mới** | `app/api/[nhóm]/route.ts` | `app/api/ai/new-endpoint/route.ts` |
| **Component dùng chung** | `components/shared/` | `components/shared/NewWidget.tsx` |
| **Component riêng role** | `components/[role]/` | `components/teacher/GradeTable.tsx` |
| **UI primitive** | `components/ui/` | Dùng shadcn CLI: `npx shadcn add [component]` |
| **Custom hook** | `hooks/` | `hooks/useNewFeature.ts` |
| **Zod schema** | `lib/validations/` | Validation cho form/API input |
| **Utility function** | `lib/utils.ts` hoặc `lib/utils/` | Format, convert, helpers |

---

## 5. Quy Tắc Bảo Mật

> [!CAUTION]
> Hệ thống xử lý dữ liệu học sinh, phụ huynh, điểm số, chuyên cần, hành vi và thanh toán. MỌI thay đổi liên quan auth, role, database, AI, payment đều NHẠY CẢM.

### 5.1 Secrets & Environment

| Env var | Mức độ | Quy tắc |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Được expose client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Được expose — **phải dựa vào RLS** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe client key |
| `NEXT_PUBLIC_APP_URL` | Public | URL app cho callbacks |
| `SUPABASE_SERVICE_ROLE_KEY` | ⛔ Server-only | **KHÔNG BAO GIỜ** expose client |
| `GEMINI_API_KEY` + `_1..5` | ⛔ Server-only | AI keys |
| `STRIPE_SECRET_KEY` | ⛔ Server-only | Stripe server |
| `STRIPE_WEBHOOK_SECRET` | ⛔ Server-only | Webhook verify |
| `VNPAY_TMN_CODE` | ⛔ Server-only | VNPay merchant |
| `VNPAY_HASH_SECRET` | ⛔ Server-only | VNPay signing |
| `RESEND_API_KEY` | ⛔ Server-only | Email |

### 5.2 Checklist bắt buộc

- [ ] Không commit `.env.local`
- [ ] Không log secret hoặc full provider response chứa token
- [ ] Không dùng service role trong Client Component
- [ ] Không truyền secret qua props xuống client
- [ ] Mọi endpoint ghi dữ liệu phải có: Session check → Role check → Ownership check → Input validation
- [ ] RLS bật trên mọi bảng (trừ có lý do kỹ thuật ghi rõ)
- [ ] Payment webhook verify signature trước khi xử lý
- [ ] AI output validate schema trước khi lưu
- [ ] File upload: giới hạn loại + size, không dùng filename gốc
- [ ] PWA: không cache dữ liệu nhạy cảm dài hạn

### 5.3 Bảng nhạy cảm cần RLS nghiêm ngặt

| Nhóm | Bảng |
|---|---|
| PII | `users`, `profiles` |
| Gia đình | `parent_students` |
| Học tập | `exam_submissions`, `homework_submissions`, `grade_reports`, `student_reviews` |
| Chuyên cần | `attendance_records`, `absence_requests` |
| Tài chính | `invoices`, `payments` |
| Hành vi | `student_activity_logs`, `student_behavior_scores`, `behavior_alerts` |
| AI | `ai_analyses`, `quiz_class_analysis`, `quiz_individual_analysis` |
