# Database một trường — kết quả dựng lại ngày 04/11/2026

## Kết quả đã thực hiện

Theo yêu cầu xóa toàn bộ dữ liệu cũ, đã dựng lại ngay trong project Supabase **lms-edtech-platform**, ref `gmufcuzswehacyarsmyq`. Giữ nguyên project URL, anon key và service key; project Smartlifeapp không bị thay đổi. Đã dùng kết nối SQL của Supabase trong chat, không yêu cầu người dùng gửi mật khẩu database hay tự thêm DATABASE_URL.

Trước thao tác có 104 tài khoản Auth, 103 hồ sơ ứng dụng, 2 trường và không có object/bucket Storage. Schema và dữ liệu `public` đã được thay trong một transaction; các tài khoản/phiên đăng nhập cũ được xóa. Các extension và schema cấu hình Auth/Storage được giữ. Không chạy lại lệnh reset: nó sẽ xóa cả bộ dữ liệu mới.

Sau khi dựng rỗng, đã tạo **dữ liệu giả mới**, không phục hồi hồ sơ người thật:

| Thành phần | Kết quả đối soát SQL |
|---|---:|
| Trường `LMS-THPT` | 1 |
| Học sinh | 200 |
| Giáo viên | 15 |
| Quản trị trường | 1 |
| Tổng tài khoản Auth/hồ sơ | 216 / 216 |
| Lớp chủ nhiệm | 4 × 50 học sinh |
| Lớp môn Toán–Văn–Anh | 12 |
| Ghi danh lớp môn | 600 |
| Phân công giáo viên | 15 |
| Lịch học cố định | 24 |
| Bài nộp cũ/tệp cũ | 0 / 0 |

Chọn THPT/khối 12 theo phạm vi gần nhất; năm học 2026–2027, 12A1–12A4. AI tắt ở trường mẫu. Mỗi học sinh học ba môn; 12 giáo viên đứng lớp và ba giáo viên đồng phụ trách. Chưa thêm tài khoản phụ huynh. Không tạo điểm/bài nộp giả. Projection ban đầu báo `insufficient_data`, không biến thiếu lịch sử thành điểm 0.

Tài khoản dùng bí danh `@lms-pilot.test`, mỗi tài khoản có mật khẩu ngẫu nhiên riêng. Chúng dùng để thử nghiệm, không nhận email khôi phục. Không gửi email mời hoặc email mật khẩu.

Thông tin đăng nhập được lưu **riêng trên máy, đã được Git ignore**:

- `.local/TAI_KHOAN_MOI.md`: bảng tài khoản/mật khẩu, tài khoản admin nằm đầu bảng.
- `.local/single-school-accounts.json`: manifest phục vụ provisioning có kiểm soát.
- Học sinh có thể dùng mã `LMS-THPT:HS0001` đến `LMS-THPT:HS0200` hoặc email tương ứng.

Không đưa hai tệp chứa mật khẩu lên GitHub, tài liệu chia sẻ hoặc log triển khai.

## Kiểm chứng

- `npm test`: **146/146** đạt, gồm kiểm thử PostgreSQL thực trong PGlite cho reset, chặn reset khi Storage còn object, khôi phục schema nguyên tử, quy mô lớp và quyền đọc sau dựng lại.
- Auth/PostgREST thật: admin/teacher/student đều đăng nhập thành công; mỗi người đọc được trường. Admin thấy 12 lớp; giáo viên được kiểm tra thấy một lớp phụ trách; học sinh thấy đúng ba lớp môn. Browser bị từ chối đọc bảng bài nộp thô.
- RPC `get_student_today` trên Supabase thật trả ba lớp và không có bài chưa nộp cho học sinh mẫu.
- SQL kiểm tra sau dựng: **0 bảng public tắt RLS**. Các lỗi advisor do RLS tắt, policy dùng user_metadata và view SECURITY DEFINER cũ đã hết trong lần kiểm tra sau dựng. Vẫn có cảnh báo/quyền legacy cần audit tiếp; không coi dựng lại DB là hoàn tất audit toàn ứng dụng.
- `EXPLAIN (ANALYZE, BUFFERS)` trên một lần đọc student feed ban đầu đo execution khoảng 26 ms. Đây là một mẫu SQL, chưa phải p95 dashboard hoặc bằng chứng hệ thống chịu tải 200 người đồng thời.

Các migration đã áp dụng từ chat: `clean_single_school_rebuild_20261104`, `single_school_pilot_200_students_15_teachers`, `clean_install_access_20261104`. Recipe trong repo vẫn giữ migration lịch sử để tái tạo local; không chạy `supabase db push/reset` hàng loạt từ thư mục lịch sử lên project này.

## Website Vercel

Deployment Production mới nhất của GitHub ở commit `975908c`. Endpoint `https://lms-english.vercel.app/api/health` trả **HTTP 503, DEPLOYMENT_PAUSED** khi kiểm tra. Homepage cũ trong metadata GitHub `lms-edtech-platform.vercel.app` trả 404. Deployment URL riêng chuyển tới đăng nhập Vercel do bảo vệ truy cập; điều đó không chứng minh ứng dụng đã hoạt động.

