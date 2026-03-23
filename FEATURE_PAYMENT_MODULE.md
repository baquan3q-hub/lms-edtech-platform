# 💳 Module Thanh toán — E-Learning Platform
> Workflow đầy đủ: VNPay + Stripe · Học phí · Hóa đơn · Admin quản lý

---

## 🧠 Phân tích toàn bộ luồng Tài chính

```
4 LUỒNG CHÍNH:

LUỒNG 1 — PHỤ HUYNH ĐÓNG HỌC PHÍ
  PH vào app → Xem danh sách học phí cần đóng
  → Chọn phương thức (VNPay hoặc Thẻ quốc tế)
  → Thanh toán → Nhận hóa đơn PDF qua email
  → Trạng thái tự động cập nhật

LUỒNG 2 — ADMIN TẠO & QUẢN LÝ HỌC PHÍ
  Admin tạo bảng học phí cho từng lớp
  → Gán học phí cho từng học sinh
  → Theo dõi ai đã đóng / chưa đóng
  → Gửi nhắc nhở tự động
  → Xuất báo cáo tài chính

LUỒNG 3 — WEBHOOK XỬ LÝ THANH TOÁN
  VNPay/Stripe gọi webhook → Supabase Edge Function
  → Xác nhận thanh toán hợp lệ
  → Cập nhật trạng thái trong DB
  → Tạo hóa đơn PDF tự động
  → Gửi email + notification cho PH

LUỒNG 4 — BÁO CÁO TÀI CHÍNH ADMIN
  Dashboard: doanh thu tháng, tồn đọng
  Bảng giao dịch chi tiết
  Xuất Excel/PDF báo cáo
```

---

## 🗺️ Sơ đồ luồng thanh toán VNPay

```
Phụ huynh bấm "Thanh toán"
        ↓
Next.js API Route tạo VNPay payment URL
(ký HMAC-SHA512, thêm thông tin đơn hàng)
        ↓
Redirect sang trang thanh toán VNPay
(ngân hàng, thẻ ATM, QR...)
        ↓
Phụ huynh thanh toán thành công
        ↓
VNPay redirect về: /payment/vnpay/return
+ gọi IPN webhook về: /api/payment/vnpay/ipn
        ↓
Supabase Edge Function xác thực chữ ký
        ↓
Cập nhật payments table: status = 'succeeded'
        ↓
Tạo hóa đơn PDF + gửi email Resend
        ↓
Phụ huynh thấy trang "Thanh toán thành công"
```

---

## 🗄️ Database Schema

```sql
-- Bảng học phí (Admin tạo cho từng lớp)
fee_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid REFERENCES classes(id),
  name          text NOT NULL,          -- "Học phí tháng 3/2026"
  amount        bigint NOT NULL,        -- Số tiền (VNĐ, không có số lẻ)
  currency      text DEFAULT 'VND',
  due_date      date NOT NULL,          -- Hạn đóng
  description   text,
  is_recurring  boolean DEFAULT false,  -- Học phí định kỳ hàng tháng
  created_by    uuid REFERENCES users(id),
  created_at    timestamp DEFAULT now()
)

-- Hóa đơn gán cho từng học sinh
invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_plan_id     uuid REFERENCES fee_plans(id),
  student_id      uuid REFERENCES users(id),
  class_id        uuid REFERENCES classes(id),
  amount          bigint NOT NULL,
  status          text DEFAULT 'unpaid',
  -- 'unpaid'    = Chưa đóng
  -- 'pending'   = Đang xử lý
  -- 'paid'      = Đã đóng
  -- 'overdue'   = Quá hạn
  -- 'cancelled' = Đã hủy
  -- 'refunded'  = Đã hoàn tiền
  due_date        date NOT NULL,
  paid_at         timestamp,
  pdf_url         text,                -- Link file PDF hóa đơn
  invoice_number  text UNIQUE,         -- HD-2026-0001
  notes           text,
  created_at      timestamp DEFAULT now()
)

-- Giao dịch thanh toán (1 invoice có thể có nhiều attempt)
payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          uuid REFERENCES invoices(id),
  user_id             uuid REFERENCES users(id),  -- người thực hiện TT
  amount              bigint NOT NULL,
  currency            text DEFAULT 'VND',
  provider            text NOT NULL,
  -- 'vnpay' | 'stripe' | 'cash' | 'transfer'
  provider_txn_id     text UNIQUE,     -- mã GD từ VNPay/Stripe
  provider_order_id   text,            -- mã đơn hàng gửi cho provider
  status              text DEFAULT 'pending',
  -- 'pending' | 'succeeded' | 'failed' | 'refunded'
  raw_response        jsonb,           -- raw response từ provider
  ip_address          text,
  created_at          timestamp DEFAULT now(),
  updated_at          timestamp
)

-- Cấu hình học phí tự động (recurring)
fee_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid REFERENCES classes(id),
  amount        bigint NOT NULL,
  day_of_month  integer DEFAULT 1,     -- Ngày mấy trong tháng tạo invoice
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamp DEFAULT now()
)
```

