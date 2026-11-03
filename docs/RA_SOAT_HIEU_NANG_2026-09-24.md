# Rà soát hiệu năng hệ thống LMS — 24/09/2026

## Phạm vi và mức độ tin cậy

Rà soát tĩnh mã nguồn Next.js, server actions, các trang dashboard, luồng điểm danh và bản mô tả 63 bảng SQL do chủ dự án cung cấp tại [DB_SCHEMA_SNAPSHOT_2026-09-24.md](./DB_SCHEMA_SNAPSHOT_2026-09-24.md). Chưa đo thời gian trên môi trường chạy thật, chưa có quyền xem `EXPLAIN ANALYZE`, thống kê index, số hàng thực tế hoặc log Supabase. Vì vậy các nguyên nhân dưới đây là **nút thắt được chứng minh bằng cấu trúc mã**, chưa phải số liệu định lượng của production.

## Kết luận

Mã nguồn hiện **chưa tối ưu cho quy mô một trường phổ thông**. Độ trễ đến từ nhiều lượt gọi Supabase nối tiếp, xử lý lặp trên toàn bộ dữ liệu, truy vấn báo cáo tải hàng loạt bản ghi về ứng dụng, và Realtime làm tải lại nhiều query khi giáo viên lưu điểm danh một lớp. Với nhiều lớp, học sinh và lịch sử theo năm, một số báo cáo còn có nguy cơ sai số vì giới hạn số dòng trả về mặc định của PostgREST.

## Các nút thắt đã xác nhận và thay đổi trong đợt này

| Ưu tiên | Đường xử lý | Trước khi sửa | Đã thay đổi |
|---|---|---|---|
| P0 | `saveAttendanceRecords` trong `lib/actions/attendance.ts` | Sau khi upsert, lặp **tuần tự theo từng học sinh** để gửi thông báo, tìm phụ huynh, đọc 10 lượt điểm danh, ghi thành tích/điểm thưởng. Lưu lại cùng trạng thái vẫn ghi thêm điểm và phát sự kiện. | Kiểm tra quyền và dữ liệu trước khi ghi; chỉ upsert trạng thái/ghi chú thay đổi; gom thông báo và điểm cơ bản thành thao tác theo lô; truy vấn streak theo nhóm tối đa 8 học sinh đồng thời; chạy ba phần hậu xử lý độc lập song song. Không ghi thêm điểm cơ bản hoặc gửi thông báo khi trạng thái không đổi. |
| P1 | `getAttendanceOverview`, `getAttendanceTrendData` | Với mỗi buổi/lớp lại lọc toàn bộ `attendance_records`, làm chi phí xử lý tăng theo tích số buổi × số bản ghi. | Gom bản ghi theo session một lượt và cộng dồn theo lớp/giai đoạn; chọn các cột cần dùng; tải số đơn chờ duyệt cùng lúc với danh sách buổi. |
| P1 | `getClassAttendanceSessions` | Lọc toàn bộ records cho mỗi session; đọc thêm `class_sessions` rồi dựng danh sách chưa điểm danh nhưng cuối cùng không trả về. | Gom records một lượt và bỏ truy vấn/kết quả không được sử dụng. |
| P1 | Trang quản trị tổng quan | Chờ 3 phép đếm hoàn thành rồi mới chạy 6 phép tính độc lập; phép đếm người truy cập còn phân trang toàn bộ Supabase Auth users. | Cho các phép tính độc lập chạy cùng đợt; tách chỉ số người truy cập vào React Suspense để phần còn lại của trang không phải chờ phép phân trang này. Giữ nguyên ý nghĩa chỉ số. |
| P2 | Widget phân tích hành vi | Đọc cảnh báo xong mới đọc điểm hành vi, rồi lần lượt đọc thông tin học sinh và lớp; tải cả cột JSON phân tích lớn dù widget không dùng. | Song song hóa hai cặp query độc lập và chọn các cột cần thiết. |
| P1 | `useRealtimeSync` | Mỗi bản ghi điểm danh thay đổi lại invalidates 6 nhóm React Query, có thể gây nhiều lần tải lại khi lưu 30–40 học sinh. | Gom các sự kiện trong cửa sổ 250 ms, mỗi nhóm query chỉ invalidate một lần trong đợt. |
| P2 | Màn hình giáo viên và tổng quan theo ngày | Tải các nguồn độc lập nối tiếp; tra cứu records theo `.find` cho từng học sinh; tra tên lớp của session ngoài lịch bằng từng query. | Tải song song và dùng map/join. |
| P2 | Biểu đồ điểm danh trang quản trị | Lọc mọi record cho từng session. | Đếm records một lần theo session rồi cộng theo ngày. |

