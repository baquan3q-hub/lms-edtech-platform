# 📚 Feature Spec: LMS Lesson Builder (Teacher)

> **Dành cho Antigravity Agent:** Đây là spec chi tiết cho chức năng quản lý nội dung bài giảng. Đọc toàn bộ trước khi bắt đầu code. Tham chiếu README.md để biết tech stack tổng thể.

---

## 🎯 Mục tiêu tính năng

Giáo viên có thể tự do tạo cấu trúc bài giảng theo dạng **cây thư mục lồng nhau (nested tree)** — đặt tên tùy ý, sắp xếp thứ tự tùy ý. Trong mỗi mục lá (leaf node), giáo viên chọn một **loại nội dung** để gắn vào.

---

## 🖼️ Tham chiếu UI (từ ảnh mẫu)

### Layout tổng thể
```
┌─────────────────────────────────────────────────────────────┐
│  [NỘI DUNG] [GIỚI THIỆU] [TIẾN TRÌNH] [THẢO LUẬN] ...      │  ← Tab bar trên cùng
├───────────────────┬─────────────────────────────────────────┤
│                   │                                         │
│  SIDEBAR TREE     │   CONTENT AREA                          │
│  (cây thư mục)    │   (hiển thị nội dung bài học)           │
│                   │                                         │
│  ✅ Module 1      │   📄 PDF viewer / 🎥 Video player /     │
│    ✅ Lesson 1    │   📝 Quiz / 💬 Discussion...            │
│      ✅ 1.1 ...   │                                         │
│      🟢 1.2 ...   │                                         │
│    ▶ Lesson 2     │                                         │
│  ▶ Module 2       │                                         │
│                   │                                         │
├───────────────────┴─────────────────────────────────────────┤
│  [← Mục trước]  [breadcrumb hiện tại]  [Tiếp theo →]        │  ← Footer nav
└─────────────────────────────────────────────────────────────┘
```

---

## 🌳 Phần 1: Cây thư mục (Nested Tree Structure)

### Mô tả
- Giáo viên tạo cấu trúc dạng **cây lồng nhau không giới hạn cấp độ**
- Tên mỗi node do giáo viên **tự đặt hoàn toàn tự do**
- Có thể **kéo thả** để sắp xếp lại thứ tự
- Node cha = **Folder** (chứa các node con, không có nội dung)
- Node lá = **Item** (có nội dung gắn vào)

### Ví dụ cấu trúc thực tế (từ ảnh)
```
📁 DANH SÁCH SINH VIÊN, NHÓM SINH VIÊN
📁 ORIENTATION
🎥 ZOOM MEETING 1
📦 MODULE 1: ANIMALS (02/02 - 07/03/2026 - Week 1, Week 2)
  ✅ Video: Module 1 Introduction
  ✅ Vocabulary
  📁 LESSON 1: Animals - Listening & Speaking
    ✅ Video: Lesson 1 Introduction
    ✅ Objectives & Instructions
    📁 1.1. Skills & Lectures: Video watching
      ✅ 1.1. Video watching              ← type: VIDEO
      ✅ 1.1. Exercise 1 - Pre-watching   ← type: QUIZ
      ✅ 1.1. Exercise 2 - While watching ← type: QUIZ
      ✅ 1.1. Exercise 3 - While watching ← type: QUIZ
      ✅ 1.1. Exercise 4 - While watching ← type: QUIZ
    📁 1.2. Skills & Lectures: Listening 1
      ✅ 1.2. Instructions                ← type: DOCUMENT (PDF)
      ✅ 1.2. Listening audio             ← type: AUDIO
      ✅ 1.2. Exercise 1 - Pre-listening  ← type: QUIZ
      ...
  📁 LESSON 2: Animals - Reading & Writing
  ✅ Mini-test 1                          ← type: QUIZ
  🎥 ZOOM MEETING 2
📦 MODULE 2: CUSTOMS AND TRADITIONS ...
📋 INDIVIDUAL ASSIGNMENT (Deadline: 11/04/2026)
📋 FIELD TRIP GUIDELINES (Deadline: 02/05/2026)
```

### Trạng thái của mỗi node (icon bên trái)
| Icon | Ý nghĩa |
|---|---|
| ✅ (xanh lá) | Student đã hoàn thành |
| 🟢 (đang active) | Đang xem / đang làm |
| ⚪ (xám) | Chưa bắt đầu |
| 🔒 | Bị khóa (chưa mở) |

---

## 📦 Phần 2: Các loại nội dung (Content Types)

Khi giáo viên tạo một **Item (node lá)**, họ chọn một trong các loại sau:

