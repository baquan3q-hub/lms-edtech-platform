-- Tự động sinh danh sách buổi học (class_sessions) dựa theo cấu hình khung giờ của Admin (class_schedules)
-- Lệnh này tự động rải ngày từ `start_date` tới `end_date`, và chỉ chọn những ngày đúng với `day_of_week`.
-- Dữ liệu sinh ra sẽ bỏ qua các buổi học đã có (tránh trùng lặp) và tự động nối tiếp Số thứ tự buổi.

DO $$ 
BEGIN 
  WITH generated_dates AS (
    SELECT 
      cs.id as schedule_id,
      cs.class_id,
      cs.start_time,
      cs.end_time,
      g.date::date as session_date,
      cs.day_of_week
    FROM class_schedules cs
    -- Tạo chuỗi các ngày (series) chạy từ ngày bắt đầu đến ngày kết thúc khoá học
    CROSS JOIN generate_series(cs.start_date::timestamp, cs.end_date::timestamp, '1 day'::interval) g(date)
    -- Lọc ra ngày đúng với cấu hình thứ (0=Sunday, 1=Monday... tương đương với DOW trong Postgres)
    WHERE EXTRACT(DOW FROM g.date) = cs.day_of_week
  )
  
  INSERT INTO class_sessions (
    id, class_id, schedule_id, session_date, start_time, end_time, 
    session_number, status, teaching_status, 
    created_at, updated_at
  )
  SELECT 
    gen_random_uuid(),
    gd.class_id,
    gd.schedule_id,
    gd.session_date,
    gd.start_time,
    gd.end_time,
    -- Tự động tính số thứ tự buổi (ví dụ: Buổi 1, Buổi 2...) dựa vào ngày học
    COALESCE(
      (SELECT MAX(session_number) FROM class_sessions WHERE class_id = gd.class_id), 
      0
    ) + row_number() OVER (PARTITION BY gd.class_id ORDER BY gd.session_date, gd.start_time) as session_number,
    'scheduled',
    'pending',
    now(),
    now()
  FROM generated_dates gd
  -- Logic chống trùng: Bỏ qua nếu lịch dạy ngày hôm đó & giờ đó của lớp đã tồn tại
  WHERE NOT EXISTS (
      SELECT 1 FROM class_sessions existing 
      WHERE existing.class_id = gd.class_id 
        AND existing.session_date = gd.session_date 
        AND existing.start_time = gd.start_time
  );
END $$;