---

## 📋 PROMPT 1 — Database Migration

```
Đọc README.md trước.
Tech stack: Next.js 14 + Supabase + TypeScript.

Tạo file: supabase/migrations/[timestamp]_payment_module.sql

BƯỚC 1 — Tạo 4 bảng:

1. fee_plans (học phí theo lớp):
   id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   class_id uuid REFERENCES classes(id) ON DELETE CASCADE
   name text NOT NULL
   amount bigint NOT NULL CHECK (amount > 0)
   currency text DEFAULT 'VND'
   due_date date NOT NULL
   description text
   is_recurring boolean DEFAULT false
   created_by uuid REFERENCES users(id)
   created_at timestamp DEFAULT now()

2. invoices (hóa đơn từng học sinh):
   id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   fee_plan_id uuid REFERENCES fee_plans(id)
   student_id uuid REFERENCES users(id)
   class_id uuid REFERENCES classes(id)
   amount bigint NOT NULL CHECK (amount > 0)
   status text DEFAULT 'unpaid'
     CHECK (status IN ('unpaid','pending','paid','overdue','cancelled','refunded'))
   due_date date NOT NULL
   paid_at timestamp
   pdf_url text
   invoice_number text UNIQUE
   notes text
   created_at timestamp DEFAULT now()

3. payments (giao dịch):
   id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   invoice_id uuid REFERENCES invoices(id)
   user_id uuid REFERENCES users(id)
   amount bigint NOT NULL
   currency text DEFAULT 'VND'
   provider text NOT NULL
     CHECK (provider IN ('vnpay','stripe','cash','transfer'))
   provider_txn_id text UNIQUE
   provider_order_id text
   status text DEFAULT 'pending'
     CHECK (status IN ('pending','succeeded','failed','refunded'))
   raw_response jsonb DEFAULT '{}'
   ip_address text
   created_at timestamp DEFAULT now()
   updated_at timestamp DEFAULT now()

4. fee_schedules (học phí định kỳ):
   id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   class_id uuid REFERENCES classes(id)
   amount bigint NOT NULL
   day_of_month integer DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28)
   description text
   is_active boolean DEFAULT true
   created_at timestamp DEFAULT now()

BƯỚC 2 — Tạo function tự động tạo invoice_number:
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str text := TO_CHAR(NOW(), 'YYYY');
  seq_num  text;
BEGIN
  SELECT LPAD(COUNT(*)::text + 1, 4, '0')
  INTO seq_num
  FROM invoices
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  NEW.invoice_number := 'HD-' || year_str || '-' || seq_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

BƯỚC 3 — Tự động đánh dấu overdue:
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status = 'unpaid'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

BƯỚC 4 — RLS:
-- Admin: full access
-- Parent: xem invoices của con mình, xem payments của mình
-- Student: xem invoices của bản thân (read-only)
-- Teacher: không có quyền

Chạy: npx supabase db push
Xác nhận không lỗi SQL.
```

---

## 📋 PROMPT 2 — Cài đặt thư viện & Cấu hình

