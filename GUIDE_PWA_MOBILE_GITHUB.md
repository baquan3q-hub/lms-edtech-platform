# 📱 PWA + Mobile UI + GitHub Deploy
> Biến web thành Progressive Web App, tối ưu giao diện mobile, đẩy lên GitHub

---

## 🧠 Phân tích yêu cầu

```
3 VIỆC CẦN LÀM:

1. PWA (Progressive Web App)
   → Web chạy như app native trên điện thoại
   → Cài được lên màn hình chính (Add to Home Screen)
   → Hoạt động offline một phần

2. Mobile UI — Responsive đúng chuẩn
   → Mỗi role có layout mobile riêng hợp lý
   → Bottom navigation cho Student & Parent (mobile)
   → Sidebar collapse trên mobile cho Teacher & Admin

3. Push lên GitHub
   → .gitignore đúng (không push .env, node_modules)
   → README đẹp
   → Cấu trúc branch chuẩn
```

---

## 📋 PROMPT 1 — Cài đặt PWA

```
Đọc README.md trước. 
Tech stack: Next.js 14 App Router + TypeScript.

Biến web thành Progressive Web App (PWA).
Dùng thư viện next-pwa.

BƯỚC 1 — Cài thư viện:
npm install next-pwa
npm install --save-dev @types/next-pwa

BƯỚC 2 — Cập nhật next.config.ts:
import withPWA from 'next-pwa'

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
      }
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
      }
    }
  ]
})

export default config

BƯỚC 3 — Tạo file public/manifest.json:
{
  "name": "E-Learning Platform",
  "short_name": "ELearn",
  "description": "Nền tảng học trực tuyến",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Điểm danh",
      "url": "/teacher/attendance",
      "description": "Mở trang điểm danh nhanh"
    },
    {
      "name": "Lịch học",
      "url": "/student/schedule",
      "description": "Xem lịch học"
    }
  ],
  "categories": ["education"],
  "lang": "vi"
}

BƯỚC 4 — Tạo placeholder icons:
Tạo thư mục public/icons/
Tạo file public/icons/generate-icons.md với nội dung:
"Thay thế các file icon này bằng icon thật của app.
Kích thước cần có: 72, 96, 128, 144, 152, 192, 384, 512px"

Tạm thời dùng 1 file SVG placeholder cho tất cả sizes.

BƯỚC 5 — Cập nhật app/layout.tsx:
Thêm vào <head>:
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0f172a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" 
      content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="ELearn" />
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
<meta name="mobile-web-app-capable" content="yes" />

BƯỚC 6 — Thêm banner "Cài ứng dụng":
Tạo component: components/shared/InstallBanner.tsx

Hiện banner nhỏ ở bottom khi:
- User đang dùng mobile
- Chưa cài app
- Chưa dismiss banner

Giao diện:
┌────────────────────────────────────────┐
│ 📱 Cài app để dùng tiện hơn!   [Cài] [✕]│
└────────────────────────────────────────┘

Dùng beforeinstallprompt event để trigger cài đặt.
Lưu trạng thái đã dismiss vào localStorage.
Nhúng vào app/(dashboard)/layout.tsx
```

---

## 📋 PROMPT 2 — Layout Mobile cho từng Role

