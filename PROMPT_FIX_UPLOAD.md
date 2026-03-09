# 🔧 Prompt Fix Lỗi Upload Video & File — LMS Lesson Builder
> Copy từng prompt theo thứ tự vào Antigravity. KHÔNG gộp tất cả vào một lần.

---

## 📌 CÁCH DÙNG TÀI LIỆU NÀY

```
Nguyên tắc vàng khi debug với AI:
1. Luôn cho AI KIỂM TRA trước, đừng để nó sửa mù
2. Mỗi prompt chỉ làm MỘT việc
3. Sau mỗi bước → test thử → rồi mới qua bước tiếp
```

---

## 🔍 PROMPT 1 — Kiểm tra toàn bộ, chưa sửa gì

> 💡 Mục đích: Để AI đọc code và báo cáo lỗi trước. Không cho sửa ở bước này.

```
Đọc README.md trước để hiểu tech stack.

Tôi đang bị lỗi ở chức năng upload video và file PDF 
trong phần tạo bài giảng (Lesson Builder).

Nhiệm vụ của bạn lúc này là CHỈ KIỂM TRA, CHƯA SỬA.

Hãy đọc và kiểm tra các file sau:
1. Toàn bộ code liên quan đến upload video
2. Toàn bộ code liên quan đến upload file PDF/tài liệu
3. File cấu hình Supabase Storage (nếu có)
4. API routes xử lý upload

Sau khi đọc xong, hãy báo cáo cho tôi:
- Tìm thấy lỗi gì? Ở file nào? Dòng số bao nhiêu?
- Nguyên nhân có thể là gì?
- Cần sửa những gì?

Liệt kê rõ ràng, chưa sửa gì cả.
```

---

## 🔍 PROMPT 2 — Kiểm tra cấu hình Supabase Storage

> 💡 Mục đích: 90% lỗi upload là do Supabase Storage chưa cấu hình đúng

```
Kiểm tra cấu hình Supabase Storage cho tôi.
Chưa sửa gì, chỉ kiểm tra và báo cáo.

Tôi cần biết:

1. Bucket đã được tạo chưa?
   - Cần có bucket tên "lesson-videos" cho video
   - Cần có bucket tên "lesson-files" cho PDF, tài liệu
   - Mỗi bucket có public hay private?

2. Storage Policy (RLS) đã đúng chưa?
   - Teacher có quyền upload (INSERT) vào bucket không?
   - Teacher có quyền xóa (DELETE) file của mình không?
   - Student có quyền đọc (SELECT) file không?
   - Có policy nào bị thiếu không?

3. File size limit đã cấu hình chưa?
   - Video thường nặng, cần tăng giới hạn lên ít nhất 500MB
   - PDF thường nhẹ hơn, 50MB là đủ

4. CORS có được cấu hình không?

Đọc code và file cấu hình hiện tại, sau đó báo cáo 
những gì đang thiếu hoặc sai.
```

---

## 🔍 PROMPT 3 — Kiểm tra luồng upload trong code

> 💡 Mục đích: Tìm lỗi trong code xử lý upload phía frontend

```
Kiểm tra luồng code upload trong phần Lesson Builder.
Chưa sửa gì, chỉ báo cáo.

Tìm và đọc file component chứa form upload video và file.
Kiểm tra các điểm sau:

1. Input file:
   - accept attribute có đúng không?
     Video nên là: accept="video/mp4,video/webm,video/mov"
     File nên là: accept=".pdf,.doc,.docx,.ppt,.pptx"
   - Có giới hạn kích thước file ở frontend không?

2. Hàm xử lý upload:
   - Có đang dùng supabase.storage.from('bucket-name').upload() không?
   - Tên file upload có bị trùng không? 
     (cần thêm timestamp hoặc uuid vào tên file)
   - Có đang xử lý loading state không?
   - Có đang bắt lỗi (try/catch) không?
   - Sau khi upload xong có lấy public URL và lưu vào database không?

3. Hiển thị tiến trình:
   - Có progress bar khi upload không?
   - Nếu file lớn mà không có progress bar, user sẽ nghĩ bị treo

Liệt kê từng vấn đề tìm được.
```

---

## 🛠️ PROMPT 4 — Fix Supabase Storage (sau khi đã biết lỗi)

> 💡 Dùng prompt này SAU KHI Prompt 1+2 đã báo cáo lỗi cụ thể

