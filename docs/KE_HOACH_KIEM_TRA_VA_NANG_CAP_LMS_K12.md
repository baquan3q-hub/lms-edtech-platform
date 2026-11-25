# Kế hoạch kiểm tra và nâng cấp hệ thống LMS K12

> Cập nhật 04/11/2026: phần hiện trạng, phạm vi THCS, nhân sự và mốc tuần dưới đây là bản lịch sử tháng 9. Phạm vi mới là THPT theo [trạng thái 03/11](REBUILD_K12_IMPLEMENTATION.md). Thực hiện theo [kế hoạch kiến trúc và hiệu năng 04/11](RA_SOAT_KIEN_TRUC_VA_HIEU_NANG_2026-11-04.md): đo baseline, đồng bộ code/schema và quyền, tối ưu bốn portal trước khi mở rộng tính năng. Không dùng các số lint/test/working tree cũ làm hiện trạng hôm nay.

## 1. Đầu ra và hiện trạng

Tài liệu này là roadmap kỹ thuật chính thức cho quá trình kiểm tra và nâng cấp hệ thống thành sản phẩm LMS K12. Tài liệu chỉ xác định thứ tự triển khai, điều kiện hoàn thành và phạm vi kỹ thuật; chưa thay đổi chức năng hệ thống.

Chi tiết migration SQL dự kiến, luồng dữ liệu, trách nhiệm của chủ dự án/nhà trường và tiêu chí đo theo từng phase nằm tại [đặc tả thực thi chi tiết](KE_HOACH_THUC_THI_CHI_TIET_LMS_K12.md).

Hiện trạng đã kiểm tra:

- TypeScript đang đạt; production build đã sinh đủ artifact.
- Lint chưa đạt: khoảng 1.805 lỗi và 357 cảnh báo.
- Chưa có test tự động hoặc script `test`.
- Working tree có khoảng 192 file thay đổi và 60 file chưa được theo dõi.
- 86 file sử dụng Supabase admin client, nhưng guard phân quyền mới chỉ xuất hiện trong khoảng 18 file.
- `schema.sql` rỗng; lịch sử migration cũ đang bị xóa; bốn migration mới chỉ mang tính bổ sung.
- Mô hình K12 mới còn thiếu `school_id`, danh mục môn chuẩn và phân quyền đa vai trò; `homerooms` hiện chỉ cho khối 6–12.
- UI đang dùng `courses` như khối học, gây sai nghĩa dữ liệu.
- Import phụ huynh–học sinh đã có nhưng chỉ ghép tài khoản theo email, chưa phù hợp với mã học sinh và chưa có guard admin đầy đủ.
- Một số tài liệu/bài nộp đang dùng Storage URL công khai.
- Phạm vi được chốt: pilot THCS, một trường đầu tiên nhưng schema sẵn sàng đa trường, LMS và đánh giá nội bộ, AI chỉ hỗ trợ giáo viên.

## 2. Roadmap theo thứ tự bắt buộc

### Phase 0 — Chốt baseline và kiểm kê dữ liệu, tuần 1–2

- Phân loại working tree thành các nhóm: dọn tài liệu, bảo mật, tracking, UI K12, migration và file sinh tạm.
- Loại file render, tài liệu cuộc thi còn sót và artifact tạm khỏi Git; tạo checkpoint cho toàn bộ thay đổi cần giữ.
- Kết nối database bằng quyền chỉ đọc để kiểm kê bảng, khóa ngoại, RLS, function, trigger, bucket, số lượng bản ghi và dữ liệu thật.
- Vì trạng thái dữ liệu chưa rõ, mặc định database có dữ liệu cần bảo toàn cho đến khi chứng minh ngược lại.
- Xuất schema chuẩn, phục hồi lịch sử migration trong môi trường tạm và tạo baseline có thể chạy bằng `supabase db reset`.
- Tạo seed cho một trường THCS mẫu, không chứa dữ liệu cá nhân thật.
- Ghi ADR cho mô hình trường, lớp chủ nhiệm, lớp môn học, tài khoản học sinh, đánh giá nội bộ và AI.
- Thêm các lệnh chuẩn: `typecheck`, `lint`, `test`, `test:integration`, `test:e2e`, `build`.

