import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        // 1. Kiểm tra xác thực (Chỉ cho phép Giáo viên/Admin truy cập)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Lấy đầu vào tĩnh từ phía Client
        const body = await req.json();
        const { topic, amount = 5, difficulty = "Medium" } = body;

        if (!topic) {
            return NextResponse.json({ error: "Thiếu nội dung tài liệu (topic/prompt)" }, { status: 400 });
        }

        // 3. Khởi tạo Gemini Model
        const model = getGeminiModel("gemini-1.5-flash");

        // 4. Định nghĩa System Prompt ép kiểu Output JSON
        const systemPrompt = `
Bạn là một trợ lý giáo dục chuyên nghiệp. Nhiệm vụ của bạn là đọc đoạn văn bản/chủ đề sau đây và tạo ra chính xác ${amount} câu hỏi trắc nghiệm (mức độ: ${difficulty}) dựa trên nội dung đó.

YÊU CẦU BẮT BUỘC:
- Trả về ĐÚNG CẤU TRÚC JSON MẢNG sau đây, và CHỈ JSON, tuyệt đối KHÔNG bọc trong markdown tick (ví dụ: \`\`\`json), KHÔNG có bất kỳ văn bản giải thích nào khác bên ngoài mảng:
[
  {
    "content": "Nội dung câu hỏi 1?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correct_answer": "Đáp án đúng (Phải khớp chính xác 100% với 1 phần tử trong mảng options)"
  }
]

Đoạn văn bản / Chủ đề đầu vào:
"""
${topic}
"""
`;

        // 5. Gọi AI và chờ kết quả
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        // Xử lý chuỗi JSON: Loại bỏ markdown block nếu Gemini vẫn cố ý bọc
        let jsonString = responseText.trim();
        if (jsonString.startsWith("```json")) {
            jsonString = jsonString.slice(7, -3).trim();
        } else if (jsonString.startsWith("```")) {
            jsonString = jsonString.slice(3, -3).trim();
        }

        const quizData = JSON.parse(jsonString);

        return NextResponse.json({ success: true, data: quizData });
    } catch (error: any) {
        console.error("Lỗi khi gọi Gemini API:", error);
        return NextResponse.json({ success: false, error: "AI lỗi khi tạo câu hỏi. Yêu cầu quá phức tạp hoặc dịch vụ đang bận.", details: error.message }, { status: 500 });
    }
}
