"use server";

import { getGeminiModel } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function generateStudentInsight(
    submissionId: string,
    studentName: string,
    examTitle: string,
    score: number,
    totalPoints: number,
    timeTakenSeconds: number,
    examDurationMinutes: number,
    strengths: any[],
    weaknesses: any[]
) {
    try {
        const model = getGeminiModel("gemini-2.5-flash");

        const prompt = `
Bạn là một gia sư AI hỗ trợ giáo viên đánh giá năng lực học sinh.
Phân tích kết quả bài kiểm tra sau và viết phản hồi ngắn gọn (dưới 150 chữ):

Học sinh: ${studentName}
Bài thi: ${examTitle}
Điểm: ${score}/${totalPoints}
Thời gian làm bài: ${Math.round(timeTakenSeconds / 60)} phút / ${examDurationMinutes} phút quy định.

Điểm mạnh: ${strengths.map(s => s.name).join(", ") || "Chưa rõ"}
Điểm yếu cần cải thiện: ${weaknesses.map(w => w.name).join(", ") || "Chưa rõ"}

Yêu cầu định dạng báo cáo như sau (Không dùng Markdown heading h1, h2):
1. **[Nhận xét Thái độ làm bài]**: (dựa vào thời gian làm bài nhanh/chậm so với quy định và điểm số).
2. **[Phân tích Kết quả]**: (Đánh giá tổng quan, khen ngợi điểm mạnh).
3. **[Lời khuyên Hành động]**: (Lời khuyên cụ thể để học sinh khắc phục điểm yếu).
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Save to database
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("exam_submissions")
            .update({ ai_insight: text })
            .eq("id", submissionId);

        if (error) {
            console.error("Lỗi khi lưu AI insight:", error);
            // Even if save fails, return text so user can see it
        }

        return { data: text, error: null };
    } catch (error: any) {
        console.error("Lỗi gọi Gemini:", error);
        return { data: null, error: error.message };
    }
}