**Điều kiện hoàn thành:** Git có baseline truy vết được; dựng được database mới; backup đã được phục hồi thử; typecheck/build đạt; không còn bảng production chưa rõ nguồn gốc.

### Phase 1 — Bảo mật và độ tin cậy nền tảng, tuần 3–5

- Mở rộng lớp phân quyền thành `ActorContext` chứa người dùng, trường hiện tại, vai trò, phạm vi và thời hạn hiệu lực.
- Dùng role trong database làm nguồn chuẩn; metadata chỉ dùng làm cache và không quyết định quyền.
- Kiểm kê toàn bộ Server Action và API route; mọi thao tác dùng service role phải qua guard trường, vai trò và tài nguyên.
- Không dựa vào `proxy.ts` để bảo vệ dữ liệu; từng API/action phải tự xác thực.
- Chuyển RLS sang deny-by-default và kiểm tra cách ly trường, lớp, môn, học sinh, phụ huynh.
- Chuyển bucket học liệu và bài nộp sang private; cấp signed URL ngắn hạn sau khi kiểm quyền.
- Bổ sung rate limit cho đăng nhập, kích hoạt, reset mật khẩu, upload, import, nộp bài và AI.
- Hoàn thiện lượt làm bài phía server: kiểm tra ghi danh, trạng thái công bố, deadline, thời lượng, số lần làm và tính idempotent.
- Tạo audit log cho thay đổi quyền, điểm, bài nộp, quan hệ giám hộ, import và reset tài khoản.
- Áp dụng lint gate cho file thay đổi; xử lý trước lỗi hook, quyền, dữ liệu và lỗi có thể gây sai hành vi.

**Điều kiện hoàn thành:** không còn action dùng admin client mà thiếu guard; kiểm thử truy cập chéo trường/lớp đều bị chặn; file riêng tư không có public URL; luồng bài kiểm tra không tin dữ liệu định danh hoặc thời gian từ trình duyệt.

### Phase 2 — Mô hình dữ liệu K12 chuẩn, tuần 6–9

- Bổ sung `schools`, `school_memberships`, `role_assignments`, `academic_years`, `terms`, `grade_levels`, `subjects`.
- `grade_levels` hỗ trợ lớp 1–12; pilot chỉ bật lớp 6–9.
- Dùng `homerooms` cho lớp hành chính và `homeroom_enrollments` để giữ lịch sử theo năm học.
- Giữ `classes` làm lớp/nhóm học theo môn; bổ sung `school_id`, `term_id`, `subject_id` và liên kết lớp chủ nhiệm khi phù hợp.
- Giữ `courses` cho chương trình hoặc nội dung dùng lại; ngừng dùng `courses` để biểu diễn khối.
- Mở rộng `class_teacher_assignments` với vai trò giáo viên bộ môn, chủ nhiệm, trợ giảng và thời gian hiệu lực.
- Một người có thể đồng thời có nhiều vai trò; `users.role` chỉ được giữ trong giai đoạn tương thích.
- Bổ sung khóa ngoại, unique constraint theo trường, index truy vấn, trạng thái và khoảng thời gian hiệu lực.
- Migration thực hiện theo mô hình expand → backfill → đối soát → chuyển đọc/ghi → contract; không đổi nghĩa hoặc xóa cột cũ ngay.
- Sinh lại kiểu Supabase từ schema thay vì duy trì thủ công.

**Điều kiện hoàn thành:** một học sinh có một hồ sơ xuyên năm, thuộc lớp chủ nhiệm và nhiều lớp môn; giáo viên chỉ thấy phân công hợp lệ; chuyển kỳ/lớp không sửa đè lịch sử; toàn bộ dữ liệu đều xác định được trường sở hữu.