```
Đọc README.md trước.

Cài các thư viện cần thiết:
npm install vnpay @stripe/stripe-js stripe
npm install @react-pdf/renderer
npm install date-fns

Tạo file: lib/vnpay.ts

import crypto from 'crypto'

const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE!,
  hashSecret: process.env.VNPAY_HASH_SECRET!,
  url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  // Đổi sang production URL khi go live:
  // url: 'https://pay.vnpay.vn/vpcpay.html',
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/vnpay/return`,
  ipnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/vnpay/ipn`,
}

export function createVNPayUrl(params: {
  orderId: string      // invoice.id (unique)
  amount: number       // VNĐ (không nhân 100)
  orderInfo: string    // "Thanh toan hoc phi HD-2026-0001"
  ipAddress: string
  locale?: 'vn' | 'en'
}): string {
  const date = new Date()
  const createDate = date.toISOString()
    .replace(/[-:T.Z]/g, '').slice(0, 14)

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Amount: String(params.amount * 100),  // VNPay nhân 100
    vnp_CreateDate: createDate,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: params.ipAddress,
    vnp_Locale: params.locale ?? 'vn',
    vnp_OrderInfo: params.orderInfo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ''),
    vnp_OrderType: 'billpayment',
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
    vnp_TxnRef: params.orderId.slice(0, 8),  // max 8 ký tự
    vnp_ExpireDate: new Date(date.getTime() + 15 * 60000)
      .toISOString().replace(/[-:T.Z]/g, '').slice(0, 14),
  }

  // Sắp xếp params theo alphabet
  const sorted = Object.keys(vnpParams)
    .sort()
    .reduce((acc, key) => ({ ...acc, [key]: vnpParams[key] }), 
      {} as Record<string, string>)

  // Tạo query string và chữ ký
  const signData = new URLSearchParams(sorted).toString()
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  return `${VNPAY_CONFIG.url}?${signData}&vnp_SecureHash=${signed}`
}

export function verifyVNPayReturn(
  query: Record<string, string>
): { isValid: boolean; isSuccess: boolean } {
  const secureHash = query.vnp_SecureHash
  const params = { ...query }
  delete params.vnp_SecureHash
  delete params.vnp_SecureHashType

  const sorted = Object.keys(params).sort()
    .reduce((acc, key) => ({ ...acc, [key]: params[key] }), 
      {} as Record<string, string>)

  const signData = new URLSearchParams(sorted).toString()
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  return {
    isValid: signed === secureHash,
    isSuccess: query.vnp_ResponseCode === '00',
  }
}

Tạo file: lib/stripe.ts

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export async function createStripePaymentIntent(params: {
  amount: number       // VNĐ
  currency: string
  invoiceId: string
  studentName: string
  description: string
}) {
  return stripe.paymentIntents.create({
    amount: Math.round(params.amount),
    currency: params.currency.toLowerCase(),
    metadata: {
      invoiceId: params.invoiceId,
      studentName: params.studentName,
    },
    description: params.description,
    automatic_payment_methods: { enabled: true },
  })
}

Thêm vào .env.local:
VNPAY_TMN_CODE=       ← Lấy từ sandbox.vnpayment.vn
VNPAY_HASH_SECRET=    ← Lấy từ VNPay merchant portal
STRIPE_SECRET_KEY=    ← Lấy từ dashboard.stripe.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= ← Từ Stripe
STRIPE_WEBHOOK_SECRET=  ← Sau khi tạo webhook trên Stripe

Thêm vào .env.example tương tự.
```

---

## 📋 PROMPT 3 — API Routes xử lý thanh toán