```
Đọc README.md trước.

Thiết kế layout mobile responsive cho 4 role.
Nguyên tắc: Mobile-first, dùng Tailwind breakpoints
sm: (640px), md: (768px), lg: (1024px)

════════════════════════════════════════
LAYOUT CHUNG — app/(dashboard)/layout.tsx
════════════════════════════════════════

Desktop (lg trở lên):
┌──────────┬────────────────────────────┐
│          │  Header (Navbar)            │
│ Sidebar  ├────────────────────────────┤
│  240px   │                            │
│          │  Main Content              │
│          │                            │
└──────────┴────────────────────────────┘

Mobile (dưới lg):
┌────────────────────────────┐
│  Header (logo + bell + avatar)│
├────────────────────────────┤
│                            │
│  Main Content              │
│  (full width)              │
│                            │
├────────────────────────────┤
│  Bottom Navigation         │  ← chỉ mobile
└────────────────────────────┘

Sidebar mobile: ẩn mặc định, mở khi click hamburger
Dùng shadcn/ui Sheet component cho mobile sidebar.

════════════════════════════════════════
BOTTOM NAVIGATION — theo từng role
════════════════════════════════════════

Tạo component: components/shared/BottomNav.tsx
Chỉ hiện trên mobile (class="lg:hidden")

STUDENT bottom nav (5 items):
[🏠 Trang chủ] [📚 Lớp học] [📅 Lịch] [🏆 Thành tích] [👤 Cá nhân]
/student        /student/classes  /student/schedule  /student/achievements  /student/profile

PARENT bottom nav (4 items):
[🏠 Tổng quan] [📅 Lịch học] [📊 Điểm số] [📝 Xin nghỉ]
/parent         /parent/schedule  /parent/progress  /parent/absence-request

TEACHER bottom nav (4 items):
[🏠 Tổng quan] [📋 Điểm danh] [👥 Học viên] [📅 Lịch dạy]
/teacher        /teacher/attendance  /teacher/students  /teacher/schedule

ADMIN bottom nav (4 items):
[🏠 Dashboard] [👥 Users] [🏫 Lớp học] [📊 Báo cáo]
/admin          /admin/users  /admin/classes  /admin/reports

Style bottom nav:
- Background: white với border-top shadow
- Active item: màu primary với icon filled
- Inactive: gray-400
- Safe area padding cho iPhone (padding-bottom: env(safe-area-inset-bottom))
- Fixed ở bottom, z-index: 50

════════════════════════════════════════
HEADER MOBILE — components/shared/MobileHeader.tsx
════════════════════════════════════════

Chỉ hiện trên mobile (class="lg:hidden"):
┌────────────────────────────────────┐
│ ☰  [Logo/Tên trang]  🔔  👤        │
└────────────────────────────────────┘

- ☰ Hamburger → mở Sheet sidebar
- Tên trang hiện theo route hiện tại
- 🔔 Bell → thông báo (badge số)
- 👤 Avatar → profile menu

════════════════════════════════════════
RESPONSIVE CHO CÁC TRANG QUAN TRỌNG
════════════════════════════════════════

Kiểm tra và fix responsive cho các trang sau:

1. Trang điểm danh giáo viên:
   Desktop: table đầy đủ cột
   Mobile: card view — mỗi học sinh 1 card với 4 nút toggle

2. Bảng xếp hạng:
   Desktop: table đầy đủ
   Mobile: list đơn giản với rank number lớn

3. Dashboard phụ huynh:
   Desktop: grid 2-3 cột
   Mobile: stack dọc, 1 cột

4. Trang lịch học:
   Desktop: calendar view đầy đủ
   Mobile: list view theo ngày, swipe left/right để đổi tuần

5. Trang danh sách học viên:
   Desktop: table với nhiều cột
   Mobile: card với thông tin cốt lõi, 
           swipe để xem thêm hoặc nút "..." menu

Dùng Tailwind: 
- hidden lg:block (chỉ desktop)
- block lg:hidden (chỉ mobile)
- grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- text-sm md:text-base
- p-3 md:p-6
```

---

## 📋 PROMPT 3 — Touch & Mobile UX

```
Đọc README.md trước.

Tối ưu UX cho người dùng mobile — touch interactions.

BƯỚC 1 — Touch targets (kích thước tối thiểu):
Tìm tất cả Button, Link, nút bấm trong toàn app.
Đảm bảo mọi element có thể click đều có:
min-height: 44px và min-width: 44px (Apple guideline)

Trong Tailwind: thêm class "min-h-[44px]" cho các nút nhỏ

BƯỚC 2 — Form inputs trên mobile:
Tìm tất cả <input>, <select>, <textarea>
Thêm các attribute sau để tránh zoom khi tap:
- font-size tối thiểu 16px: class="text-base"
- inputMode đúng loại:
  Email input → inputMode="email"
  Phone input → inputMode="tel"
  Number input → inputMode="numeric"
  Search input → inputMode="search"

BƯỚC 3 — Scroll behavior:
Các danh sách dài (bảng học sinh, lịch sử điểm danh):
- Thêm overflow-x-auto cho table trên mobile
- Wrap bằng: <div className="overflow-x-auto -mx-4 px-4">
- Bảng sẽ scroll ngang thay vì bị cắt

BƯỚC 4 — Loading states cho mobile:
Trên mobile, khi data đang load hiện Skeleton 
thay vì spinner (Skeleton ít gây layout shift hơn)

Tạo skeleton components cho:
- StudentCard skeleton
- AttendanceRow skeleton  
- NotificationItem skeleton
Dùng shadcn/ui Skeleton component

BƯỚC 5 — Pull to refresh (tùy chọn):
Trang dashboard student và parent:
Thêm pull-to-refresh gesture:
npm install react-pull-to-refresh

Khi user kéo xuống từ top → invalidate TanStack Query cache
→ data refresh

BƯỚC 6 — Viewport meta tag:
Kiểm tra app/layout.tsx có dòng sau chưa:
<meta name="viewport" 
      content="width=device-width, initial-scale=1, 
               maximum-scale=1, user-scalable=no" />
Nếu chưa có → thêm vào.
```

