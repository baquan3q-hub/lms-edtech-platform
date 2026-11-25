# Tái thiết K12 — trạng thái triển khai ngày 03/11/2026

> Cập nhật 04/11: theo yêu cầu mới, database LMS đã được xóa dữ liệu cũ và dựng lại tại cùng project, với một trường mẫu 200 học sinh/15 giáo viên/1 quản trị. Xem [kết quả và bước khôi phục Vercel](DUNG_LAI_DATABASE_MOT_TRUONG_2026-11-04.md). Các ghi nhận “chưa áp dụng migration thật” bên dưới chỉ mô tả phiên ngày 03/11.

Tài liệu này thay thế các kết luận “đã hoàn thành pilot” trong báo cáo phase cũ khi đánh giá lần tái thiết hiện tại. Đích sản phẩm: LMS nhà trường K12; pilot THPT 100–300 học sinh, ưu tiên lớp 12 và Toán–Văn–Anh; web trước, app sau; một người phát triển có AI hỗ trợ.

## Những phần đã triển khai trong mã nguồn

| Phần | Hành vi hiện tại |
|---|---|
| Định danh và phân quyền | Dùng membership của trường đã chọn; không tự cấp trường pilot; không lấy quyền từ email allowlist hoặc user metadata; chặn activation chưa hoàn tất; kiểm tra thời hạn phân công và quan hệ giám hộ. |
| Đăng nhập | Nhận email hoặc `MÃ-TRƯỜNG:MÃ-HỌC-SINH`; từ chối mã trường không tồn tại và mã học sinh mơ hồ; không tự tạo hồ sơ theo metadata. |
| Quản trị tài khoản | Guard theo trường cho quản lý/reset tài khoản; thao tác xóa chuyển thành tạm dừng membership để giữ dữ liệu; nhận diện dùng chung nhiều trường cần quản trị nền tảng xử lý. |
| Học vụ | Module service riêng cho catalog, lớp, ghi danh; kiểm tra người được phân công/ghi danh thuộc trường; ghi danh và kiểm tra sĩ số trong một transaction. |
| Đề và điểm | DTO cho học sinh, không truyền snapshot/đáp án/điểm nháp; hỗ trợ điểm 0 hợp lệ và trạng thái published/locked; báo cáo điểm phụ huynh lọc điểm công bố. |
| Lượt làm/nộp bài | Snapshot đề; mở/khôi phục lượt làm nguyên tử; giờ server; nộp thi lặp không tạo bài thứ hai; nộp homework có idempotency key, snapshot và giới hạn lượt làm. |
| Chấm điểm | RPC kiểm quyền, điểm tối đa, trạng thái khóa và lý do điều chỉnh; cập nhật điểm, audit và outbox cùng transaction. |
| Học liệu | Guard tài nguyên cho biên soạn/xem; giới hạn các trường được sửa; đổi thứ tự trong transaction và từ chối cây có vòng lặp. |
| Tracking legacy | Danh sách lớp theo trường/phân công; summary và timeline giới hạn đường dẫn lớp được phép; gộp thời gian trùng giữa các tab, không dùng session toàn cục làm bằng chứng của một lớp. |
| Mất mạng | Giữ nháp IndexedDB theo trường/người dùng/lượt làm; TTL 7 ngày; khôi phục, lựa chọn khi xung đột; xóa nháp khi đăng xuất/nộp thành công. Nháp không được coi là nộp đúng hạn. |
| Analytics | Sự kiện từ DB trigger; Python consumer có lease, retry, fencing và dead letter; tính lại projection từ dữ liệu nguồn; đối soát định kỳ; chỉ đọc view đã lọc, không được đọc bài làm thô. |
| UX | Trang học sinh “Hôm nay”; trang giáo viên “Hỗ trợ học sinh”; trạng thái tải/rỗng/lỗi; số liệu kèm bằng chứng, phiên bản quy tắc và cảnh báo cập nhật chậm; bỏ giới hạn phóng to của viewport. |
| AI | Không tạo phản hồi thành công giả khi thiếu cấu hình; token lấy từ provider hoặc để unknown; fixture chỉ tồn tại trong tests. |
| Triển khai | Docker web/worker, liveness endpoint, CI, công thức bootstrap local tách biệt lịch sử migration production. |