```
Đọc README.md trước.

Tạo 4 API Route files:

══════════════════════════════════════════
FILE 1: app/api/payment/create/route.ts
══════════════════════════════════════════
POST — Tạo link thanh toán (VNPay hoặc Stripe)

import { createVNPayUrl } from '@/lib/vnpay'
import { createStripePaymentIntent } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  invoiceId: z.string().uuid(),
  provider: z.enum(['vnpay', 'stripe']),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { invoiceId, provider } = schema.parse(body)

    // Lấy thông tin invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        users!student_id ( full_name ),
        fee_plans ( name )
      `)
      .eq('id', invoiceId)
      .single()

    if (!invoice) 
      return NextResponse.json({ error: 'Invoice không tồn tại' }, { status: 404 })
    
    if (invoice.status === 'paid')
      return NextResponse.json({ error: 'Hóa đơn đã được thanh toán' }, { status: 400 })

    // Tạo bản ghi payment pending
    const orderId = `${invoiceId.slice(0, 8)}-${Date.now()}`
    
    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      user_id: user.id,
      amount: invoice.amount,
      currency: 'VND',
      provider,
      provider_order_id: orderId,
      status: 'pending',
      ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    })

    // Cập nhật invoice status = pending
    await supabase.from('invoices')
      .update({ status: 'pending' })
      .eq('id', invoiceId)

    if (provider === 'vnpay') {
      const payUrl = createVNPayUrl({
        orderId,
        amount: invoice.amount,
        orderInfo: `Thanh toan ${invoice.invoice_number}`,
        ipAddress: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      })
      return NextResponse.json({ provider: 'vnpay', payUrl })
    }

    if (provider === 'stripe') {
      const intent = await createStripePaymentIntent({
        amount: invoice.amount,
        currency: 'vnd',
        invoiceId,
        studentName: invoice.users?.full_name ?? '',
        description: `${invoice.fee_plans?.name} - ${invoice.invoice_number}`,
      })
      return NextResponse.json({
        provider: 'stripe',
        clientSecret: intent.client_secret,
      })
    }

  } catch (error) {
    console.error('[Payment Create]', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

══════════════════════════════════════════
FILE 2: app/api/payment/vnpay/ipn/route.ts
══════════════════════════════════════════
GET — VNPay gọi IPN để xác nhận thanh toán

import { verifyVNPayReturn } from '@/lib/vnpay'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams)
  
  const supabase = createClient()
  const { isValid, isSuccess } = verifyVNPayReturn(query)

  if (!isValid) {
    return new Response('97', { status: 200 }) // Invalid signature
  }

  const orderId = query.vnp_TxnRef
  const txnId = query.vnp_TransactionNo

  // Tìm payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*, invoices(*)')
    .eq('provider_order_id', orderId)
    .single()

  if (!payment) return new Response('01', { status: 200 }) // Order not found

  if (isSuccess) {
    // Cập nhật payment thành công
    await supabase.from('payments').update({
      status: 'succeeded',
      provider_txn_id: txnId,
      raw_response: query,
      updated_at: new Date().toISOString(),
    }).eq('id', payment.id)

    // Cập nhật invoice = paid
    await supabase.from('invoices').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', payment.invoice_id)

    // Trigger tạo PDF và gửi email
    // (gọi Edge Function)
    await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoiceId: payment.invoice_id }
    })

    return new Response('00', { status: 200 }) // Success
  } else {
    // Thanh toán thất bại
    await supabase.from('payments').update({
      status: 'failed',
      raw_response: query,
    }).eq('id', payment.id)

    await supabase.from('invoices').update({
      status: 'unpaid'
    }).eq('id', payment.invoice_id)

    return new Response('00', { status: 200 })
  }
}

══════════════════════════════════════════
FILE 3: app/payment/vnpay/return/page.tsx
══════════════════════════════════════════
Trang phụ huynh được redirect về sau khi TT VNPay

'use client'
Đọc query params từ URL (vnp_ResponseCode, vnp_Amount...)
Gọi API verify: POST /api/payment/vnpay/verify
Hiện 1 trong 2 trạng thái:

THÀNH CÔNG:
┌─────────────────────────────────────┐
│  ✅ Thanh toán thành công!          │
│                                     │
│  Hóa đơn: HD-2026-0001             │
│  Số tiền: 2.500.000 ₫              │
│  Thời gian: 15/03/2026 14:30       │
│  Mã GD: [VNPay TxnRef]             │
│                                     │
│  📧 Hóa đơn đã gửi về email        │
│                                     │
│  [📥 Tải hóa đơn PDF]              │
│  [🏠 Về trang chủ]                  │
└─────────────────────────────────────┘

THẤT BẠI:
┌─────────────────────────────────────┐
│  ❌ Thanh toán không thành công     │
│                                     │
│  Lý do: [mô tả lỗi]               │
│                                     │
│  [🔄 Thử lại]                      │
│  [🏠 Về trang chủ]                  │
└─────────────────────────────────────┘

══════════════════════════════════════════
FILE 4: app/api/payment/stripe/webhook/route.ts
══════════════════════════════════════════
POST — Stripe gọi webhook

import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')!

  try {
    const event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    )

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object
      const invoiceId = intent.metadata.invoiceId
      // Logic tương tự VNPay IPN: cập nhật payment + invoice
      // Gọi Edge Function tạo PDF
    }

  } catch (err) {
    return new Response('Webhook Error', { status: 400 })
  }

  return new Response('OK', { status: 200 })
}
```

---

## 📋 PROMPT 4 — Supabase Edge Function: Tạo PDF & Gửi Email

```
Đọc README.md trước.

Tạo file: supabase/functions/generate-invoice-pdf/index.ts

