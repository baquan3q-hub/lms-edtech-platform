# Hướng dẫn tái tạo môi trường Database và Seed dữ liệu K12 (Phase 0)

Tài liệu này hướng dẫn cách tái tạo cơ sở dữ liệu trên môi trường tạm (Local / Docker / Staging) phục vụ kiểm thử và phát triển theo kế hoạch nâng cấp LMS K12, **tuyệt đối không can thiệp hoặc ghi đè database production**.

---

## 1. Nguyên tắc an toàn môi trường

1. **Không ghi vào database production:** Biến môi trường `.env.local` trỏ tới remote Supabase chỉ được dùng để kiểm tra cấu trúc (read-only/schema inspection), không chạy `db push` hay `db reset` lên production.
2. **Môi trường tạm độc lập:** Mọi thao tác dựng schema, migration và seed phải thực hiện trên:
   - Supabase CLI local (Docker)
   - PostgreSQL container độc lập (Docker)
   - Hoặc Supabase project staging hoàn toàn tách biệt.
3. **Dữ liệu ẩn danh (Zero PII):** Seed dữ liệu chỉ sử dụng tên, email mẫu định danh (`@thcs-pilot.edu.vn`), không chứa số điện thoại thật hay thông tin cá nhân.

---

## 2. Cấu trúc tài nguyên Database Phase 0

| Tệp tin | Vị trí | Mục đích |
|---|---|---|
| **Baseline M0** | `supabase/migrations/202609240000_schema_baseline.sql` | Khôi phục 63 bảng chuẩn, 2 views, RPCs, RLS và Storage buckets. |
| **Baseline M0 (Alias)** | `supabase/migrations/202609260000_schema_baseline.sql` | Tên theo kế hoạch thực thi 26/09 (đồng bộ nội dung với baseline). |
| **Seed THCS mẫu** | `supabase/seed_thcs_pilot.sql` | Dữ liệu mẫu THCS: 1 trường, 2 năm học, khối 6–9, 2 lớp, 3 môn, 2 GV, 10 HS, 3 PH. |
| **Seed mặc định** | `supabase/seed.sql` | Bản sao tự động của seed THCS phục vụ `supabase db reset`. |
| **Công cụ kiểm tra** | `scripts/db/validate_baseline.js` | Script Node kiểm tra 63 bảng, FKs, RLS, functions và tính hợp lệ của seed. |
| **Integration Test** | `tests/integration/database_baseline.test.ts` | Test Vitest tự động hóa kiểm tra tính toàn vẹn của baseline và seed. |

---

## 3. Cách 1: Tái tạo bằng Supabase CLI (Khuyến nghị)

### Bước 1: Khởi động Supabase local
```bash
# Yêu cầu máy đã cài Docker Desktop
npx supabase start
```

### Bước 2: Reset và nạp toàn bộ baseline + seed
```bash
npx supabase db reset
```
Lệnh trên sẽ:
1. Xóa sạch DB cục bộ.
2. Chạy `202609240000_schema_baseline.sql` (tạo 63 bảng, 2 view, 139 FK, functions, RLS).
3. Chạy các migration bổ sung ngày 24/09 (`202609240001` - `202609240004`).
4. Tự động nạp dữ liệu từ `supabase/seed.sql` (chứa dữ liệu THCS mẫu).

---

## 4. Cách 2: Tái tạo bằng Docker PostgreSQL thuần

Nếu không cài Supabase CLI, có thể chạy bằng một container PostgreSQL 15/16:

```bash
# 1. Chạy Postgres container tạm
docker run --name lms-k12-temp-db -e POSTGRES_PASSWORD=postgres -p 54322:5432 -d postgres:15

# 2. Nạp baseline schema M0
docker exec -i lms-k12-temp-db psql -U postgres -d postgres < supabase/migrations/202609240000_schema_baseline.sql

# 3. Nạp 4 migration bổ sung (tùy chọn)
docker exec -i lms-k12-temp-db psql -U postgres -d postgres < supabase/migrations/202609240001_learning_reliability.sql
docker exec -i lms-k12-temp-db psql -U postgres -d postgres < supabase/migrations/202609240002_activity_ingest.sql
docker exec -i lms-k12-temp-db psql -U postgres -d postgres < supabase/migrations/202609240003_tracking_summary.sql
docker exec -i lms-k12-temp-db psql -U postgres -d postgres < supabase/migrations/202609240004_video_progress.sql

# 4. Nạp seed dữ liệu mẫu THCS
docker exec -i lms-k12-temp-db psql -U postgres -d postgres < supabase/seed_thcs_pilot.sql
```

---

## 5. Kiểm tra và xác thực tính hợp lệ

Sau khi tạo file hoặc dựng DB tạm, chạy các công cụ kiểm tra tự động:

```bash
# 1. Chạy script kiểm tra cấu trúc baseline và seed
node scripts/db/validate_baseline.js

# 2. Chạy integration test tự động
npm run test:integration

# 3. Chạy kiểm tra toàn bộ suite test
npm run test

# 4. Kiểm tra TypeScript build
npm run typecheck
```

---

## 6. Lưu ý về thứ tự sắp xếp timestamp migration

- Supabase CLI thực thi các file SQL trong thư mục `supabase/migrations/` theo thứ tự từ điển (lexicographical order) của tên file.
- Trong repository hiện có 4 file migration bổ sung được đặt tên bắt đầu bằng `202609240001` đến `202609240004`.
- Để baseline chạy TRƯỚC các migration này trên môi trường mới, file baseline được lưu với tiền tố `202609240000_schema_baseline.sql`.
- File alias `202609260000_schema_baseline.sql` được duy trì để đúng với kế hoạch lý thuyết, nhưng khi chạy trên local cần lưu ý thứ tự sắp xếp timestamp.