Việc có mã nguồn và kiểm thử không đồng nghĩa toàn bộ hệ thống cũ đã qua audit hay pilot đã được nghiệm thu.

## Kiến trúc và hợp đồng API

Next.js/React/TypeScript giữ nghiệp vụ tương tác. Service đặt trong `lib/modules`; action và HTTP adapter dùng cùng nghiệp vụ. Python xử lý projection trong tiến trình độc lập. Supabase cung cấp Postgres/Auth/Storage. React Native/Expo thuộc chặng sau, chưa được tạo hoặc phát hành trong lần này.

Mọi API v1 dùng `{ok,data,requestId}` hoặc `{ok:false,error:{code,message},requestId}`, trả `Cache-Control: private, no-store`. Đầu vào có schema và giới hạn byte thực tế. Cookie write yêu cầu Origin hợp lệ. Native dùng Supabase access token qua `Authorization: Bearer ...`; chọn trường/vai trò bằng `X-School-Id`, `X-Lms-Role`. Header chọn ngữ cảnh luôn được đối chiếu membership.

| Method | Endpoint | Khả năng |
|---|---|---|
| GET/PATCH | `/api/v1/session` | Đọc/chọn ngữ cảnh trường và vai trò; PATCH ghi cookie HttpOnly cho web. |
| GET | `/api/v1/student/today` | Việc cần làm và phản hồi đã công bố, không chứa đáp án hoặc điểm nháp. |
| GET | `/api/v1/exams/:examId` | Đề thi qua DTO học sinh. |
| POST | `/api/v1/exams/:examId/attempts` | Mở hoặc khôi phục lượt làm. |
| PATCH | `/api/v1/exams/:examId/draft` | `{attemptId,answers,clientVersion}`; xung đột trả 409. |
| POST | `/api/v1/exams/:examId/submissions` | `{attemptId,answers}`; thời gian và danh tính lấy phía server. |
| PUT | `/api/v1/submissions/:id/grade` | `{kind,newScore,publishNow,reason?,feedback?,rubricGrades?}`; chỉ giáo viên/admin có phạm vi. |
| GET | `/api/v1/classes/:id/analytics?page=0` | 20 học sinh/trang, ưu tiên tín hiệu cần xem xét; chỉ người phụ trách lớp. |
| GET | `/api/health` | Liveness; không xác nhận database hoặc worker đang khỏe. |

API homework, file, học liệu và quản trị cần mở rộng trước khi xây app đầy đủ. Các màn web hiện dùng Server Action cho những khả năng này.

## Database: dựng mới và nâng cấp là hai quy trình riêng

`npm run db:prepare` sinh một Supabase project **local riêng** trong `.local/lms-db-<hash>`, rồi in lệnh khởi động. Cần Docker để chạy Supabase local. Hash thay đổi khi recipe/SQL thay đổi, tránh trộn migration sinh cũ và mới.

Recipe `supabase/migration-order.json`:

- Chỉ dùng một baseline, bỏ các bản alias/tổng hợp theo phase.
- Khởi tạo K12 catalog/rosters trước tracking để tránh `CREATE TABLE IF NOT EXISTS` giữ lại cấu trúc homeroom/phân công cũ không tương thích.
- Công thức fresh-install sửa tham chiếu `homework.status` không tồn tại và thêm `source_data_hash` trước migration lập index của nó. File lịch sử không bị sửa.
- Test PostgreSQL dùng cùng recipe, chỉ thay Auth functions/Storage catalog bằng stub và bỏ hai extension không dùng. Đây là PostgreSQL thực trong WASM, không mô phỏng transaction bằng Map.