---

## 📋 PROMPT 4 — Push lên GitHub

```
Đọc README.md trước.

Chuẩn bị và push toàn bộ project lên GitHub.
Thực hiện đúng thứ tự các bước sau:

════════════════════════════════════════
BƯỚC 1 — Kiểm tra .gitignore
════════════════════════════════════════

Tạo hoặc cập nhật file .gitignore ở root:

# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js build
.next/
out/
build/

# PWA generated files
public/sw.js
public/workbox-*.js
public/worker-*.js
public/sw.js.map
public/workbox-*.js.map

# Environment variables — QUAN TRỌNG: KHÔNG BAO GIỜ PUSH
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# OS files
.DS_Store
Thumbs.db
*.pem

# IDE
.vscode/settings.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln

# Supabase local
supabase/.branches
supabase/.temp

# TypeScript
*.tsbuildinfo
next-env.d.ts

════════════════════════════════════════
BƯỚC 2 — Tạo file .env.example
════════════════════════════════════════

Tạo file .env.example (file này ĐƯỢC push lên GitHub,
dùng để hướng dẫn người clone biết cần env gì):

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

════════════════════════════════════════
BƯỚC 3 — Cập nhật README.md cho GitHub
════════════════════════════════════════

Tạo file README.md (chỉ cho GitHub, khác với 
file context của Antigravity):
Đặt tên: README.github.md tạm thời, 
sau đó rename thành README.md khi push.

Nội dung README.md cho GitHub:

# 🎓 E-Learning Platform

Nền tảng học trực tuyến toàn diện với AI — 
dành cho trung tâm giáo dục, lớp học online.

## ✨ Tính năng chính

- 📋 **Điểm danh điện tử** — realtime, đồng bộ đến phụ huynh
- 🤖 **AI tạo đề thi** — từ nội dung bài giảng bằng ngôn ngữ tự nhiên
- 📊 **Bảng xếp hạng** — chuyên cần & điểm học tập
- 👨‍👩‍👧 **Cổng phụ huynh** — theo dõi con em theo thời gian thực
- 📱 **PWA** — cài như app native trên điện thoại
- 💳 **Thanh toán** — tích hợp Stripe & VNPay

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Realtime + Auth) |
| AI | OpenAI API (GPT-4o) |
| Payment | Stripe + VNPay |
| Deploy | Vercel |

## 🚀 Cài đặt & Chạy local

\`\`\`bash
# 1. Clone repo
git clone https://github.com/[username]/[repo-name].git
cd [repo-name]

# 2. Cài dependencies
npm install

# 3. Cấu hình environment
cp .env.example .env.local
# Điền các giá trị vào .env.local

# 4. Chạy Supabase local (optional)
npx supabase start

# 5. Chạy migrations
npx supabase db push

# 6. Chạy dev server
npm run dev
\`\`\`

Mở [http://localhost:3000](http://localhost:3000)

## 📁 Cấu trúc thư mục

\`\`\`
app/
├── (auth)/          # Đăng nhập, đăng ký
├── admin/           # Dashboard Admin
├── teacher/         # Dashboard Giáo viên
├── student/         # Dashboard Học sinh
└── parent/          # Dashboard Phụ huynh
\`\`\`

## 🔑 Roles & Quyền hạn

| Role | Quyền |
|---|---|
| Admin | Toàn quyền hệ thống |
| Teacher | Quản lý lớp, điểm danh, bài giảng |
| Student | Xem lịch, nộp bài, học online |
| Parent | Theo dõi con, xin nghỉ, thanh toán |

════════════════════════════════════════
BƯỚC 4 — Git commands
════════════════════════════════════════

Chạy các lệnh git sau theo thứ tự:

# Khởi tạo git (nếu chưa có)
git init

# Kiểm tra những file sẽ được commit
git status

# Xác nhận .env.local KHÔNG có trong list trên
# Nếu có → kiểm tra lại .gitignore

# Thêm tất cả file (đã được lọc bởi .gitignore)
git add .

# Commit đầu tiên
git commit -m "feat: initial project setup

- Next.js 14 App Router + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase integration
- 4 roles: admin, teacher, student, parent
- PWA support
- Mobile responsive layout"

# Đổi branch mặc định sang main
git branch -M main

# Thêm remote (thay [username] và [repo-name])
git remote add origin https://github.com/[username]/[repo-name].git

# Push lên GitHub
git push -u origin main

════════════════════════════════════════
BƯỚC 5 — Tạo thêm branches
════════════════════════════════════════

Tạo branch structure chuẩn:

# Branch develop để làm việc hàng ngày
git checkout -b develop
git push -u origin develop

# Khi làm feature mới, tạo branch riêng:
# git checkout -b feature/attendance-system
# git checkout -b feature/ai-quiz-generator
# git checkout -b feature/parent-portal

# Quy tắc đặt tên commit:
# feat: thêm tính năng mới
# fix: sửa bug
# refactor: cải thiện code
# style: thay đổi UI
# docs: cập nhật tài liệu

Sau khi tạo branches xong, báo cáo:
- URL repo GitHub
- Danh sách branches đã tạo
- Số file đã commit
```