```
Dựa trên kết quả kiểm tra vừa rồi, hãy fix cấu hình 
Supabase Storage cho tôi.

Thực hiện đúng thứ tự sau:

BƯỚC A — Tạo migration file để tạo Storage buckets và policies:

Tạo file: supabase/migrations/[timestamp]_storage_setup.sql

Nội dung migration cần có:
1. Tạo bucket "lesson-videos":
   - Public bucket (ai cũng đọc được)
   - File size limit: 524288000 (500MB)
   - Allowed MIME types: video/mp4, video/webm, video/quicktime

2. Tạo bucket "lesson-files":  
   - Public bucket
   - File size limit: 52428800 (50MB)
   - Allowed MIME types: application/pdf, 
     application/msword, 
     application/vnd.openxmlformats-officedocument.wordprocessingml.document,
     application/vnd.ms-powerpoint,
     application/vnd.openxmlformats-officedocument.presentationml.presentation

3. Tạo Storage Policies:
   - lesson-videos: Teacher được INSERT (upload)
   - lesson-videos: Teacher được DELETE file của mình
   - lesson-videos: Tất cả authenticated users được SELECT (xem)
   - lesson-files: Tương tự như trên

BƯỚC B — Kiểm tra lại sau khi tạo migration
Đọc lại file migration vừa tạo và xác nhận syntax đúng.
```

---

## 🛠️ PROMPT 5 — Fix code upload video

> 💡 Fix phần upload video trong component

```
Fix chức năng upload video trong Lesson Builder.

Tìm file component chứa form tạo/edit video lesson.
Viết lại hàm upload video với đầy đủ các yêu cầu sau:

1. Validate file trước khi upload:
   - Chỉ chấp nhận: MP4, WebM, MOV
   - Kích thước tối đa: 500MB
   - Nếu sai → hiện toast error, không upload

2. Tạo tên file unique:
   const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
   const filePath = `class-${classId}/${fileName}`

3. Upload lên Supabase Storage với progress tracking:
   - Dùng onUploadProgress callback
   - Cập nhật state uploadProgress (0-100)
   - Hiện progress bar trong UI

4. Xử lý kết quả:
   - Nếu thành công → lấy public URL → lưu vào item_contents table
   - Nếu thất bại → hiện toast error với message cụ thể

5. UI trong lúc upload:
   - Button bị disabled
   - Hiện progress bar với phần trăm
   - Text "Đang tải lên... 45%"

6. Sau khi upload xong:
   - Hiện preview video ngay trong form
   - Button đổi thành "Thay đổi video"
   - Hiện toast success "Upload video thành công"

Dùng shadcn/ui Toast cho thông báo.
Xử lý đầy đủ loading, error, success states.
```

---

## 🛠️ PROMPT 6 — Fix code upload file PDF/tài liệu

> 💡 Fix phần upload file trong component

```
Fix chức năng upload file tài liệu (PDF, DOCX, PPTX) 
trong Lesson Builder.

Tìm file component chứa form tạo/edit document lesson.
Viết lại hàm upload file với đầy đủ yêu cầu:

1. Validate file:
   - Chấp nhận: PDF, DOCX, DOC, PPTX, PPT
   - Kích thước tối đa: 50MB
   - Nếu sai → toast error

2. Tên file unique (giữ tên gốc để dễ nhận biết):
   const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
   const filePath = `class-${classId}/${Date.now()}-${safeName}`

3. Upload lên bucket "lesson-files" với progress tracking

4. Sau khi upload:
   - Lưu file_url và tên file gốc vào item_contents
   - Hiện preview: icon file + tên file + dung lượng
   - Nút "Xem trước" mở PDF viewer
   - Nút "Xóa" để upload lại

5. PDF Viewer inline:
   - Dùng thư viện react-pdf để hiện PDF ngay trong trang
   - Không cần tải về mới xem được
   - Có nút zoom in/out và điều hướng trang

Dùng shadcn/ui Toast, Button, Card.
```

---

## 🛠️ PROMPT 7 — Fix hiển thị Video Player

> 💡 Fix riêng phần video player không hiển thị được

```
Fix chức năng hiển thị video player trong trang xem bài giảng.

Tìm component VideoPlayer hoặc nơi render video trong student view.
Viết lại với đầy đủ yêu cầu sau:

1. Dùng thư viện react-player để render video:
   npm install react-player
   
   import ReactPlayer from 'react-player'
   
   <ReactPlayer
     url={videoUrl}
     controls={true}
     width="100%"
     height="auto"
     style={{ aspectRatio: '16/9' }}
     onProgress={handleProgress}
     onEnded={handleVideoEnded}
   />

2. Xử lý các trường hợp URL:
   - URL từ Supabase Storage (dạng https://xxx.supabase.co/storage/...)
   - URL YouTube (dạng https://youtube.com/watch?v=...)
   - URL Vimeo
   ReactPlayer hỗ trợ tất cả các dạng này tự động

3. Fallback khi video không load được:
   - Hiện skeleton loading trong lúc chờ
   - Nếu lỗi → hiện thông báo "Không thể tải video, vui lòng thử lại"
   - Có nút "Thử lại"

4. Track tiến độ xem cho student:
   - Khi video kết thúc (onEnded) → gọi API cập nhật 
     student_progress status = 'completed'
   - Lưu thời điểm dừng lại (onProgress) để xem tiếp từ chỗ cũ

5. UI xung quanh video:
   - Tiêu đề bài học phía trên
   - Thời lượng video
   - Nút "Đánh dấu hoàn thành" thủ công (nếu muốn skip)

Đảm bảo component này hoạt động cho cả:
- Video lưu trên Supabase Storage
- Video nhúng từ YouTube/Vimeo
```

