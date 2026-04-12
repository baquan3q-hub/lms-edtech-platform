"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateAdminInsights(
    attendanceData: any,
    gradesData: any,
    submissionData: any
) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                data: null,
                error: "Chưa cấu hình GEMINI_API_KEY trong biến môi trường (.env.local)."
            };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Giới hạn data để tránh vượt token limit
        const safeAttendance = Array.isArray(attendanceData) ? attendanceData.slice(-30) : [];
        const safeGrades = Array.isArray(gradesData) ? gradesData : [];
        const safeSubmission = Array.isArray(submissionData) ? submissionData : [];

        const prompt = `Bạn là Chuyên gia Tư vấn Quản trị Hệ thống LMS (Edtech platform).
Dưới đây là các dữ liệu thống kê mới nhất về hoạt động của trung tâm giáo dục. Hãy phân tích và viết 1 đoạn văn bản súc tích (3-5 câu), ngôn ngữ chuyên nghiệp và dễ hiểu.
Bạn cần chỉ ra: Điểm tích cực, điểm cần lưu ý, và một lời khuyên hành động cụ thể.

Dữ liệu:
1. Tình trạng nộp bài: ${JSON.stringify(safeSubmission)}
2. Phổ điểm: ${JSON.stringify(safeGrades)}
3. Lịch sử điểm danh (30 ngày gần nhất): ${JSON.stringify(safeAttendance)}

Lưu ý: Nếu dữ liệu nào trống (mảng rỗng []), hãy ghi nhận là "chưa có dữ liệu" cho mục đó và tập trung phân tích các mục còn lại. Trả lời bằng tiếng Việt. Không cần chào hỏi.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
            return { data: null, error: "AI trả về kết quả rỗng. Vui lòng thử lại." };
        }

        return { data: text, error: null };
    } catch (e: any) {
        console.error("[AI Insight Error]", e);
        const message = e?.message || "Lỗi không xác định khi gọi Gemini API.";
        return { data: null, error: message };
    }
}