## Rủi ro hiệu năng và tính đúng còn tồn tại

1. **Báo cáo dài hạn cần aggregate tại database.** Các action `getAttendanceOverview`, `getAttendanceTrendData`, `getClassAttendanceSessions` và các analytics vẫn tải sessions/records thô về Node.js. Nếu có hơn 1.000 dòng, cấu hình PostgREST phổ biến có thể cắt dữ liệu mà báo cáo không báo lỗi. Cần xác nhận giới hạn thực tế, sau đó chuyển sang SQL RPC/materialized aggregate có filter theo khoảng ngày, lớp, và phân trang cho drill-down. Đây là công việc ưu tiên kế tiếp trước khi đưa báo cáo toàn trường vào vận hành.
2. **Chưa xác minh index.** Bản SQL được cung cấp mô tả bảng/cột nhưng không đủ để xác nhận toàn bộ index đang có trên production. Cần kiểm tra `pg_indexes` và `EXPLAIN (ANALYZE, BUFFERS)` trước khi tạo thêm; ứng viên gồm `attendance_sessions(class_id, session_date)`, `attendance_sessions(session_date)`, unique `attendance_records(session_id, student_id)`, `attendance_records(student_id, marked_at DESC)`, `parent_students(student_id)`, `attendance_points(session_id, student_id, reason)`, `absence_requests(status)`. Index cũng làm chậm ghi nên chỉ thêm khi kế hoạch truy vấn chứng minh cần thiết.
3. **Streak vẫn cần một lượt đọc theo mỗi học sinh mới chuyển sang “có mặt”.** Đã giới hạn 8 truy vấn đồng thời, nhưng tại trường lớn nên tính streak trong một SQL function nhận cả lớp hoặc duy trì thống kê incrementally. Việc thay đổi điểm, thông báo và record hiện chưa nằm trong một transaction; lỗi hậu xử lý được log nhưng vẫn trả thành công vì record điểm danh đã lưu. Cần transaction/outbox để bảo đảm nhất quán và retry.
4. **Chỉ số “Truy cập hôm nay” còn đắt.** Vẫn phân trang toàn bộ Supabase Auth users, nhưng đã được tách khỏi đường hiển thị chính. Về lâu dài nên ghi `last_seen_at`/sự kiện hoạt động cho mọi vai trò và query count riêng trong database. Bảng `user_page_sessions` có tham chiếu trong mã nhưng **không có** trong snapshot SQL đã nhận; chưa dùng nó để thay thế phép đếm hiện tại.
5. **Realtime còn đăng ký rộng.** Subscription cho một số bảng không có filter theo lớp/người dùng; debounce giảm tải refetch nhưng không giảm mọi event truyền về. Cần đánh giá RLS và khả năng chia channel theo phạm vi dữ liệu của vai trò.
6. **Các trang khác vẫn có mẫu truy vấn rộng.** Rà soát bằng tìm kiếm trên `app` và `lib/actions` thấy nhiều `.select("*")`, các báo cáo tải danh sách đầy đủ và các luồng `router.refresh()`/reload. Cần đo từng route để sắp thứ tự, rồi thêm chọn cột, pagination/cursor, cache phù hợp và lazy load theo tab. Không thể khẳng định tất cả đã được tối ưu trong đợt này.
7. **Điểm danh đầu vào hiện vẫn phải tạo/đọc session trước khi tải records.** Đây là phụ thuộc dữ liệu thật nên không thể song song hóa ở client; có thể gom vào một RPC nếu đo được là nút thắt. Middleware cũng gọi `auth.getUser()` ở mỗi navigation, sau đó nhiều server component gọi lại; cần profile trước khi thay đổi semantics xác thực.