**Không chạy recipe dựng mới hoặc `db reset` vào database thật.** Bản nâng cấp gồm bốn migration `202611030001` đến `202611030004`; chỉ áp dụng sau khi đã phục hồi backup sang staging, kiểm tra schema và đối soát.

Đã đọc metadata PostgREST chỉ đọc của cấu hình hiện có: 95 resource schema; chưa có các RPC v1/projection mới. Metadata này không đủ xác nhận RLS, trigger, function body, dữ liệu null hoặc tính toàn vẹn của từng bản ghi. Không có migration hoặc dữ liệu thật nào được ghi trong phiên triển khai này.

Trước khi chạy migration trên staging phải kiểm tra:

1. Schema lõi và tên constraints/foreign keys, nhất là `courses.teacher_id` và các bảng học vụ.
2. Mọi exam/homework/class cần có trường sở hữu đã xác minh. Không gán hàng loạt dữ liệu chưa rõ nguồn về pilot.
3. Lịch sử trường/kỳ/phân công; dữ liệu trùng trước khi thêm unique constraints.
4. Các đường cũ đọc/ghi raw assessment từ browser: ACL mới yêu cầu đi qua service/DTO.
5. Quyền tạo custom role và chạy migration của tài khoản quản trị staging.
6. Đối soát số lượng bài nộp, điểm, tệp và quan hệ giám hộ trước/sau; thử phục hồi backup và nâng cấp lại trên bản sao.

Lệnh kiểm kê metadata tái lập: `node scripts/db/inventory.mjs`. Chỉ GET OpenAPI, không đọc nội dung bản ghi, gọi RPC hay thực thi SQL; kết quả nằm trong `.local/`, không chứa credentials.

## Chạy worker và định nghĩa chỉ số

```sh
uv sync --project workers/analytics
uv run --directory workers/analytics python -m unittest -v
# Cấu hình ANALYTICS_DATABASE_URL bằng một login role riêng trước khi chạy:
uv run --directory workers/analytics python worker.py
```

DB admin tạo login role riêng, cho kế thừa `lms_analytics_worker`, đặt mật khẩu qua công cụ quản trị an toàn. Không cấp role `postgres`/`service_role` hoặc quyền SELECT bảng bài làm. Worker tự từ chối khởi động nếu có quyền đọc `exam_submissions`.

Quyền worker: đọc outbox và view facts, cập nhật trạng thái/lease của outbox, ghi projection. Mỗi job có token claim riêng; ghi projection và xác nhận hoàn tất trong cùng transaction. Replay tính lại dữ liệu thay vì tăng bộ đếm. Lease 60 giây, tối đa 5 lần, backoff 5–300 giây, đối soát định kỳ 120 giây.

| Chỉ số pilot-v1 | Định nghĩa |
|---|---|
| Hoàn thành homework | Bài đã nộp / homework đang công bố trong lớp. |
| Nộp đúng hạn | Bài đã nộp đúng hạn / tổng bài đã nộp; bài không đặt hạn tính là đúng hạn. |
| Điểm trung bình | Chuẩn hóa thang 10; chỉ published/locked; một lượt công bố gần nhất cho mỗi exam; homework dùng tổng điểm snapshot khi có. |
| Vắng không phép | Số attendance record `absent` trong lớp. |
| Tín hiệu hỗ trợ | Vắng không phép ≥3, hoặc điểm trung bình <4 với ít nhất 2 bài công bố. Đây là quy tắc cần giáo viên xem xét, không phải dự đoán ML. |

Không có mẫu → null/chưa đủ dữ liệu. Có bất nhất mẫu số → `review_required`. Báo cáo hiển thị thời điểm tính và quy tắc; quá 5 phút được đánh dấu đang chờ cập nhật. Chưa cam kết đạt độ trễ 5 phút ở tải pilot khi chưa benchmark môi trường thực.

