# Rà soát hiệu năng tải dữ liệu — 25/11/2026

## Phạm vi và mức độ tin cậy

Người dùng phản ánh các trang tải thông tin rất chậm.

- **Cách rà soát:** đọc tĩnh mã nguồn, không chạy trên Supabase hay Vercel thật.
- **Số đo tham chiếu:** lấy từ [rà soát 04/11](RA_SOAT_KIEN_TRUC_VA_HIEU_NANG_2026-11-04.md). Mỗi lượt gọi Supabase từ máy dev mất 195–776 ms.
- **Chưa có:** số đo trước/sau trên môi trường thật. Cách tự đo nằm ở mục "Cách đo" bên dưới.

## Kết luận

Trang chậm vì ba lý do cộng lại:

1. **Gọi nối tiếp quá nhiều lần.** Mỗi trang gọi Supabase nhiều lượt, lượt sau chờ lượt trước xong mới chạy. Với 200–700 ms mỗi lượt, 10–20 lượt nối tiếp là đã mất vài giây.
2. **Tải dư dữ liệu.** Có query lấy dữ liệu của mọi thời điểm hoặc mọi lớp, có query không lọc theo trường. Trang lớp còn dựng cả những tab chưa mở.
3. **Lặp lại kiểm quyền và gọi Auth.** Cùng một bước kiểm quyền hay gọi Auth chạy nhiều lần trong một lần tải trang.

## Nguyên nhân theo vị trí

| # | Vị trí | Vấn đề | Ảnh hưởng ước lượng |
|---|---|---|---|
| 1 | `lib/actions/parentStudent.ts` `fetchParentDashboardData` | Khoảng 19 lượt `await` nối tiếp. Chỉ bắt đầu sau khi client hydrate. Phần nhận xét phải chờ dashboard tải xong mới tải. | 19 × RTT ≈ 4–6 s |
| 2 | `app/(dashboard)/teacher/classes/[id]/page.tsx` | Radix `TabsContent` chỉ ẩn ở client, server vẫn dựng đủ 7 tab. | Khoảng 14 hàm dữ liệu chạy mỗi lần mở lớp |
| 3 | `lib/auth/actor-context.ts` `requireClassScope` | Mỗi widget kiểm quyền lại, đọc lại `classes` và `class_teacher_assignments`. | Thêm 2 RTT mỗi widget |
| 4 | `lib/supabase/middleware.ts` | Proxy gọi `auth.getUser()` mỗi lần điều hướng, trang RSC lại gọi thêm một lần. | Thêm 1 RTT mỗi trang |
| 5 | `lib/auth/actor-context.ts` `getActorContext` | Query phạm vi giáo viên/học sinh chạy sau batch đầu, dù chỉ cần `user.id`. | Thêm 1 RTT mọi trang teacher/student |
| 6 | `app/(dashboard)/admin/analytics-actions.ts` | Tải `attendance_records`, `enrollments` và bài nộp của mọi thời điểm, không lọc `school_id`, không giới hạn nên bị cắt ở 1.000 dòng. `listUsers` duyệt toàn bộ Auth. Trang chờ mọi widget trong một `Promise.all`. | Trang admin chậm nhất; số liệu sai khi quá 1.000 dòng |
| 7 | `hooks/usePageTracker.ts` | Interval bị đặt lại mỗi lần đổi trang. Cleanup bắn heartbeat ngay. Mỗi heartbeat chạy `requireActor` đầy đủ. | Tải nền tăng theo số học sinh online |
| 8 | `lib/actions/class-students.ts`, `teacher/classes/[id]/actions.ts` | Tải bài nộp, tiến độ và quiz của học sinh ở mọi lớp. Query tuần tự. Lọc O(n·m). | Payload lớn, thêm RTT |
| 9 | `teacher/progress-actions.ts`, `teacher/actions.ts` | Tải mọi bài nộp chỉ để lấy 10 task hoặc tính điểm trung bình. | Payload tăng theo năm học |
| 10 | `components/shared/NotificationBell.tsx`, `hooks/useNotifications.ts` | Gọi `auth.getUser()` phía client. Tải và mở channel thông báo trùng với `useRealtimeSync`. | Thêm 1 lượt Auth, thêm 1 channel |

## Đợt 1 — chỉ sửa code