### Phase 3 — Tài khoản và onboarding bằng Excel, tuần 10–11

- Học sinh đăng nhập bằng `school_code + student_code + password`; Supabase tiếp tục dùng alias nội bộ, không bắt buộc email cá nhân.
- `student_code` duy nhất trong phạm vi trường và không thay đổi khi học sinh chuyển lớp.
- Phụ huynh dùng email khi có; nếu thiếu email, hệ thống cấp mã phụ huynh trong phạm vi trường.
- Nâng import Excel thành quy trình server-side gồm upload → staging → xem trước → sửa lỗi → xác nhận → ghi dữ liệu → xuất báo cáo.
- Một file có thể tạo/cập nhật học sinh, phụ huynh, quan hệ giám hộ, khối, lớp chủ nhiệm và tài khoản.
- Cột chuẩn gồm mã trường, năm học, khối, lớp, mã học sinh, họ tên, ngày sinh tùy chọn, thông tin phụ huynh, quan hệ và trạng thái.
- Import phải idempotent, báo lỗi từng dòng, phát hiện trùng, không ghi âm thầm một phần và lưu người thực hiện.
- Mật khẩu tạm mặc định là `abc123`, kèm mã kích hoạt riêng từng tài khoản, có hạn và chỉ dùng một lần.
- Trước khi đổi mật khẩu, tài khoản chỉ được truy cập màn hình kích hoạt.
- Khi trường reset về `abc123`, hệ thống thu hồi session cũ, sinh mã kích hoạt mới và ghi audit log.

**Điều kiện hoàn thành:** chạy lại cùng file không tạo dữ liệu trùng; admin sửa được dòng lỗi trước commit; tài khoản chưa kích hoạt không đọc được dữ liệu học tập; reset mật khẩu vô hiệu hóa toàn bộ phiên cũ.

### Phase 4 — Trải nghiệm dạy và học cốt lõi, tuần 12–15

- Chuẩn hóa học liệu theo môn, khối, chương/chủ đề; có phiên bản, nháp, công bố và tái sử dụng.
- Hoàn thiện luồng giao bài → học sinh làm/nộp → giáo viên chấm → phản hồi → công bố.
- Homework hỗ trợ văn bản, file, liên kết, trắc nghiệm và rubric.
- Exam hỗ trợ snapshot đề, autosave, thời lượng server-side, nộp lặp an toàn, chấm tự động và chấm thủ công.
- Điểm có trạng thái chưa chấm, nháp, công bố, khóa và điều chỉnh có lý do; chưa xây học bạ pháp lý.
- Thảo luận gắn với lớp/bài học, có quyền xóa/ẩn và lịch sử kiểm duyệt.
- Dashboard học sinh ưu tiên việc cần làm, deadline, bài đang học và phản hồi mới.
- Dashboard giáo viên ưu tiên lớp phụ trách, bài cần chấm, học sinh chưa hoàn thành và hoạt động gần đây.
- Thông báo được tạo từ sự kiện nghiệp vụ và có retry/idempotency.

**Điều kiện hoàn thành:** E2E chứng minh giáo viên công bố bài, học sinh nộp, giáo viên chấm và phụ huynh chỉ xem kết quả đã công bố; refresh, mạng chậm hoặc gửi lặp không làm mất hay nhân đôi bài.

### Phase 5 — Chuyên cần, phụ huynh, báo cáo và can thiệp sớm, tuần 16–18