Consumer mới chỉ xử lý sự kiện học tập/chuyên cần/ghi danh. Email, push và các sự kiện legacy khác chưa có consumer giao vận trong lần triển khai này. Không đánh dấu chúng hoàn tất giả.

## Kiểm chứng và giới hạn nghiệm thu

Kết quả chạy tại workspace: **138/138 Vitest** (gồm 15 kiểm thử PostgreSQL), **6/6 Python**, **5/5 Playwright Chromium**; production build và TypeScript đạt với `DISABLE_PWA=1`. ESLint: **0 lỗi, 87 cảnh báo** ở mã legacy. Cấu hình TypeScript production riêng loại cache type của dev server khỏi lần build.

- Vitest: kiểm thử DTO, HTTP, actor resolution, nháp IndexedDB, AI không cấu hình và nghiệp vụ cũ có mock.
- PostgreSQL: dựng recipe và chạy quyền, transaction, rollback khi outbox lỗi, published score, snapshot, idempotency, capacity và cây học liệu.
- Python: công thức chỉ số, thiếu dữ liệu, ngưỡng bằng chứng, phạm vi sự kiện và backoff.
- Playwright: trình duyệt thật cho đăng nhập, mobile, redirect portal, API chưa xác thực và liveness; không gửi thông tin đăng nhập vào tài khoản thật.
- Production build kiểm tra bundling và TypeScript; PWA được tắt khi kiểm chứng build/container, chưa nghiệm thu offline PWA hoặc nâng cấp service worker.

PGlite có một kết nối độc quyền và stub hạ tầng Supabase. **Không dùng kết quả này để tuyên bố đã test 50 học sinh đồng thời, GoTrue/PostgREST/Storage thật hoặc phục hồi dữ liệu thật.** Playwright hiện chưa chứng minh đầy đủ luồng xuyên vai trò trên Supabase staging.

## Công việc còn lại theo thứ tự bắt buộc

1. Phục hồi bản sao dữ liệu lên staging, kiểm tra RLS/trigger thực, rehearsal nâng cấp và sinh kiểu Supabase từ schema staging; chuyển typed client theo từng module.
2. Rà soát toàn bộ action/API legacy còn dùng service role, đặc biệt lịch, điểm danh, liên kết phụ huynh, import, profile và payment; bổ sung scope/audit/rate limit. Việc sửa guard chung không tự bảo vệ những action chưa gọi guard.
3. Hoàn tất private Storage và registry quyền tài nguyên; chuyển các `getPublicUrl` cũ và bản nộp video. Helper signed URL hiện có không có nghĩa mọi tệp đã riêng tư.
4. Hoàn thiện onboarding THPT và seed Auth local; import phải revalidate staging row, có đối soát/rollback và tài khoản kích hoạt dùng một lần.
5. Hoàn thiện workflow hồ sơ hỗ trợ: người phụ trách, ghi nhận phối hợp, hạn xem lại, kết quả. Dashboard mới hiện chỉ hiển thị bằng chứng; các action can thiệp legacy chưa đạt đủ phạm vi/transaction.
6. Chuẩn hóa tiếp teacher/parent/admin dashboards, notification delivery, version học liệu/ngân hàng câu hỏi, rubric và tài liệu sử dụng.
7. Đánh giá dependencies: lần audit trong phiên này vẫn có cảnh báo, gồm Next và SheetJS; nâng React/Next chưa đủ đóng gate dependency. Không dùng `audit fix --force` để che bằng việc đổi major hoặc hạ thư viện.
8. E2E xuyên vai trò trên staging; 50 lượt nộp gần đồng thời; worker restart/lease thực; WCAG và thiết bị thật; đo LCP/INP/CLS; đối soát ít nhất hai tuần trước khi mở 100–300 học sinh.

Không có hạn lưu dữ liệu học vụ tự động. Chính sách telemetry/PII cần chốt với trường trước production. Không xóa bài nộp/điểm/lịch sử để đạt kiểm thử.