Đợt 1 không có migration và không đổi quyền. Dữ liệu trả về và ý nghĩa số liệu giữ nguyên.

### Đã xong

- **Kiểm quyền lớp có cache theo request (#3).**
  - Các loader trong `requireClassScope` được bọc React `cache()`. Nhiều widget cùng hỏi một lớp thì chỉ query một lần.
  - Logic cho phép hay từ chối giữ nguyên, có test `tests/unit/class_scope.test.ts`.
- **Tải phạm vi giáo viên/học sinh song song (#5).**
  - Query phạm vi chạy cùng batch đầu khi cookie `lms-role` gợi ý vai trò. Gợi ý này không cấp quyền.
  - Dòng tải về được lọc lại theo trường và ngày hiệu lực. Có test `tests/unit/actor_scope_prefetch.test.ts`.
- **Proxy dùng `getClaims()` (#4).**
  - Chữ ký JWT được xác thực tại chỗ khi project dùng khoá ký bất đối xứng. Proxy chỉ dùng kết quả để định tuyến.
  - Nếu project còn dùng khoá HS256 (legacy JWT secret), auth-js tự gọi `getUser()` như cũ. Muốn có lợi ích này, cần bật JWT Signing Keys trong Supabase Dashboard → Project Settings → JWT Keys.
- **Heartbeat ổn định (#7).**
  - Một interval 30 giây cho cả layout, không bắn heartbeat khi đổi trang.
  - Phần chi phí Auth của mỗi heartbeat chưa xử lý.
- **Chuông thông báo dùng chung store (#10).**
  - Bỏ `auth.getUser()` phía client, bỏ lần tải và channel trùng.
  - `useRealtimeSync` nghe thêm `UPDATE` để trạng thái "đã đọc" đồng bộ giữa các tab.
- **Đếm query.** `LMS_TRACE_DB=1` in mỗi lượt gọi Supabase kèm thời gian (`lib/supabase/trace.ts`).

### Làm ở các session song song

Đã rà diff từng phần. `typecheck`, `lint` (0 lỗi), `npm test` và `npm run test:integration` đều qua.

- **#1, dashboard phụ huynh.**
  - `fetchParentDashboardData` gom thành các đợt `Promise.all`.
  - Trang server tải sẵn dữ liệu của con đầu tiên. Phần nhận xét tải song song. Có chặn phản hồi cũ khi đổi con liên tục.
  - Shape dữ liệu giữ nguyên, có test `tests/unit/parent_dashboard_data.test.ts`.
- **#2 và #8, trang lớp giáo viên.**
  - Chỉ dựng tab đang mở. Đổi tab qua `?tab=`, có `TabPendingHint`.
  - Header chỉ đếm số học sinh.
  - `fetchStudentProgressForClass` còn 2 đợt.
  - `fetchClassExams` không tải JSON đề nữa, chỉ trả `question_count`.
- **#6, dashboard admin.**
  - Mỗi widget có `Suspense` riêng. Khung AI chỉ tải dữ liệu khi bấm.
  - Mọi query lọc theo `school_id` của admin, qua cột trực tiếp hoặc embed `!inner`. Có test `tests/unit/admin_dashboard_scope.test.ts`.
  - Query phân trang đủ dữ liệu, không còn bị cắt ở 1.000 dòng.
- **#8 và #9, dashboard giáo viên và báo cáo điểm lớp.**
  - Đếm bài chưa chấm bằng `count`/`head`.
  - Task chỉ dựng danh sách học sinh thiếu bài cho 10 task đầu.
  - `fetchClassScoreReport` còn 1 đợt và lọc theo lớp bằng inner join.

**Số liệu hiển thị thay đổi (cố ý):**

- **Thẻ số liệu admin:** giờ tính theo trường, trước đây đếm toàn hệ thống.
- **"Đăng nhập hôm nay":** đã bỏ `auth.admin.listUsers`.
  - Giờ đếm người dùng của trường có hoạt động trong DB từ 00:00 giờ VN: phiên học, nộp bài, điểm danh, `audit_events`.
  - Người chỉ đăng nhập mà không làm gì sẽ không được đếm.
- **Cột "lần truy cập" của học sinh:** lấy từ `learning_sessions.last_seen_at` trong 24 giờ, thay cho `last_sign_in_at`.
- **"Bài học đã hoàn thành" trong báo cáo điểm lớp:** chỉ đếm bài đã xuất bản của lớp đó. Trước đây đếm mọi lớp nên có thể vượt 100%; đây là sửa lỗi.

**Sửa khi rà:** hai embed trong `analytics-actions.ts` dùng tên constraint chỉ có trong migration baseline (`fk_classes_teacher_id_users`, `fk_attendance_records_student_id_users`). Phần còn lại của repo dùng `classes_teacher_id_fkey`. Đã đổi sang gợi ý theo cột (`users!teacher_id`, `users!student_id`), chạy được với cả hai tên.

### Đo trước/sau

- **RTT thật từ máy dev tới Supabase (25/11):** 97–131 ms khi kết nối đã mở. Lần đầu mất 1,25 s vì DNS và TLS.
- **Dashboard phụ huynh:** chạy bản cũ (HEAD) và bản mới trên cùng mock.
  - Bản cũ: 17 lượt nối tiếp.
  - Bản mới: 5 lượt nối tiếp, 18 query chạy song song.
  - Với RTT 120 ms: khoảng 2,0 s xuống 0,6 s. Bản cũ còn phải chờ client hydrate rồi mới bắt đầu, nên chênh lệch thực tế lớn hơn.
- **Các phần khác:** đếm theo code.
  - Báo cáo điểm lớp: 3 lượt xuống 1.
  - Thống kê và task giáo viên: 3 lượt xuống 2.
  - Trang lớp: khoảng 14 hàm dữ liệu xuống chỉ hàm của tab đang mở.
  - Admin: widget nhanh hiện ngay, không chờ widget chậm nhất.
- **Chưa đo:** thời gian trên Vercel với dữ liệu thật. Cần đăng nhập thật, xem mục "Cách đo".

## Cách đo

```bash
LMS_TRACE_DB=1 npm run dev
```

Lần lượt mở `/parent`, `/teacher`, `/teacher/classes/<id>`, `/admin` và `/student`. Với mỗi trang, đếm các dòng `[db]` và tổng thời gian. Chỉ in đường dẫn, không in query string.

## Việc chủ dự án cần kiểm

- **Region:** đối chiếu region của Supabase project với region của Vercel Function.
  - Repo không có `vercel.json`, nên Vercel dùng mặc định `iad1` (Mỹ).
  - Nếu Supabase ở `ap-southeast-1` (Singapore), mỗi lượt gọi phải đi qua Thái Bình Dương. Khi đó thêm `vercel.json` với `{"regions":["sin1"]}`.
  - Chỉ làm sau khi đã xác nhận hai region lệch nhau.
- **JWT Signing Keys:** xem mục proxy ở trên.

## Đợt 2 — đề xuất, cần migration mới

- **RPC tổng hợp theo trường:** `get_parent_dashboard`, `get_teacher_dashboard_summary`, `get_admin_dashboard_summary`, theo mẫu `get_student_today` đã có.
  - Tạo migration mới và thêm vào cuối `supabase/migration-order.json`.
  - Có test integration bằng PGlite.
- **Index:** áp các index trong `supabase/proposals/20261104_performance_indexes.sql`, nhưng chỉ sau khi `EXPLAIN (ANALYZE, BUFFERS)` trên dữ liệu thật cho thấy cần.
- **Heartbeat rẻ hơn:** cho heartbeat dùng đường kiểm quyền nhẹ, ví dụ chỉ kiểm `user_id` khớp phiên đang mở, thay vì `requireActor` đầy đủ.

## Lỗi phát hiện ngoài phạm vi

- `sendProgressReminder` trong `app/(dashboard)/teacher/progress-actions.ts` có hai lỗi:
  - Hàm query bảng `parent_student`, trong khi bảng thật là `parent_students`.
  - Hàm ghi vào cột `content` của `notifications`, trong khi cột thật là `message`.
  - Lỗi không được kiểm, nên nhắc nhở chưa bao giờ đến tay cả học sinh lẫn phụ huynh, còn giao diện vẫn báo thành công.
  - **Đã sửa (25/11):** dùng đúng tên bảng và tên cột. Mỗi lần insert đều kiểm lỗi. Lỗi trả về client là thông báo chung, không lộ chi tiết DB.