### 1. 🎥 VIDEO
- Upload video hoặc nhúng link YouTube / Vimeo
- Có player tùy chỉnh với nút điều khiển
- Hiển thị thời lượng (VD: 0:32 / 3:44)
- Track tiến độ xem (đã xem bao nhiêu %)
- **UI:** Video player full width trong content area

### 2. 📄 DOCUMENT (Tài liệu / PDF)
- Upload file PDF, DOCX, PPTX
- Hiển thị PDF viewer ngay trong trang (không cần tải về)
- Có thanh điều hướng trang (Page 1 of 5), zoom in/out
- Nút tải về tùy giáo viên cho phép hay không
- **UI:** Giống ảnh mẫu số 1 — PDF viewer với toolbar

### 3. 🎧 AUDIO
- Upload file MP3, WAV
- Custom audio player với waveform hoặc progress bar
- Có thể loop, tua, điều chỉnh tốc độ (0.5x, 1x, 1.5x, 2x)

### 4. 📝 QUIZ / BÀI KIỂM TRA
- Câu hỏi trắc nghiệm (multiple choice, single choice)
- Có thể có nhiều câu hỏi trong một bài
- Cấu hình: thời gian làm bài, số lần làm tối đa, điểm tối thiểu để đạt
- Cách tính điểm: Cao nhất / Gần nhất / Trung bình
- Hiển thị **bảng lịch sử kết quả** (như ảnh mẫu số 3):
  ```
  STT | Điểm  | Bắt đầu          | Nộp bài          | Trạng thái
   1  | 10/10 | 12:50 08/02/2026 | 12:51 08/02/2026 | Đạt
   2  | 7.5/10| 12:46 08/02/2026 | 12:50 08/02/2026 | Đạt
  ```
- Nút [LÀM BÀI] hoặc [LÀM LẠI] tùy trạng thái
- AI tự động chấm điểm trắc nghiệm

### 5. 📋 ASSIGNMENT (Bài tập nộp file)
- Student nộp file (PDF, DOCX, ảnh, video)
- Có deadline rõ ràng
- Trạng thái: Chưa nộp / Đã nộp / Đã chấm
- Teacher xem và chấm điểm thủ công hoặc để AI gợi ý

### 6. 💬 DISCUSSION (Thảo luận)
- Khu vực bình luận dạng thread
- Student và Teacher đều có thể đăng bài
- Có thể reply, like bình luận
- **UI:** Section "+ THẢO LUẬN" ở cuối trang (như ảnh mẫu số 3)

### 7. 🔗 ZOOM MEETING (Học trực tuyến)
- Nhúng link Zoom hoặc Google Meet
- Hiển thị ngày giờ, trạng thái (Sắp diễn ra / Đang diễn ra / Đã kết thúc)
- Nút [THAM GIA] khi đến giờ

---

## 🗄️ Database Schema cho tính năng này

```sql
-- Cây thư mục nội dung
course_items (
  id            uuid PRIMARY KEY,
  class_id      uuid REFERENCES classes(id),
  parent_id     uuid REFERENCES course_items(id), -- NULL = root node
  title         text NOT NULL,                    -- Tên tự đặt
  type          text,                             -- 'folder' | 'video' | 'document' | 'audio' | 'quiz' | 'assignment' | 'discussion' | 'zoom'
  order_index   integer NOT NULL,                 -- Thứ tự trong cùng cấp
  is_published  boolean DEFAULT false,
  unlock_after  uuid REFERENCES course_items(id), -- Mở sau khi hoàn thành item nào
  created_at    timestamp DEFAULT now()
)

-- Nội dung chi tiết theo từng type
item_contents (
  id            uuid PRIMARY KEY,
  item_id       uuid REFERENCES course_items(id),
  video_url     text,       -- cho type: video
  file_url      text,       -- cho type: document, audio, assignment
  zoom_link     text,       -- cho type: zoom
  deadline      timestamp,  -- cho type: assignment, quiz
  max_attempts  integer,    -- cho type: quiz
  min_score     numeric,    -- cho type: quiz
  score_method  text        -- 'highest' | 'latest' | 'average'
)

-- Câu hỏi quiz
quiz_questions (
  id            uuid PRIMARY KEY,
  item_id       uuid REFERENCES course_items(id),
  content       text NOT NULL,
  options       jsonb,      -- [{"id": "a", "text": "..."}, ...]
  correct       text,       -- "a" hoặc ["a","c"] cho multiple
  points        numeric DEFAULT 1,
  order_index   integer
)

-- Tiến độ học của student
student_progress (
  id            uuid PRIMARY KEY,
  student_id    uuid REFERENCES users(id),
  item_id       uuid REFERENCES course_items(id),
  status        text,       -- 'not_started' | 'in_progress' | 'completed'
  score         numeric,
  attempts      integer DEFAULT 0,
  last_accessed timestamp,
  completed_at  timestamp
)

-- Lịch sử làm bài quiz
quiz_attempts (
  id            uuid PRIMARY KEY,
  student_id    uuid REFERENCES users(id),
  item_id       uuid REFERENCES course_items(id),
  answers       jsonb,      -- {"question_id": "answer_chosen"}
  score         numeric,
  started_at    timestamp,
  submitted_at  timestamp,
  passed        boolean
)
```