Việc cần làm trên Vercel:

1. Đăng nhập tài khoản chứa project **lms-english**, hoặc kết nối Vercel trong chat để tiếp tục thao tác.
2. Kiểm tra lý do project/deployment bị tạm dừng và mở lại nếu tài khoản cho phép. Nếu có hạn mức sử dụng hoặc chi phí, xử lý đúng thông báo; không tự nâng gói.
3. Kiểm tra ba biến `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` đang trỏ đúng project trên. Vì đã giữ project, chúng không cần đổi nếu cấu hình cũ đúng. Secret key chỉ phía server.
4. Kiểm tra `/api/health`, đăng nhập bằng tài khoản mới, đối soát dashboard quản trị 200 học sinh/15 giáo viên/12 lớp môn và thử luồng học sinh/giáo viên. Chưa kiểm thử UI production khi deployment còn dừng.

Nếu cần đổi biến môi trường, redeploy để áp dụng theo [hướng dẫn Vercel](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables). Không đưa file credentials vào build hoặc biến NEXT_PUBLIC.

## Công cụ tái tạo, chỉ dùng khi có yêu cầu mới

`npm run db:clean:prepare -- <project-ref>` chỉ sinh SQL cục bộ:

- `.local/lms-clean-install.sql`: cài vào DB Supabase rỗng, từ chối nếu đã có bảng public, tài khoản Auth hoặc object Storage.
- `.local/lms-clean-reset.sql`: SQL **phá hủy dữ liệu** cho project đã rà soát, sau đó dựng lại. Có guard khi Storage còn object, extension ở public hoặc trigger ngoài public phụ thuộc function public. Không xóa metadata Storage để thay việc xóa tệp qua Storage API.

`npm run db:pilot:prepare -- <project-ref>` chỉ chuẩn bị manifest và SQL mẫu trên máy; thêm `--create-auth` mới tạo tài khoản Auth. Script so hostname project với cấu hình local, từ chối Auth user ngoài manifest, lưu trạng thái để retry và không in mật khẩu. Không chạy lại sau khi đã đặt mật khẩu mới cho tài khoản.

SQL pilot lấy UUID tài khoản từ Auth qua email, tạo một trường/lớp/môn/ghi danh theo quan hệ thực và chạy trong transaction. Test sử dụng cùng generator. Các seed/backfill THCS lịch sử không được chạy khi dựng rỗng mới.

Khi thay project thật sau này: dựng DB mới → tạo lại tài khoản/cấu hình Auth → kiểm tra → đổi ba biến Supabase ở local/Vercel → redeploy → xác nhận đăng nhập và dữ liệu → mới xóa project cũ nếu có yêu cầu. [Tài liệu Supabase về kết nối PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Bổ sung 25/11/2026: nhập lại trường THCS Nguyễn Du (Pilot)

Project live hiện có hai trường: LMS-THPT và THCS-NDU. Trường THCS-NDU được nhập lại vì đây là bộ tài khoản dùng để tự kiểm thử.

Lệnh: `node scripts/db/import-nguyendu-pilot.mjs <project-ref>`. Mặc định lệnh chỉ đọc và báo xung đột. Thêm `--apply` thì lệnh mới ghi.

- **Nguồn dữ liệu:** `supabase/seed_30_students_pilot.sql` (5 GV, 30 HS, 30 PH, mã HS101–HS130, liên kết phụ huynh, lớp 9A1 với 30 HS, một buổi điểm danh). Admin là thầy Long `thaylongcngd@gmail.com`, lấy từ `docs/backup/live_snapshot_2026-09-26.json`.
- **Bổ sung cho schema mới:** năm học 2026–2027, HK1/HK2, khối 9, môn Tiếng Anh, lớp chủ nhiệm 9A1 và phân công thầy Lê Hoàng Nam (dạy và chủ nhiệm). Không tạo `account_activations`. Projection học tập do worker tính từ outbox.
- **An toàn:**
  - Tài khoản Auth được tạo với đúng UUID trong seed.
  - Mọi bản ghi có id cố định và được upsert, nên chạy lại không tạo trùng.
  - Trước khi ghi, script dừng nếu email, id, mã trường hoặc bản ghi đã thuộc trường khác.
  - Trường LMS-THPT không bị đụng tới.
- **Mật khẩu:** một mật khẩu ngẫu nhiên chung cho cả trường, lưu ở `.local/TAI_KHOAN_NGUYEN_DU.md` (đã gitignore). Không dùng lại mật khẩu demo công khai trong file seed.
- **Kiểm chứng:**
  - `tests/integration/nguyendu_import.test.ts`: import hai lần trên schema fresh install, có kiểm RLS theo vai trò.
  - Trên live, đăng nhập thật được bằng admin, GV, HS và PH.
  - Mỗi vai trò chỉ đọc được dữ liệu của trường mình.