## Cách đo và tiêu chí nghiệm thu

- Ghi p50/p95 của điều hướng dashboard, mở điểm danh lớp và lưu lớp 30–40 học sinh trên môi trường staging có dữ liệu tương đương trường thực tế. Đo cả thời gian response server action, số request Supabase, kích thước payload và số lần React Query refetch.
- So sánh các trường hợp: lưu lần đầu, sửa một học sinh, lưu lại không đổi, xem điểm danh tháng/năm/toàn thời gian; kiểm tra điểm thưởng, thông báo, đơn xin nghỉ và số liệu báo cáo sau mỗi trường hợp.
- Dùng Supabase Query Performance/`pg_stat_statements` và `EXPLAIN (ANALYZE, BUFFERS)` cho các query chậm. Kiểm tra số bản ghi thực trả về so với tổng count, đặc biệt với phạm vi trên 1.000 dòng.
- Đích gợi ý sau khi có baseline: p95 mở màn điểm danh dưới 2 giây, p95 lưu 40 học sinh dưới 3 giây, không có ghi điểm/thông báo trùng khi lưu lại. Đây là **mục tiêu**, chưa phải kết quả đo được.

## Kiểm tra mã nguồn

`tsc --noEmit` sau thay đổi chỉ còn ba lỗi module đã tồn tại do các file `types/database.ts` và `stores/notificationStore.ts` đang bị xóa trong working tree hiện tại. ESLint còn nhiều lỗi `any` có sẵn ở các tệp lớn, nên chưa đạt trạng thái lint sạch. Chưa thể chạy kiểm thử tích hợp với database; các thay đổi về điểm thưởng/thông báo cần kiểm thử staging trước khi triển khai.

## Cập nhật sau phản hồi về dashboard giáo viên

- Đã khôi phục hai module bị thiếu; kiểm tra TypeScript hiện chạy thành công.
- Đã tái hiện cảnh báo hydration trên trình duyệt: phần diff hiển thị thuộc tính ngoài mã nguồn `bis_skin_checked="1"` được thêm vào các thẻ `div`. Đây là can thiệp từ tiện ích trình duyệt, không phải giá trị màu `stat.bg`/`stat.color` thay đổi. Đã bỏ script xóa thuộc tính một lần trong root layout vì không xử lý được các phần HTML được stream đến sau. Cần đối chiếu bằng một cửa sổ/profile không chạy tiện ích để xác minh hết cảnh báo; không che cảnh báo trên toàn bộ cây React. [Tài liệu Next.js](https://nextjs.org/docs/messages/react-hydration-error) cũng liệt kê tiện ích thay đổi HTML là một nguyên nhân.
- Dashboard giáo viên đã tách thành các khối Suspense độc lập: thống kê, lịch dạy, thông báo, phản hồi và tiến độ. Lịch dạy có thể hiện trước khi thống kê điểm hoàn thành.
- `fetchTeacherStats` giảm từ 6 đợt truy vấn phụ thuộc/nối tiếp xuống 3 đợt. `fetchTasksStatus` tải enrollments/assignments/exams song song, tra cứu bài nộp bằng Set và nhóm học sinh theo lớp thay cho lặp tìm toàn bộ danh sách.
- `getCurrentUser` dùng React cache trong phạm vi một lần render để layout, page và các khối thông báo/phản hồi dùng chung kết quả xác thực. Không dùng cache toàn cục cho phiên người dùng.
- Kiểm tra trực tiếp trên Chrome: lịch dạy và các khối khác đã hiển thị trong lúc thẻ thống kê còn tải; sau đó các thẻ hiển thị đầy đủ và giữ nguyên số liệu so với trước sửa. Cảnh báo do tiện ích vẫn xuất hiện trong profile hiện tại. `tsc --noEmit --incremental false` và kiểm tra whitespace của diff đều qua. Chưa có bộ số đo p50/p95 trước–sau, nên không khẳng định mức tăng tốc theo phần trăm.
