# 🎓 LMS EdTech Platform - Hệ Thống Quản Lý & Vận Hành Trung Tâm Giáo Dục Toàn Diện

[![Next.js Version](https://img.shields.io/badge/Next.js-16.1.6-purple.svg?style=flat&logo=nextdotjs)](https://nextjs.org/)
[![React Version](https://img.shields.io/badge/React-19.0-blue.svg?style=flat&logo=react)](https://react.dev/)
[![Supabase Version](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-emerald.svg?style=flat&logo=supabase)](https://supabase.com/)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%20AI-orange.svg?style=flat&logo=google-gemini)](https://deepmind.google/technologies/gemini/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blueviolet.svg?style=flat&logo=pwa)](https://web.dev/explore/progressive-web-apps)

> **Dự án cá nhân**
> Dự án được nghiên cứu, phân tích, thiết kế, xây dựng, kiểm thử và cải tiến độc lập bởi học viên đảm nhiệm toàn bộ trách nhiệm vai trò Full-stack Developer.

---

## 📌 Tổng Quan Dự Án

**LMS EdTech Platform** là một hệ thống quản lý học tập (LMS) và vận hành trung tâm giáo dục đồng bộ. Nền tảng hướng tới việc giải quyết bài toán vận hành rời rạc của các trung tâm ngoại ngữ/bồi dưỡng văn hóa truyền thống bằng cách tích hợp toàn bộ nghiệp vụ từ quản lý lớp học, tài liệu, bài tập, điểm danh, thanh toán học phí đến liên kết phụ huynh và đánh giá tiến độ học sinh bằng AI vào một nền tảng thống nhất.

## 📁 Tài Liệu Dự Án & Sơ Đồ Thiết Kế

Tất cả các tài liệu phục vụ phân tích thiết kế hệ thống bao gồm:
* 📊 **Sơ đồ UML** (Use Case Diagram, Activity Diagram, Sequence Diagram)
* 📐 **Sơ đồ FDD** (Feature-Driven Development) trên draw.io
* 📄 **Tiểu luận / Báo cáo phân tích hệ thống**

👉 **[Truy cập Thư mục Google Drive Tài Liệu Dự Án](https://drive.google.com/drive/folders/1IhCMRalojCUftwbkwYgAln_cP6QMUqx3?usp=sharing)**

---

## ✨ Các Tính Năng Cốt Lõi Theo Vai Trò (Portals)

Hệ thống được thiết kế phân quyền nghiêm ngặt với 4 cổng giao diện chuyên biệt:

### 👑 Cổng Quản Trị (Admin Portal - `/admin/*`)
* **Quản trị hệ thống:** Quản lý tài khoản (học sinh, giáo viên, phụ huynh), thiết lập lớp học, khóa học, và ghi danh.
* **Thời khóa biểu & Vận hành:** Sắp xếp lịch học, quản lý phòng học, bố trí giáo viên thay thế khi cần.
* **Quản lý tài chính:** Xuất hóa đơn tự động, theo dõi doanh thu học phí, kiểm soát trạng thái thanh toán.
* **Khảo sát & Phản hồi:** Tạo khảo sát ý kiến phụ huynh/học sinh và quản lý phản hồi gửi tới trung tâm.

### 👩‍🏫 Cổng Giáo Viên (Teacher Portal - `/teacher/*`)
* **Vận hành lớp học:** Quản lý danh sách học sinh, điểm danh buổi học, ghi nhận lý do vắng và cộng điểm chuyên cần.
* **Biên soạn học liệu (Course Builder):** Tạo cây thư mục bài học, đính kèm tài liệu (video, tài liệu PDF, liên kết ngoài).
* **Quản lý bài kiểm tra & chấm điểm:** Tạo bài kiểm tra trắc nghiệm/tự luận, thu bài làm, chấm điểm trực tiếp và ghi nhận xét.
* **Tích lũy điểm & Nhận xét:** Cho điểm tích lũy thái độ và viết nhận xét chi tiết gửi cho phụ huynh.

### 🧑‍🎓 Cổng Học Sinh (Student Portal - `/student/*`)
* **Học tập trực quan:** Xem lộ trình học, xem bài giảng, xem video hướng dẫn và tải tài liệu PDF.
* **Làm bài trực tuyến:** Thực hiện làm bài kiểm tra trắc nghiệm, nộp bài tự luận, nhận kết quả và lời giải thích tức thì.
* **Góc học tập & Luyện tập:** Thực hiện các bài Quiz AI cải thiện dựa trên những kiến thức bị hổng mà hệ thống tự động phát hiện.
* **Theo dõi cá nhân:** Xem lịch học, bảng điểm cá nhân, điểm tích lũy và các thông báo từ trung tâm.

### 👨‍👩‍👦 Cổng Phụ Huynh (Parent Portal - `/parent/*`)
* **Theo dõi sát sao:** Xem Điểm trung bình (GPA) học tập, Tỉ lệ chuyên cần đi học của con theo thời gian thực.
* **Bản đồ Năng lực (Radar Chart):** Đánh giá năng lực của con dựa trên 3 tiêu chí: **Điểm số (40%)**, **Chăm chỉ (30%)** và **Thái độ học tập (30%)**.
* **Trợ lý AI phân tích:** AI Gemini tự động phân tích điểm mạnh, điểm yếu và gợi ý lộ trình/phương pháp giúp đỡ con tiến bộ.
* **Tiện ích gia đình:** Xin nghỉ học trực tuyến cho con, thanh toán học phí qua cổng Stripe/VNPay, xem lịch học và nhận xét từ giáo viên.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Front-End & State Management
* **Framework:** Next.js 16.x (App Router, Server Components)
* **Thư viện giao diện:** React 19.x, Tailwind CSS v4, Radix UI, Shadcn UI
* **Quản lý trạng thái:** Zustand (Client-side state), TanStack React Query (Server-side caching & sync)
* **Biểu đồ hiển thị:** Recharts (Radar Chart, Line Chart trực quan hóa năng lực & tiến độ điểm số)
* **Kéo thả:** `@dnd-kit/core` & `@dnd-kit/sortable` cho tính năng sắp xếp học liệu.

### Back-End & Database
* **Database & Auth:** Supabase PostgreSQL với cơ chế Row Level Security (RLS) bảo vệ dữ liệu.
* **Đồng bộ thời gian thực:** Supabase Realtime Sync để đẩy thông báo và cập nhật dữ liệu tức thì.
* **File Storage:** Supabase Storage quản lý tệp tin học liệu, bài tập nộp và hóa đơn.

### Trí Tuệ Nhân Tạo (AI Engine)
* **Trí tuệ nhân tạo:** Google Gemini AI API (`@google/generative-ai`) giúp:
  * Phân tích kết quả bài làm để tự động phát hiện lỗ hổng kiến thức (Knowledge Gaps).
  * Tự sinh bài tập cải thiện cá nhân hóa (AI Improvement Quizzes).
  * Tổng hợp chỉ số học tập để viết báo cáo nhận xét gửi phụ huynh.

### Dịch Vụ Tích Hợp (Third-party APIs)
* **Thanh toán trực tuyến:** Cổng Stripe & VNPay (xử lý giao dịch qua cổng ngân hàng/quét mã QR và Webhooks đối soát trạng thái).
* **Hệ thống Email:** Resend & React Email gửi thông báo tự động khi có hóa đơn mới, lịch thi, hoặc cảnh báo chuyên cần.
* **Đóng gói di động:** Next PWA cho phép cài đặt ứng dụng trên cả điện thoại (iOS, Android) và máy tính như một app bản địa.

---

## 📁 Cấu Trúc Thư Mục Dự Án (Folder Structure)

```text
lms-edtech-platform/
├── app/                  # Next.js App Router (Layouts, Pages & API routes)
│   ├── (auth)/           # Luồng xác thực tài khoản (Đăng nhập, đăng ký, quên mk)
│   ├── (dashboard)/      # Phân hệ giao diện các phân quyền
│   │   ├── admin/        # Cổng quản trị
│   │   ├── teacher/      # Cổng giáo viên
│   │   ├── student/      # Cổng học sinh
│   │   └── parent/       # Cổng phụ huynh
│   ├── api/              # Các API endpoint (Webhooks, AI process, tracking)
│   └── layout.tsx        # Cấu trúc layout bao bọc toàn hệ thống
├── components/           # Thư viện UI Components dùng chung
│   ├── ui/               # Thành phần nguyên tử (Buttons, Dialogs, Cards...) từ Shadcn
│   └── shared/           # Các component phức hợp (Sidebar, Navbar, Calendar...)
├── hooks/                # Custom React hooks (Theo dõi hành vi, đồng bộ thiết bị)
├── lib/                  # Thư viện logic lõi và kết nối bên ngoài
│   ├── actions/          # Next.js Server Actions (CRUD Database bảo mật)
│   ├── supabase/         # Cấu hình kết nối và xác thực với Supabase Client/Server
│   └── utils.ts          # Các hàm helper định dạng ngày tháng, tiền tệ, điểm số
├── docs/                 # Toàn bộ tài liệu thiết kế phần mềm, DB schema, PRD, API spec
├── public/               # Tài nguyên tĩnh (Hình ảnh, Icons cho PWA, Lottie animations)
├── supabase/             # Thư mục quản lý dữ liệu Supabase (SQL Migrations, Seed data, RLS)
├── package.json          # Danh sách dependencies và các kịch bản lệnh
├── tsconfig.json         # Cấu hình trình biên dịch TypeScript
└── next.config.ts        # Cấu hình tối ưu và tùy chỉnh Next.js (PWA, domains)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án

### 📋 Yêu Cầu Hệ Thống
* Node.js phiên bản 18.x trở lên
* Một tài khoản Supabase (đã tạo project mới)
* Google Gemini API Key

### 🛠️ Các Bước Thực Hiện

1. **Clone dự án:**
   ```bash
   git clone https://github.com/baquan3q-hub/lms-edtech-platform.git
   cd lms-edtech-platform
   ```

2. **Cài đặt các thư viện phụ thuộc:**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường (`.env.local`):**
   Tạo tệp `.env.local` ở thư mục gốc và điền đầy đủ các thông tin:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # AI Configuration
   GEMINI_API_KEY=your_gemini_api_key

   # Payment Gateway
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # Email Service
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Thiết lập cơ sở dữ liệu Supabase:**
   Chạy các đoạn mã SQL trong file `schema.sql` (hoặc các file migrations trong thư mục `supabase/`) vào SQL Editor của Supabase để khởi tạo cấu trúc bảng, RLS và các Trigger tự động.

5. **Khởi chạy môi trường phát triển (Development):**
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ được chạy tại cổng: `http://localhost:3000`

6. **Kiểm tra kiểu dữ liệu & Build production:**
   ```bash
   # Type check
   npx tsc --noEmit
   # Build dự án
   npm run build
   ```

---

## 🛡️ Bảo Mật & RLS (Row Level Security)

Để bảo vệ thông tin học vụ và học phí, dự án áp dụng chiến lược bảo mật nhiều lớp:
* **Quyền hạn cấp Cơ sở dữ liệu (RLS):** Mỗi bảng dữ liệu như `invoices`, `submissions`, `attendance` đều có cấu hình RLS riêng để đảm bảo học sinh không thể sửa điểm, phụ huynh chỉ được xem hóa đơn/lớp học của con mình.
* **Server Action Guard:** Tất cả các Server Action trong thư mục `lib/actions/` đều có bước kiểm tra token người dùng qua API Supabase Auth trước khi thực thi bất kỳ truy vấn nào.

---

## 👨‍💻 Tác Giả & Vai Trò Dự Án

* **Họ và tên:** [Tên của bạn]
* **Vai trò:** Product Owner, Solution Architect, UI/UX Designer, Full-stack Developer, QA Engineer.
* **Mục tiêu:** Cung cấp giải pháp số hóa toàn diện giúp kết nối chặt chẽ giữa Nhà trường - Giáo viên - Học sinh - Phụ huynh trên cơ sở tối ưu hóa học tập bằng Trí tuệ nhân tạo (AI).