---

## 🛠️ PROMPT 8 — Kiểm tra tổng thể sau khi fix

> 💡 Chạy prompt này cuối cùng để đảm bảo mọi thứ hoạt động

```
Sau khi đã fix xong, hãy kiểm tra tổng thể 
chức năng upload video, file và video player cho tôi.

Tạo checklist và kiểm tra từng mục:

UPLOAD VIDEO:
□ Input chỉ nhận file video
□ File quá 500MB bị từ chối với thông báo rõ ràng
□ Progress bar hiện trong lúc upload
□ Upload thành công → video preview hiện ra
□ URL video được lưu vào database
□ Xử lý lỗi mạng (network error)

VIDEO PLAYER (student xem):
□ Video từ Supabase Storage load được
□ Video YouTube/Vimeo nhúng được
□ Có loading skeleton khi đang tải
□ Có thông báo lỗi nếu video không load
□ Khi xem xong → tự động đánh dấu hoàn thành
□ Xem lại từ chỗ dừng lần trước

UPLOAD FILE:
□ Input chỉ nhận PDF/DOCX/PPTX
□ File quá 50MB bị từ chối
□ Progress bar hiện trong lúc upload  
□ Upload thành công → icon file + tên hiện ra
□ Nút "Xem trước" mở PDF viewer
□ URL file được lưu vào database

SUPABASE STORAGE:
□ Bucket "lesson-videos" tồn tại
□ Bucket "lesson-files" tồn tại
□ Teacher có thể upload
□ Student có thể xem nhưng không upload được
□ File không bị trùng tên

Với mỗi mục, đọc code và xác nhận ✅ hoặc ❌.
Nếu có mục ❌ → fix ngay.
```

---

## 💡 Tips khi làm việc với Antigravity

**⚡ Quan trọng — Vì bạn không thấy lỗi gì:**

Đây là dấu hiệu của "silent failure" — lỗi xảy ra nhưng không được hiển thị ra UI. Dùng prompt đặc biệt này TRƯỚC KHI chạy các prompt fix:

```
Tôi bị lỗi ở chức năng upload video, upload file và video player
nhưng không thấy thông báo lỗi nào cả — chỉ thấy không hoạt động.

Hãy làm 2 việc:

VIỆC 1 — Thêm console.log để tìm lỗi ẩn:
Tìm tất cả các hàm xử lý upload và video player.
Thêm console.log ở từng bước:
- Trước khi upload: console.log('Bắt đầu upload:', file.name, file.size)
- Sau khi gọi Supabase: console.log('Kết quả upload:', data, error)
- Khi lấy URL: console.log('Public URL:', url)
- Khi lưu database: console.log('Lưu DB:', result)
- Video player: console.log('Video URL:', videoUrl)

VIỆC 2 — Bọc tất cả bằng try/catch và hiện lỗi ra UI:
Mọi hàm async liên quan đến upload và video đều phải có:
try {
  // code hiện tại
} catch (error) {
  console.error('Chi tiết lỗi:', error)
  toast.error('Lỗi: ' + error.message) // hiện ra màn hình
}

Sau khi thêm xong, tôi sẽ thử lại và chụp màn hình 
console để bạn xem lỗi cụ thể.
```

Sau khi chạy prompt trên → mở trình duyệt → nhấn F12 → chọn tab Console → thử upload lại → chụp màn hình console gửi cho Antigravity để nó biết lỗi thật sự là gì.

**Nếu AI vẫn không fix được sau Prompt 4-6:**
```
Hãy xóa toàn bộ code upload hiện tại và viết lại 
từ đầu theo đúng yêu cầu trong prompt trước.
Đừng cố gắng sửa code cũ nữa.
```

**Nếu AI báo lỗi "bucket không tồn tại":**
```
Chạy migration file trong Supabase Dashboard trước:
Supabase → SQL Editor → paste nội dung migration → Run
```

**Nếu lỗi CORS khi upload:**
```
Kiểm tra Supabase Dashboard → Storage → Settings
Thêm localhost:3000 vào danh sách allowed origins
```

---

*Dùng tài liệu này kết hợp với README.md và FEATURE_LESSON_BUILDER.md*
