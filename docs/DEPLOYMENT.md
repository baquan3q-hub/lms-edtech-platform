# Deployment - LMS EdTech Platform

Last reviewed: 2026-05-27

## 1. Stack triển khai

Ứng dụng là Next.js 16 App Router, chạy với Node.js, Supabase, Gemini, Stripe, VNPay và PWA. Target deploy phù hợp nhất là Vercel hoặc môi trường Node hỗ trợ Next.js standalone/serverless route handlers.

## 2. Lệnh local

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

Ghi chú: trong quá trình phát triển UI, dùng `npm run dev`. Chỉ chạy `npm run build` khi cần kiểm tra production build.

## 3. Environment variables

Tối thiểu:

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
RESEND_API_KEY=
```

Tùy chọn cho Gemini key rotation:

```bash
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
GEMINI_API_KEY_4=
GEMINI_API_KEY_5=
```

## 4. Supabase setup

Trước deploy:

1. Tạo Supabase project.
2. Chạy migration/schema theo thứ tự đã chuẩn hóa.
3. Bật Auth provider cần dùng.
4. Thiết lập RLS policies.
5. Tạo storage buckets cho lesson videos/files/documents nếu dùng.
6. Bật realtime cho bảng cần realtime.
7. Generate/cập nhật `types/database.ts` nếu quy trình type generation được dùng.

Rủi ro hiện tại: `supabase/` có nhiều SQL phase/setup file. Cần xác định baseline chính thức trước khi deploy môi trường mới.

## 5. Payment setup

### Stripe

1. Set `STRIPE_SECRET_KEY`.
2. Tạo webhook endpoint trỏ về `/api/payment/stripe/webhook`.
3. Set `STRIPE_WEBHOOK_SECRET`.
4. Test bằng Stripe sandbox.

### VNPay

1. Set `VNPAY_TMN_CODE`.
2. Set `VNPAY_HASH_SECRET`.
3. Set `NEXT_PUBLIC_APP_URL` đúng domain public.
4. Return URL: `/payment/vnpay/return`.
5. IPN URL: `/api/payment/vnpay/ipn`.
6. Test sandbox trước khi đổi production URL trong `lib/vnpay.ts`.

## 6. AI setup

1. Set `GEMINI_API_KEY`.
2. Nếu batch analysis hay bị quota, set thêm `GEMINI_API_KEY_1..5`.
3. Kiểm tra `/api/ai/generate-questions`, `/api/ai/analyze-quiz-class`, `/api/ai/analyze-quiz-individual`.
4. Đảm bảo UI hiển thị lỗi mềm khi AI rate limit hoặc parse lỗi.

## 7. PWA setup

`next-pwa` đang build service worker vào `public/`, disable trong development. Sau deploy:

- Kiểm tra manifest.
- Kiểm tra install prompt/mobile install.
- Kiểm tra service worker update sau deploy mới.
- Kiểm tra logout/login user khác không nhìn thấy dữ liệu cached của user trước.

## 8. Release checklist

Trước khi deploy:

- Pull latest branch cần deploy.
- `npm install` hoặc CI install clean từ lockfile.
- `npm run lint` pass.
- `npm run build` pass.
- Migration đã chạy trên target DB.
- Env vars đầy đủ.
- Stripe/VNPay callback domain đúng.
- Smoke test đủ 4 role trên preview.
- Kiểm tra AI route với key sandbox/production phù hợp.

Sau khi deploy:

- Login admin/teacher/student/parent.
- Tạo hoặc mở class thử.
- Mở dashboard attendance.
- Mở learn page của student.
- Gọi thử notification.
- Test payment sandbox nếu deploy staging.
- Kiểm tra console/network không có lỗi nghiêm trọng.

## 9. Rollback

Rollback app:

1. Revert deployment về build trước trên hosting provider.
2. Kiểm tra route login và dashboard.
3. Nếu service worker gây lỗi, tăng version/clear SW hoặc deploy fix SW.

Rollback database:

- Chỉ rollback migration nếu có script đảo ngược đã test.
- Với thay đổi destructive, ưu tiên forward fix.
- Không drop column/table production nếu chưa backup.

## 10. Observability cần bổ sung

Hiện codebase chưa thể hiện rõ hệ thống logging/monitoring production. Nên bổ sung:

- Error tracking cho Next.js server/client.
- Payment webhook/IPN audit log.
- AI request status log: started/succeeded/failed/rate_limited.
- Admin audit log cho user/class/payment changes.
- Health check endpoint nếu hosting cần.