---

## 🎨 Chi tiết UI Components cần build

### A. Sidebar Tree Component
```
Component: <CourseTree />
Props: classId, currentItemId, onSelectItem
Features:
  - Render đệ quy (recursive) cho nested tree
  - Collapse/expand folder khi click vào folder
  - Highlight item đang active
  - Icon trạng thái (✅ / 🔒 / ⚪) bên trái mỗi item
  - Scroll độc lập với content area
```

### B. Content Area
```
Component: <ContentViewer />
Props: item (type + content data)
Render theo type:
  - type === 'video'      → <VideoPlayer />
  - type === 'document'   → <PDFViewer />
  - type === 'audio'      → <AudioPlayer />
  - type === 'quiz'       → <QuizViewer />
  - type === 'assignment' → <AssignmentViewer />
  - type === 'discussion' → <DiscussionBoard />
  - type === 'zoom'       → <ZoomCard />
```

### C. Bottom Navigation
```
Component: <LessonNav />
Features:
  - Nút [← Mục trước] — disabled nếu đang ở item đầu tiên
  - Breadcrumb ở giữa hiển thị item hiện tại
  - Nút [Tiếp theo →] — disabled nếu đang ở item cuối
  - Auto navigate đến item tiếp theo khi hoàn thành
```

### D. Teacher: Course Builder (Edit Mode)
```
Component: <CourseBuilder />
Features:
  - Nút [+ Thêm mục] để thêm folder hoặc item mới
  - Click vào tên để đổi tên inline
  - Drag & drop để sắp xếp lại thứ tự
  - Khi thêm item mới → mở modal chọn content type
  - Toggle publish/unpublish từng item
```

### E. Modal chọn Content Type
```
Component: <ContentTypeModal />
Hiển thị grid 2x4 các loại nội dung:
┌──────────┬──────────┬──────────┬──────────┐
│  🎥      │  📄      │  🎧      │  📝      │
│  Video   │  Tài liệu│  Audio   │  Quiz    │
├──────────┼──────────┼──────────┼──────────┤
│  📋      │  💬      │  🔗      │          │
│Assignment│ Thảo luận│  Zoom    │          │
└──────────┴──────────┴──────────┴──────────┘
```

---

## 📍 Route Structure

```
app/
├── teacher/
│   └── classes/
│       └── [classId]/
│           └── content/
│               ├── page.tsx              ← Course builder (edit mode)
│               └── [itemId]/
│                   └── edit/page.tsx     ← Edit nội dung từng item
│
└── student/
    └── classes/
        └── [classId]/
            └── learn/
                ├── page.tsx              ← Redirect đến item đầu tiên
                └── [itemId]/
                    └── page.tsx          ← Xem nội dung + sidebar tree
```

---

## ⚙️ Hướng dẫn build cho Antigravity Agent

### Thứ tự build tính năng này
```
Bước 1: Database migration — tạo 5 tables ở trên
Bước 2: <CourseTree /> component — render cây từ dữ liệu phẳng (flat → tree)
Bước 3: Teacher Course Builder — CRUD items, drag & drop
Bước 4: Student Content Viewer — render từng content type
Bước 5: Quiz system — câu hỏi, chấm điểm, lưu lịch sử
Bước 6: Progress tracking — cập nhật student_progress realtime
Bước 7: Bottom navigation — prev/next tự động
```

### Lưu ý kỹ thuật quan trọng
1. **Flat → Tree conversion:** Data trong DB lưu dạng phẳng (flat list với parent_id). Khi render phải convert sang dạng cây đệ quy.
2. **Drag & drop:** Dùng thư viện `@dnd-kit/core` — nhẹ và hoạt động tốt với Next.js
3. **PDF Viewer:** Dùng thư viện `react-pdf` — không cần backend
4. **Recursive render:** Component `<TreeNode />` tự gọi lại chính nó cho các node con
5. **Optimistic updates:** Khi kéo thả, cập nhật UI ngay lập tức, sau đó mới sync lên Supabase

### Packages cần cài thêm
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-pdf
npm install react-player
```

---

*Spec này mô tả đầy đủ tính năng Lesson Builder cho hệ thống LMS. Kết hợp với README.md để có đầy đủ context kỹ thuật.*