Edge Function này được gọi sau khi thanh toán thành công.
Nhiệm vụ: tạo hóa đơn PDF + upload Storage + gửi email.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { invoiceId } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Lấy đầy đủ thông tin hóa đơn
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      users!student_id ( full_name, email, phone ),
      classes ( name ),
      fee_plans ( name, description ),
      payments ( provider, provider_txn_id, created_at )
    `)
    .eq('id', invoiceId)
    .single()

  // Tạo HTML hóa đơn (đơn giản, dễ convert)
  const invoiceHtml = generateInvoiceHTML(invoice)

  // Dùng Deno HTML-to-PDF (hoặc đơn giản là tạo HTML đẹp)
  // Upload HTML lên Supabase Storage
  const fileName = `invoices/${invoice.invoice_number}.html`
  await supabase.storage
    .from('documents')
    .upload(fileName, invoiceHtml, {
      contentType: 'text/html',
      upsert: true
    })

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName)

  // Cập nhật pdf_url vào invoice
  await supabase.from('invoices')
    .update({ pdf_url: publicUrl })
    .eq('id', invoiceId)

  // Tạo notification cho phụ huynh
  // (query parent_students để tìm phụ huynh của student)
  const { data: parents } = await supabase
    .from('parent_students')
    .select('parent_id, users!parent_id(email, full_name)')
    .eq('student_id', invoice.student_id)

  for (const parent of parents ?? []) {
    await supabase.from('notifications').insert({
      user_id: parent.parent_id,
      title: '✅ Thanh toán học phí thành công',
      message: `Hóa đơn ${invoice.invoice_number} - ${
        new Intl.NumberFormat('vi-VN', { 
          style: 'currency', currency: 'VND' 
        }).format(invoice.amount)
      } đã được xác nhận.`,
      type: 'payment_success',
      metadata: { invoiceId, pdfUrl: publicUrl }
    })

    // Gửi email qua Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@yourdomain.com',
        to: parent.users?.email,
        subject: `✅ Hóa đơn học phí ${invoice.invoice_number}`,
        html: generateEmailHTML(invoice, publicUrl),
      })
    })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})

function generateInvoiceHTML(invoice: Record<string, unknown>): string {
  return \`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #0066cc; pb: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .invoice-title { font-size: 20px; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .amount-box { background: #f0f7ff; padding: 20px; border-radius: 8px; 
                  text-align: center; font-size: 28px; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🎓 E-Learning Platform</div>
    <div class="invoice-title">HÓA ĐƠN THANH TOÁN</div>
    <div>Số: ${invoice.invoice_number}</div>
  </div>
  
  <div class="info-grid">
    <div>
      <h3>Thông tin học sinh</h3>
      <p>Họ tên: ${invoice.users?.full_name}</p>
      <p>Lớp: ${invoice.classes?.name}</p>
    </div>
    <div>
      <h3>Thông tin thanh toán</h3>
      <p>Ngày TT: ${new Date(invoice.paid_at).toLocaleDateString('vi-VN')}</p>
      <p>Phương thức: ${invoice.payments?.[0]?.provider?.toUpperCase()}</p>
      <p>Mã GD: ${invoice.payments?.[0]?.provider_txn_id}</p>
    </div>
  </div>
  
  <div class="amount-box">
    ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(invoice.amount)}
  </div>
  
  <p style="text-align:center; color: green; font-size: 18px; margin-top: 20px;">
    ✅ ĐÃ THANH TOÁN
  </p>
  
  <div class="footer">
    Cảm ơn quý phụ huynh đã đóng học phí đúng hạn<br>
    Mọi thắc mắc xin liên hệ: support@yourdomain.com
  </div>
</body>
</html>
\`
}

Deploy: supabase functions deploy generate-invoice-pdf
```

---

## 📋 PROMPT 5 — Trang Thanh toán Phụ huynh