- Chuẩn hóa lịch học, buổi/tiết học, nghỉ, thay giáo viên và xung đột phòng–giáo viên–lớp.
- Cho phép trường cấu hình cách tính đi học, đi muộn, nghỉ có phép và nghỉ không phép.
- Quan hệ giám hộ có trạng thái chờ xác minh, đã xác minh, thu hồi và khoảng thời gian hiệu lực.
- Phụ huynh chỉ xem dữ liệu của con đã xác minh, thông tin đã công bố và hành động cần phối hợp.
- Báo cáo theo môn, lớp môn, lớp chủ nhiệm, học kỳ và toàn trường; số tổng hợp phải truy ngược được dữ liệu gốc.
- Xây `intervention_cases` với bằng chứng, mức ưu tiên, người phụ trách, hành động, hạn xem lại và kết quả.
- Telemetry chỉ là tín hiệu; không tự kết luận gian lận, hạnh kiểm hoặc năng lực học sinh.

**Điều kiện hoàn thành:** hoàn tất hành trình điểm danh–xin nghỉ–duyệt–báo cáo; giáo viên chủ nhiệm xem tổng hợp nhưng không sửa điểm môn; một trường hợp hỗ trợ có người chịu trách nhiệm và lần đánh giá lại.

### Phase 6 — AI hỗ trợ giáo viên, tuần 19–20

- AI chỉ tạo nháp câu hỏi, phản hồi và gợi ý hỗ trợ; giáo viên phải duyệt trước khi gửi.
- Dùng job queue có trạng thái, retry, quota, timeout và chi phí theo trường.
- Chuẩn hóa structured output bằng schema; lưu model, prompt version, source hash và người duyệt.
- Loại thông tin nhận diện không cần thiết khỏi prompt; cấu hình thời gian lưu.
- Hiển thị bằng chứng, phạm vi môn và trạng thái “chưa đủ dữ liệu”.
- Các luồng học, nộp và chấm cơ bản tiếp tục hoạt động khi AI ngừng phục vụ.

**Điều kiện hoàn thành:** tắt AI không làm hỏng nghiệp vụ; phụ huynh không thấy bản nháp; giáo viên có thể sửa/bác bỏ; hệ thống đo được tỷ lệ chấp nhận, độ trễ, lỗi và chi phí.

### Phase 7 — Hardening và UAT, tuần 21–22

- Đưa full lint về 0 error; không cho phép lỗi mới.
- Bổ sung Vitest cho nghiệp vụ, integration test với Supabase cục bộ và Playwright cho luồng xuyên vai trò.
- Kiểm tra một lớp 50 học sinh nộp bài gần đồng thời và tải dashboard ở quy mô pilot.
- Tối ưu index, phân trang, truy vấn N+1 và các file action/component quá lớn.
- Kiểm tra WCAG 2.2 AA, bàn phím, tương phản, responsive và thiết bị cấu hình thấp.
- PWA chỉ cache static asset; dữ liệu học sinh, API và signed URL không lưu dài hạn.
- Thêm structured log, request ID, health check, cảnh báo lỗi và dashboard vận hành bằng log của nền tảng triển khai/Supabase.
- Diễn tập backup, restore, mất mạng, AI lỗi, Storage lỗi và rollback migration.

**Điều kiện hoàn thành:** typecheck, lint, unit, integration, E2E và build đều đạt; không có lỗi mức blocker/critical; restore đã được thử; checklist bảo mật và UAT được ký xác nhận.

### Phase 8 — Pilot THCS, tuần 23–26

- Chạy thử import dữ liệu đã ẩn danh, sau đó dry-run dữ liệu thật và đối soát với nhà trường.
- Đào tạo giáo vụ, giáo viên bộ môn, chủ nhiệm, học sinh và phụ huynh theo đúng vai trò.
- Go-live theo từng khối/lớp, có kênh hỗ trợ, người chịu trách nhiệm và rollback window.
- Theo dõi tỷ lệ đăng nhập, giao/nộp/chấm bài, lỗi dữ liệu, thời gian xử lý, liên kết phụ huynh và trường hợp hỗ trợ.
- Ghi nhận thời gian giáo viên tiết kiệm, lỗi cản trở công việc và phản hồi của từng vai trò.
- Chỉ mở rộng khi trường xác nhận báo cáo khớp dữ liệu và các luồng cốt lõi hoạt động ổn định.

