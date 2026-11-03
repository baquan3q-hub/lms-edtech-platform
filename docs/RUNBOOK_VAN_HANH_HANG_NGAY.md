# SỔ TAY VẬN HÀNH HÀNG NGÀY (DAILY OPERATIONAL RUNBOOK)
**Dự án:** LMS EdTech Platform — Hệ thống Quản trị Học tập K12  
**Đối tượng áp dụng:** Kỹ sư Vận hành Hệ thống (SRE / DevOps) & Cán bộ Quản trị Giáo vụ Trường THCS  
**Môi trường:** Production Pilot (Trường THCS Nguyễn Du — Khối 6–9)  
**Phiên bản tài liệu:** 1.0 (Ban hành phục vụ Phase 8 Pilot)  

---

## 1. NGUYÊN TẮC VẬN HÀNH BẤT BIẾN
1. **Dữ liệu học tập là tối thượng:** Không thực hiện bất kỳ thao tác xóa cứng (`DELETE`) trực tiếp trên các bảng `homework_submissions`, `exam_submissions`, `attendance_records` và `audit_events`.
2. **AI là thứ yếu:** Nếu mô hình ngôn ngữ lớn hoặc dịch vụ AI gặp sự cố (timeout, 429 quota, lỗi suy luận), lập tức tắt cờ `ai_enabled` của trường. Toàn bộ hoạt động dạy, học, nộp bài và chấm điểm của giáo viên phải tiếp tục 100% bình thường.
3. **Mọi thay đổi nhạy cảm đều có vết:** Khi can thiệp reset mật khẩu hoặc điều chỉnh thông tin lớp học, luôn thực hiện qua giao diện Admin có kiểm soát để hệ thống tự động ghi nhận vào `audit_events`.

---

## 2. LỊCH TRÌNH VẬN HÀNH TIÊU CHUẨN TRONG NGÀY (SOP)

| Khung giờ | Người thực hiện | Nhiệm vụ chính | Hành động kỹ thuật & Lệnh kiểm tra |
|---|---|---|---|
| **07:00 – 07:30** | Kỹ sư SRE | **Morning Health Check** | Chạy script kiểm tra SLA & trạng thái dịch vụ:<br>`node scripts/pilot/daily_pilot_health_monitor.js`<br>Bảo đảm hàng đợi Outbox không bị kẹt `dead_letter`. |
| **08:00 – 11:30** | Giáo vụ trường | **Hỗ trợ Đầu giờ & Điểm danh** | Theo dõi tỷ lệ đăng nhập của học sinh.<br>Xử lý yêu cầu cấp lại mã kích hoạt cho học sinh quên thông tin hoặc đổi thiết bị. |
| **12:00 – 13:00** | Kỹ sư SRE | **Mid-day Review** | Kiểm tra số lượng bài nộp buổi sáng.<br>Đo lường độ trễ p95 phản hồi của hệ thống (Cam kết: ≤ 3.0s). |
| **14:00 – 17:00** | Giáo vụ trường | **Giám sát Bài tập & Chấm điểm** | Đối soát số lượng bài tập về nhà được giáo viên giao.<br>Hỗ trợ giáo viên bộ môn khi có thắc mắc về phân công lớp học hoặc rubric. |
| **17:30 – 18:00** | SRE & Giáo vụ | **Đối soát Cuối ngày** | Chạy kiểm tra toàn vẹn dữ liệu:<br>`node scripts/pilot/dry_run_phase8_pilot.js`<br>Bảo đảm không có bản ghi mồ côi (`unmapped = 0`). |
| **23:00 – 23:30** | Hệ thống tự động | **Nightly Backup Snapshot** | Supabase Point-in-Time Recovery (PITR) hoạt động liên tục.<br>Chạy diễn tập kiểm tra snapshot: `node scripts/tests/dr_rehearsal_simulation.js`. |

---

## 3. QUY TRÌNH XỬ LÝ CÁC SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 3.1. Học sinh quên mật khẩu hoặc bị khóa mã kích hoạt
- **Triệu chứng:** Học sinh nhập sai mã kích hoạt quá 5 lần hoặc quên mật khẩu tạm `abc123`.
- **Cách xử lý chuẩn:**
  1. Đăng nhập trang Quản trị: `/admin/users`.
  2. Tìm kiếm học sinh theo `Mã học sinh` hoặc `Họ và tên`.
  3. Bấm **"Reset tài khoản"**:
     - Hệ thống tự động thu hồi (revoke) toàn bộ session đang đăng nhập của học sinh.
     - Sinh mã kích hoạt ngẫu nhiên mới (6 chữ số) và lưu dạng SHA-256 hash.
     - Ghi nhận sự kiện vào `audit_events`.
  4. Bàn giao mã kích hoạt mới trực tiếp cho Giáo viên chủ nhiệm để chuyển tới Phụ huynh/Học sinh.

### 3.2. Hàng đợi giao dịch Outbox xuất hiện trạng thái `dead_letter`
- **Triệu chứng:** Cảnh báo `dead_letter > 0` trong script `daily_pilot_health_monitor.js`.
- **Cách xử lý:**
  1. Kiểm tra log sự kiện lỗi:
     ```sql
     SELECT id, event_type, aggregate_id, attempts, last_error_code, payload 
     FROM public.outbox_events 
     WHERE status = 'dead_letter' 
     ORDER BY created_at DESC LIMIT 10;
     ```
  2. Xác định nguyên nhân (ví dụ: Nhà cung cấp email từ chối kết nối, webhook ngoài quá tải).
  3. Sau khi hạ tầng hồi phục, chuyển trạng thái về `pending` để worker tự động thử lại:
     ```sql
     UPDATE public.outbox_events 
     SET status = 'pending', attempts = 0, available_at = now() 
     WHERE id = '<event_id>';
     ```

### 3.3. Dịch vụ AI phản hồi chậm hoặc vượt hạn mức (Quota Limit)
- **Triệu chứng:** Giáo viên nhận thông báo `QUOTA_EXCEEDED` hoặc `AI_TIMEOUT`.
- **Hành động ngắt khẩn cấp (Emergency Kill-Switch):**
  - Chạy lệnh SQL hoặc gạt công tắc trên màn hình Cấu hình trường:
    ```sql
    UPDATE public.schools SET ai_enabled = false WHERE code = 'THCS-NDU';
    ```
  - **Hiệu lực tức thì:** Toàn bộ nút gọi AI trên giao diện giáo viên tự động ẩn đi; giáo viên tiếp tục chấm bài và soạn bài thủ công mà không gặp bất kỳ lỗi gián đoạn nào.

---

## 4. ĐƯỜNG DÂY NÓNG HỖ TRỢ VẬN HÀNH (HOTLINE & ESCALATION)
- **Cấp 1 (Hỗ trợ Giáo vụ & Tài khoản):** Bộ phận Giáo vụ trường THCS Nguyễn Du (Trực giờ hành chính).
- **Cấp 2 (Kỹ thuật Nền tảng LMS):** Kỹ sư Trực ban EdTech (Phản hồi ≤ 15 phút qua kênh khẩn cấp).
- **Cấp 3 (Hạ tầng Database & SRE):** Principal Systems Engineer phụ trách dự án.