```
Đọc README.md trước.

Tạo trang: app/parent/payments/page.tsx

HEADER:
"💳 Học phí & Thanh toán"
Badge tổng tiền còn nợ: "Còn lại: X,XXX,XXX ₫"

TABS: [📋 Chờ đóng] [✅ Đã đóng] [📄 Hóa đơn]

════════════════════════════════
TAB 1 — HỌC PHÍ CHỜ ĐÓNG
════════════════════════════════

Mỗi hóa đơn 1 Card:
┌─────────────────────────────────────────────┐
│  📚 Học phí tháng 3/2026                   │
│  Lớp: Tiếng Anh B1 • HD-2026-0003         │
│                                             │
│  Số tiền: 2.500.000 ₫                      │
│  Hạn đóng: 15/03/2026                      │
│                                             │
│  [🔴 Quá hạn 3 ngày]                       │
│  hoặc [🟡 Còn 5 ngày]                      │
│  hoặc [🟢 Còn 2 tuần]                      │
│                                             │
│  [💳 Thanh toán ngay]                      │
└─────────────────────────────────────────────┘

Khi click "Thanh toán ngay" → mở Dialog:
┌─────────────────────────────────────────────┐
│  💳 Chọn phương thức thanh toán            │
│                                             │
│  Hóa đơn: HD-2026-0003                     │
│  Số tiền: 2.500.000 ₫                      │
│                                             │
│  ○ 🏦 VNPay (ATM, QR, Internet Banking)   │
│     Hỗ trợ tất cả ngân hàng Việt Nam      │
│                                             │
│  ○ 💳 Thẻ quốc tế (Visa/Mastercard)       │
│     Stripe — Bảo mật 3D Secure            │
│                                             │
│  [Tiến hành thanh toán]                    │
└─────────────────────────────────────────────┘

Khi chọn VNPay:
  → POST /api/payment/create { invoiceId, provider: 'vnpay' }
  → Nhận payUrl → window.location.href = payUrl
  → Người dùng được redirect sang VNPay

Khi chọn Stripe:
  → POST /api/payment/create { invoiceId, provider: 'stripe' }
  → Nhận clientSecret
  → Hiện Stripe Elements form ngay trong Dialog
  → Điền thẻ + Submit → confirm payment

════════════════════════════════
TAB 2 — ĐÃ ĐÓNG
════════════════════════════════

Bảng lịch sử:
Tên lớp | Hóa đơn | Số tiền | Ngày đóng | Phương thức | [Tải PDF]

Nút [Tải PDF] → window.open(invoice.pdf_url)

════════════════════════════════
TAB 3 — HÓA ĐƠN
════════════════════════════════

Danh sách tất cả hóa đơn có thể lọc theo:
  Trạng thái | Tháng | Lớp học

Dùng shadcn/ui: Card, Tabs, Dialog, Badge,
RadioGroup, Button, Table, Select
Dùng @stripe/stripe-js: Elements, PaymentElement
```

---

## 📋 PROMPT 6 — Trang Tài chính Admin

```
Đọc README.md trước.

Tạo trang: app/admin/finance/page.tsx

HEADER:
"💰 Quản lý Tài chính"
[+ Tạo học phí mới] [📊 Xuất báo cáo Excel]

════════════════════════════
PHẦN 1 — 4 KPI CARDS
════════════════════════════

[💰 Doanh thu tháng này]  [⏳ Học phí chờ thu]
[✅ Đã thu / Tổng]        [⚠️ Quá hạn]

════════════════════════════
PHẦN 2 — BIỂU ĐỒ
════════════════════════════

BarChart doanh thu 6 tháng (Recharts)
Mỗi bar có 2 phần: Đã thu (xanh) + Chờ thu (cam)

════════════════════════════
PHẦN 3 — BẢNG HỌC PHÍ
════════════════════════════

TABS: [📋 Theo lớp] [👤 Theo học sinh] [💳 Giao dịch]

TAB "Theo lớp":
Cột: Lớp | Giáo viên | Tổng HS | Đã đóng | Chưa đóng | % | Hành động
Nút "Nhắc nhở" → gửi notification đến PH chưa đóng
Nút "Chi tiết" → /admin/finance/class/[classId]

TAB "Theo học sinh":
Cột: HS | Lớp | Hóa đơn | Số tiền | Hạn | Trạng thái | Hành động
Filter: [Tất cả] [Chưa đóng] [Quá hạn] [Đã đóng]
Nút "Xóa hóa đơn" | "Đánh dấu đã đóng thủ công"
  (cho trường hợp nộp tiền mặt tại trung tâm)

TAB "Giao dịch":
Cột: Thời gian | Người TT | Hóa đơn | Số tiền | Provider | Trạng thái
Filter theo ngày, provider, trạng thái
Nút "Xem chi tiết" → mở Sheet với raw_response

════════════════════════════
DIALOG TẠO HỌC PHÍ
════════════════════════════

Khi click "+ Tạo học phí mới":
Form với các trường:
1. Chọn lớp (Select — lấy danh sách classes)
2. Tên học phí (VD: "Học phí tháng 3/2026")
3. Số tiền (NumberInput — hiện format VNĐ khi nhập)
4. Hạn đóng (DatePicker)
5. Ghi chú (Textarea — tùy chọn)
6. Áp dụng cho: [Tất cả học sinh lớp này]

Khi Submit:
  → INSERT fee_plans
  → Bulk INSERT invoices cho TẤT CẢ học sinh enrolled
  → Bulk INSERT notifications cho TẤT CẢ phụ huynh:
     "📬 Thông báo học phí tháng X — [số tiền]"
  → Toast: "Đã tạo X hóa đơn cho X học sinh"

════════════════════════════
TÍNH NĂNG GHI THU THỦ CÔNG
════════════════════════════

Trong tab "Theo học sinh", với từng hóa đơn:
Nút "💵 Ghi thu tiền mặt":
Dialog xác nhận:
  "Xác nhận thu tiền mặt [X]₫ từ phụ huynh [Tên]?"
  Textarea: Ghi chú (VD: "PH đến trực tiếp nộp 14/03")
  Nút "✅ Xác nhận"
→ INSERT payments với provider = 'cash'
→ UPDATE invoice status = 'paid'
→ Gửi notification + hóa đơn cho PH

Dùng shadcn/ui: Card, Tabs, Table, Dialog,
Select, DatePicker, Input, Badge, Button, Sheet
Dùng Recharts: BarChart, Bar, XAxis, YAxis, Tooltip
```