---

## 📋 PROMPT 5 — Kiểm tra PWA & Mobile

```
Kiểm tra toàn bộ PWA và mobile UI.

PWA:
□ manifest.json tồn tại tại /public/manifest.json
□ Service worker được generate (sw.js trong public/)
□ next.config.ts đã cấu hình next-pwa đúng
□ Mở DevTools → Application → Manifest → 
  không có lỗi đỏ
□ Lighthouse PWA score ≥ 70
□ Banner "Cài ứng dụng" hiện trên mobile Chrome

MOBILE LAYOUT:
□ Mở web trên mobile (hoặc DevTools responsive mode)
□ Bottom navigation hiện đúng cho từng role
□ Sidebar ẩn đi, chỉ hiện khi click hamburger
□ Không có element nào bị tràn ra ngoài màn hình
□ Form inputs không bị zoom khi tap
□ Tất cả nút đều có kích thước ≥ 44px
□ Table bảng học sinh scroll ngang được trên mobile
□ Loading skeleton hiện khi đang fetch data

GITHUB:
□ Repo đã được tạo trên GitHub
□ .env.local KHÔNG có trong repo
□ .env.example có mặt và đầy đủ
□ README.md hiện đúng trên GitHub
□ Branch main và develop đều có

Với mỗi mục ❌ → fix ngay.
Chụp ảnh màn hình mobile và báo cáo kết quả.
```

---

## ⚠️ Thứ tự build

```
PROMPT 1 — Cài PWA (next-pwa + manifest)
    ↓
PROMPT 2 — Layout mobile + Bottom Nav
    ↓
PROMPT 3 — Touch & Mobile UX
    ↓
PROMPT 4 — Push GitHub
    ↓
PROMPT 5 — Kiểm tra tổng thể
```

---

## 💡 Lưu ý quan trọng

```
VỀ PWA ICONS:
Cần có icon thật trước khi deploy production.
Có thể tạo icon tại: pwa-image-generator.firebaseapp.com
Hoặc: realfavicongenerator.net
Upload 1 ảnh logo → tự generate tất cả sizes.

VỀ GITHUB:
Tạo repo trên github.com trước khi chạy PROMPT 4.
Chọn: Private (nếu dự án riêng) hoặc Public.
KHÔNG khởi tạo repo với README trên GitHub 
(để tránh conflict với local).

VỀ BRANCH STRATEGY:
main     = code production (stable)
develop  = code đang phát triển
feature/ = từng tính năng riêng

Luôn làm việc trên develop hoặc feature/...
Chỉ merge vào main khi đã test kỹ.

VỀ MOBILE TESTING:
Dùng Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M)
Test với các kích thước: 375px (iPhone SE), 
390px (iPhone 14), 412px (Android)
```

---

*Dùng kết hợp với README.md và toàn bộ FEATURE_*.md files*