### Phase 9 — Sau pilot

- Điều chỉnh giao diện cho tiểu học và THPT trên cùng schema lớp 1–12.
- Hoàn thiện onboarding nhiều trường, quản trị tenant và giới hạn tài nguyên.
- Chỉ bổ sung SSO, OneRoster, QTI/LTI hoặc tích hợp SIS khi có đối tác và luồng dữ liệu cụ thể.
- Học phí, học bạ chính thức, tuyển sinh, nhân sự, kế toán và vận tải không thuộc roadmap pilot.

## 3. Interface và kiểu dữ liệu cần chuẩn hóa

- `ActorContext`: `userId`, `schoolId`, `membershipId`, danh sách role/scope và thời hạn.
- `ActionResult<T>`: kết quả thống nhất với `ok`, `data`, mã lỗi, thông báo, lỗi theo trường và `requestId`.
- Auth actions: đăng nhập bằng định danh, kích hoạt lần đầu, đổi mật khẩu bắt buộc và reset tài khoản.
- Import actions: tạo job, phân tích file, xem trước lỗi, commit job, đọc kết quả và xuất báo cáo.
- Các bảng nghiệp vụ phải có `school_id` trực tiếp hoặc quan hệ bắt buộc dẫn tới trường.
- API nhận ID tài nguyên nhưng luôn suy ra người dùng từ session; không nhận `studentId`, role hoặc school scope từ trình duyệt làm căn cứ cấp quyền.
- Service role chỉ tồn tại trong module server-only sau khi authorization hoàn tất.

## 4. Ma trận kiểm thử bắt buộc

- **Phân quyền:** chéo trường, chéo lớp, chéo môn, phụ huynh–con, chủ nhiệm–giáo viên bộ môn, user tự nâng role.
- **Migration:** clone dữ liệu, chạy tiến/lùi theo phương án, đối chiếu số bản ghi, khóa ngoại, điểm, bài nộp và chuyên cần.
- **Import:** file sai cột, dòng trùng, chạy lại, học sinh chuyển lớp, nhiều phụ huynh, phụ huynh dùng chung cho nhiều con và lỗi giữa quá trình.
- **Tài khoản:** mã kích hoạt sai/hết hạn/dùng lại, reset mật khẩu, thu hồi session và giới hạn thử đăng nhập.
- **Học tập:** bài chưa công bố, deadline, autosave, nộp lặp, mất mạng, nhiều lượt làm, bài tự luận chưa chấm và sửa điểm sau công bố.
- **Storage:** upload sai loại/kích thước, truy cập URL hết hạn, người ngoài lớp và file bị thay thế.
- **AI:** timeout, quota, JSON sai schema, dữ liệu thiếu, giáo viên sửa/bác bỏ và AI bị tắt.
- **Khả năng dùng:** mobile, bàn phím, trình đọc màn hình, mạng chậm và một lớp nộp bài đồng thời.

## 5. Giả định và nguyên tắc đã chốt

- Nhóm triển khai gồm 2–4 người; tổng thời gian dự kiến 22–26 tuần.
- Pilot đầu tiên là một trường THCS; mô hình dữ liệu vẫn hỗ trợ lớp 1–12 và sẵn sàng đa trường.
- Sản phẩm là LMS tương tác sau giờ học với bài tập, kiểm tra, phản hồi và phối hợp gia đình.
- Điểm trong pilot phục vụ đánh giá nội bộ, chưa thay học bạ hoặc sổ điểm pháp lý.
- AI là trợ lý có giáo viên duyệt.
- Onboarding thực hiện bằng Excel và có thể tạo, xếp lớp, ghép phụ huynh trong một quy trình.
- Mật khẩu `abc123` chỉ là mật khẩu tạm, bắt buộc đi kèm mã kích hoạt riêng và đổi trước khi truy cập dữ liệu.
- Database được coi là có dữ liệu cần bảo toàn cho đến khi Phase 0 xác nhận ngược lại.