---

## 📋 PROMPT 7 — Nhắc nhở học phí tự động

```
Đọc README.md trước.

Tạo Supabase Edge Function:
supabase/functions/remind-payment/index.ts

Function này chạy theo lịch (Cron):
- 7 ngày trước hạn: nhắc nhở lần 1
- 3 ngày trước hạn: nhắc nhở lần 2
- Ngày hạn: nhắc nhở lần 3 (urgent)
- Sau hạn: đánh dấu overdue + nhắc lần cuối

Logic:
1. Query tất cả invoices status = 'unpaid'
2. Tính số ngày còn lại đến due_date
3. Với từng invoice phù hợp:
   a. Tìm phụ huynh của học sinh
   b. Tạo notification:
      - 7 ngày: "📬 Nhắc nhở học phí sắp đến hạn"
      - 3 ngày: "⚠️ Học phí sắp đến hạn (còn 3 ngày)"
      - 0 ngày: "🔴 Học phí đến hạn hôm nay"
      - Quá hạn: "❌ Học phí đã quá hạn X ngày"

Tránh gửi trùng:
  Kiểm tra notifications table:
  Nếu đã có notification cùng loại trong 24h → skip

Đăng ký Cron trong supabase/config.toml:
[functions.remind-payment]
schedule = "0 8 * * *"  ← Chạy lúc 8h sáng mỗi ngày

Deploy: supabase functions deploy remind-payment
```

---

## 📋 PROMPT 8 — Cập nhật Admin Dashboard: Card Doanh thu

```
Đọc README.md trước.

Mở file: components/admin/dashboard/KPICards.tsx
(hoặc tìm component KPI trên admin dashboard)

Cập nhật card "Doanh thu" để hiện số liệu thật
từ bảng payments và invoices vừa tạo.

Thêm vào lib/queries/admin-queries.ts:

export function useFinancialKPIs() {
  return useQuery({
    queryKey: ['admin-financial-kpis'],
    queryFn: async () => {
      const firstOfMonth = new Date(
        new Date().getFullYear(), 
        new Date().getMonth(), 1
      ).toISOString()

      const [revenue, pending, overdue] = await Promise.all([
        // Doanh thu tháng này
        supabase.from('payments')
          .select('amount')
          .eq('status', 'succeeded')
          .gte('created_at', firstOfMonth)
          .then(({ data }) => 
            data?.reduce((s, p) => s + p.amount, 0) ?? 0),
        
        // Học phí chờ thu
        supabase.from('invoices')
          .select('amount')
          .in('status', ['unpaid', 'pending'])
          .then(({ data }) => ({
            amount: data?.reduce((s, i) => s + i.amount, 0) ?? 0,
            count: data?.length ?? 0
          })),
        
        // Quá hạn
        supabase.from('invoices')
          .select('id', { count: 'exact' })
          .eq('status', 'overdue')
          .then(({ count }) => count ?? 0),
      ])

      return { revenue, pending, overdue }
    },
    refetchInterval: 5 * 60 * 1000,
  })
}

Cập nhật KPI card "Doanh thu" dùng hook này.
Format số tiền: Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
```

