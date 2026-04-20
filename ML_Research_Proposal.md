# KIẾN TRÚC MACHINE LEARNING: HIỆN TRẠNG VÀ LỘ TRÌNH ĐỀ XUẤT CHO HỆ THỐNG LMS

Bản mô tả này phân tích các mô hình và thuật toán hiện đang chạy trong nền tảng học tập trực tuyến (LMS), đồng thời vạch ra lô-gic chuyển đổi từ các hệ thống theo luật (Rule-based / Heuristics) sang các công nghệ trí tuệ nhân tạo vĩ mô (AI/Machine Learning). Đây là cơ sở cốt lõi chứng minh tính khả thi của hệ thống và tính thực tiễn của đề tài nghiên cứu.

---

## 1. Hệ thống Khởi thủy: Các mô hình hiện có (Heuristic / Rule-based)
Nhờ kiến trúc Data Pipeline (ống dẫn dữ liệu) hoạt động tốt, hệ thống hiện đã thu thập đầy đủ tham số vi mô (telemetry data) và đang vận hành hiệu quả các mô hình đánh giá theo cơ chế luật nội bộ (Heuristic Approaches):

1. **Hệ thống Phát hiện Hành vi Gian lận (Gaming the System - Anomaly Detection Baseline)**
   - **Cơ chế:** Nền tảng ghi nhận ngay lập tức các sự kiện Client-side (như `Tab Switching` - chuyển đổi tab, `Idle Time` - thời gian treo máy, `Rapid Guesses` - tốc độ đánh lụi câu hỏi trắc nghiệm). 
   - **Mô hình hiện tại:** Tổng hợp các vi phạm trên vào một hệ điểm gọi là `Gaming Score`. Nếu vượt một ngưỡng tĩnh (Threshold) quy định trước, cờ hành vi sẽ được bật lên.

2. **Hệ thống Cảnh báo Sớm (Early Warning System - Weighted Scoring)**
   - **Cơ chế:** Phân loại học sinh cá biệt hoặc có biểu hiện chểnh mảng.
   - **Mô hình hiện tại:** Sử dụng phương trình trọng số tuyến tính kết hợp đa biến từ tần suất làm bài (submission rates), tỷ lệ chuyên cần (attendance) và xu hướng điểm số (score trend). Mô hình xuất ra chỉ số `Risk Score` ( Điểm Rủi Ro) xếp theo dải Xanh/Vàng/Đỏ trên Dashboard giáo viên.

3. **Hệ thống Khuyến nghị Học tập Trị vì (Rule-based Recommender)**
   - **Cơ chế:** Chủ động hiển thị những việc học sinh cần làm trên hàng chờ ưu tiên.
   - **Mô hình hiện tại:** Ưu tiên dựa trên Trạng thái hạn chót (Deadline-driven Priority) kết hợp với Trọng số loại bài (Exam > Homework > Lesson).

---

## 2. Đề xuất Mở rộng bằng Machine Learning (Nâng cấp thông minh)
Hệ thống heuristics hiện tại rất ổn định nhưng gặp rào cản về "tính linh hoạt" đối với các cấu trúc dữ liệu khổng lồ và không định형. Để đạt chuẩn mực EdTech hiện đại, đề tài nghiên cứu đề xuất **đưa ML vào không phải để đánh giá chê trách, mà làm Trợ lý ra Quyết định (Decision Support)** thông qua 3 mô hình mũi nhọn sau:

### 2.1. Knowledge Tracing theo chuẩn BKT (Bayesian Knowledge Tracing)
*Định vị: Linh hồn của Adaptive Learning (Học tập Thích ứng)*
- **Tại sao cần thiết?** Cùng một điểm tổng kết 5.0, hệ thống hiện tại không biết học sinh A kém tư duy logic hay yếu bảng cửu chương.
- **Tiếp cận mô hình:** Sử dụng BKT - một thuật toán chuỗi Markov ẩn (Hidden Markov Model). Thay vì lưu điểm bài tập, mô hình đọc lại **chuỗi Attempts đúng/sai của hệ thống thẻ Topic Tags**.
- **Kết quả:** Hệ thống lập bản đồ được "Xác suất làm chủ (Mastery Probability) của từng Tín chỉ/Kỹ năng". Lúc này, bảng đánh giá không báo cáo là "Thành 5 điểm", mà sẽ ghi "Thành (Đại số: 90% Tốt, Hình Học: 15% Yếu)".

