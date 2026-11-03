# Chỉ mục tài liệu LMS K12

Thư mục này chỉ giữ tài liệu phục vụ định hướng **LMS cho nhà trường K12** và việc phát triển codebase hiện tại. Tài liệu của mô hình trung tâm tiếng Anh, học phí/thanh toán, hồ sơ cuộc thi và các bản tổng quan trùng lặp đã được xóa ngày 26/09/2026.

## Cập nhật 03/11/2026

Ưu tiên [trạng thái tái thiết K12](REBUILD_K12_IMPLEMENTATION.md): pilot chuyển sang THPT/lớp 12, TypeScript + Python, web trước app. Các báo cáo phase cũ không phải bằng chứng lần tái thiết này đã hoàn thành.

## Thứ tự ưu tiên khi lấy context

1. `XAC_NHAN_THAY_DOI_DINH_HUONG_SAN_PHAM_LMS_K12.docx` — quyết định và phạm vi sản phẩm hiện hành.
2. `KE_HOACH_KIEM_TRA_VA_NANG_CAP_LMS_K12.md` và `KE_HOACH_THUC_THI_CHI_TIET_LMS_K12.md` — thứ tự phase, migration dự kiến, luồng dữ liệu và tiêu chí nghiệm thu.
3. `RA_SOAT_BOI_CANH_VA_DINH_HUONG_LMS_PHO_THONG.md` — khoảng cách giữa codebase hiện tại và đích LMS K12.
4. `DB_SCHEMA.md`, `DB_SCHEMA_SNAPSHOT_2026-09-24.md` và các migration trong `supabase/migrations/` — dữ liệu và thay đổi schema.
5. `ARCHITECTURE.md`, `SYSTEM_RULES.md`, `SECURITY_CHECKLIST.md`, `TEST_PLAN.md`, `DEPLOYMENT.md` — quy tắc kỹ thuật và vận hành.
6. Các tệp `FEATURE_*.md`, `GUIDE_*.md`, `FIX_*.md` và `STUDENT_EARLY_INTERVENTION_FLOW.md` — đặc tả chi tiết theo chức năng.

## Quy tắc sử dụng

- Yêu cầu K12 mới hơn được ưu tiên hơn mô tả lịch sử trong tài liệu rà soát.
- Source code và migration hiện tại được ưu tiên khi tài liệu kỹ thuật mâu thuẫn với triển khai.
- Tài liệu trong `Skill/` là nguồn nghiên cứu hoặc định hướng dài hạn, không phải bằng chứng tính năng đã hoàn thành.
- Không xem tính năng thanh toán/học phí là phạm vi MVP K12 nếu chưa có quyết định mới của chủ sản phẩm.