---

## 📋 PROMPT 9 — Kiểm tra toàn bộ luồng thanh toán

```
Kiểm tra end-to-end toàn bộ module thanh toán.
Dùng môi trường sandbox (VNPay sandbox + Stripe test).

SETUP TEST:
Tạo 1 fee_plan cho 1 lớp → 
Tạo invoices cho 2 học sinh test

LUỒNG VNPAY:
□ Admin tạo học phí → notifications gửi đến PH
□ PH vào tab "Chờ đóng" → thấy hóa đơn
□ PH click "Thanh toán" → chọn VNPay → Dialog hiện
□ Click "Tiến hành TT" → redirect sang sandbox VNPay
□ Dùng thẻ test VNPay: 9704198526191432198
   Tên: NGUYEN VAN A
   Ngày phát hành: 07/15, OTP: 123456
□ Thanh toán thành công → redirect về /payment/vnpay/return
□ Trang hiện "✅ Thành công" với thông tin GD
□ Invoice status đổi sang 'paid' trong DB
□ PH nhận notification + email
□ Admin dashboard cập nhật doanh thu

LUỒNG STRIPE:
□ PH chọn Stripe → hiện form thẻ ngay trong Dialog
□ Điền thẻ test: 4242 4242 4242 4242 / 12/30 / CVC: 123
□ Submit → payment thành công
□ Invoice cập nhật → notification gửi

GHI THU THỦ CÔNG:
□ Admin vào Finance → Theo học sinh
□ Click "Ghi thu tiền mặt" cho 1 invoice
□ Xác nhận → invoice = 'paid'
□ PH nhận notification

NHẮC NHỞ:
□ Tạo invoice với due_date = hôm nay + 3 ngày
□ Trigger thủ công Edge Function remind-payment
□ PH nhận notification nhắc nhở

Với mỗi mục ❌ → đọc logs, fix, test lại.
Báo cáo kết quả từng mục.
```

---

## ⚠️ Thứ tự build bắt buộc

```
PROMPT 1 → Migration database (TRƯỚC TIÊN)
    ↓
PROMPT 2 → Cài thư viện + lib/vnpay.ts + lib/stripe.ts
    ↓
PROMPT 3 → API Routes (create payment, IPN, webhook)
    ↓
PROMPT 4 → Edge Function tạo PDF + gửi email
    ↓
PROMPT 5 → Trang thanh toán Phụ huynh
    ↓
PROMPT 6 → Trang Tài chính Admin
    ↓
PROMPT 7 → Edge Function nhắc nhở tự động
    ↓
PROMPT 8 → Cập nhật KPI dashboard Admin
    ↓
PROMPT 9 → Test toàn bộ
```

---

## 💡 Lưu ý quan trọng

```
VNPay SANDBOX vs PRODUCTION:
Sandbox URL: sandbox.vnpayment.vn (test miễn phí)
Production URL: pay.vnpay.vn (cần đăng ký merchant)
Thẻ test sandbox: 9704198526191432198

STRIPE TEST vs LIVE:
Test key bắt đầu bằng: sk_test_ / pk_test_
Live key bắt đầu bằng:  sk_live_ / pk_live_
Thẻ test Stripe: 4242 4242 4242 4242

BẢO MẬT WEBHOOK:
KHÔNG bao giờ bỏ qua bước verify chữ ký.
VNPay: verify HMAC-SHA512
Stripe: verify stripe-signature header
→ Thiếu bước này → hacker có thể fake payment

SỐ TIỀN VNPAY:
VNPay yêu cầu nhân 100 khi truyền vào vnp_Amount
→ 2,500,000 VNĐ → truyền 250000000
→ Đã xử lý trong lib/vnpay.ts

TIỀN VNĐ KHÔNG CÓ SỐ LẺ:
Lưu trong DB kiểu bigint (không dùng decimal/float)
→ Tránh lỗi làm tròn số
```

---

*Dùng kết hợp với README.md, FEATURE_ADMIN_DASHBOARD.md,
FEATURE_DATA_FLOW_SYNC.md*