### 2.2. Chuyển Hành vi Bất thường (Heuristic Detection) sang Isolation Forest
*Định vị: Lá chắn thuật toán vĩ mô Unsupervised Learning (Học không giám sát)*
- **Giới hạn hiện tại:** Cấu hình "Cứ chuyển Tab 5 lần là cảnh báo" (Rule-based) rất khắt khe, dễ bắt nhầm các em học sinh có thói quen mở tab Google tra cứu tài liệu học (False Positive).
- **Tiếp cận mô hình:** Sử dụng **Isolation Forest** (hoặc One-class SVM). Đây là thuật toán không cần dán nhãn trước. Nó sẽ theo dõi *đại đa số tiến trình chung của cả một lớp học* để tạo ra một cụm hành vi trung bình. 
- **Kết quả:** Học sinh nào có tọa độ hành vi tách biệt hoàn toàn so với mẫu số chung (Làm bài thi khó chỉ trong 2 phút và điểm 99% - trong khi lịch sử học tập thấp) sẽ bị mô hình bóc tách là một "Outlier". Báo cáo gian lận lúc này sẽ chính xác và tinh vi hơn rất nhiều lần.

### 2.3. Tích hợp Máy học Khuyến nghị (Content Recommender)
*Định vị: Công cụ giữ chân (Retention) cá nhân hóa học sinh*
- **Tiếp cận mô hình:** Thay vì "Gợi ý lịch nộp bài" thông thường, áp dụng **Content-based Filtering** hoặc **Sequence Models**. Thuật toán này sẽ đấu nối trực tiếp với kết quả của pha BKT (Pha 2.1) bên trên.
- **Kết quả:** Khi phát hiện học sinh bị tụt dốc xác suất Mastery ở "Hình Học", hệ thống ngầm tự tìm kiếm trong kho học liệu các Video và Bài tập Hình Học mức độ dễ của tháng trước xuất hiện lên Widget "Đề xuất ôn luyện riêng cho bạn!".

---

## 3. Lộ trình Khả thi Triển khai (Roadmap)
Dữ liệu hiện hành của hệ thống là minh chứng vững chắc cho tính khả thi của hệ thống ML. Lộ trình tích hợp được chia rõ làm 2 chặng:

### 📌 Chặng 1: Short-term (Gắn Móng Dữ Liệu & Hỗ Trợ Ngay - Đã/Đang Hoàn Thành)
Trong pha kiến trúc này, hệ thống sẽ chưa chạy các Model mạng Neuron khổng lồ do dữ liệu chưa đủ dày. Tập trung vào:
1. **Thu thập Telemetry Data toàn diện:** Gắn sensor để lưu trữ từ thời khắc Login, Answer Latency (thời gian làm 1 câu hỏi), cho đến Điểm số, Thói quen hoàn thiện bài tập. 
2. **Vận hành Rule-based Dashboard:** Tiếp tục cung cấp Giao diện Trực quan (Admin/Teacher Dashboards) với các Heuristic Indicators (Risk Score, Gaming Score) để hỗ trợ giáo viên khoanh vùng nhanh các nhóm đối tượng cấp bách phải hỗ trợ.
3. **Data Prep (Dữ liệu hóa):** Các kết quả chẩn đoán chệch nhịp (Rule-based) của chặng 1 sẽ được dùng làm bộ dữ liệu "Dán Nhãn" (Labels) phục vụ huấn luyện mô hình ở chặng 2.

### 📌 Chặng 2: Mid-term (Kỷ Nguyên Trí Tuệ Nhân Tạo & Thích Ứng - Trọng tâm Định Hướng)
Khi kho Dataset của hệ thống đã tích lũy chừng 6 tháng – 1 năm thực thi khóa học:
1. **Kích hoạt BKT (Kiến trúc Theo Dõi):** Chạy Pipeline Knowledge Tracing đồng bộ hóa sau cùng với các bài Quiz của học sinh -> Vẽ Radar Chart mức độ phủ kiến thức thay vì dùng điểm trung bình.
2. **Batch Processing Isolation Forest:** Chạy ngầm mô hình Isolation Forest trên Server nền mỗi đêm (cron job) để phân tích Log hành vi của ngày hôm đó, gom cụm và dán nhãn lại các học sinh nghi vấn gian lận bài giải tinh vi.
3. **Hyper-Personalized Dashboarding:** Nở rộ hệ thống Recommender. Chuyển hoàn toàn giao diện nền học sinh sang hướng "Học Tập Dẫn Dắt" - đưa ngay nội dung tương thích với lỗ hổng kiến thức ra trang chủ, giảm tải cho Giáo viên và tối ưu triệt để trải nghiệm (UX) người học.

***
> **Lời kết cho Hội đồng Nghiên cứu:** Lộ trình trên mang tính kế thừa sâu sắc bởi vì: Chúng ta không vẽ vời AI trên lý thuyết. Nền tảng *hiện đã có Data, đã có Model Rule-based cơ sở chạy realtime*, việc đưa Machine Learning vào đơn giản là cấu trúc lại Data Pipeline để nâng trần (Raise the ceiling) độ chính xác cho hệ thống theo hướng hiện đại nhất, hoàn toàn chứng minh được sự vững chắc của đề tài.
