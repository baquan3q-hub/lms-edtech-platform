import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithRetry } from "@/lib/gemini";

export const maxDuration = 60; // Allow more time for AI processing

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, difficulty = "Trung bình", numQuestions = 5, fileData, fileMimeType } = body;

        if (!prompt && !fileData) {
            return NextResponse.json(
                { error: "Vui lòng cung cấp yêu cầu hoặc tài liệu." },
                { status: 400 }
            );
        }

        const systemPrompt = `
You are an expert educational assistant specializing in creating multiple-choice questions.
Your task is to generate EXACTLY ${numQuestions} multiple choice questions in Vietnamese based on the user's prompt and/or the provided document.
The desired difficulty level for these questions is: "${difficulty}". 
- If Dễ: Focus on remembering and basic facts.
- If Trung bình: Focus on understanding and applying concepts.
- If Khó: Focus on analyzing and evaluating information.
- If Cực khó: Focus on creating, synthesizing, and highly complex scenarios.
- If Từ dễ đến khó: Generate a mix, starting with easy questions and progressively increasing to hard ones.
Output ONLY a valid JSON array of objects representing the questions. Do not include markdown blocks like \`\`\`json.
Each object must have the following structure:
{
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0 // The 0-based index of the correct option (0, 1, 2, or 3)
}
Ensure there are exactly 4 options for each question.
Ensure the content is accurate and educational.
If a document is provided, prioritize generating questions from its content.
If user provides additional instructions, strictly follow them.
        `;

        const userPrompt = prompt ? `User Instructions: ${prompt}` : "Please generate questions based entirely on the provided document.";

        const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const parts: any[] = [{ text: combinedPrompt }];

        if (fileData && fileMimeType) {
            // Remove data URI prefix if present
            const base64Data = fileData.replace(/^data:(.*;base64,)?/, "");
            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: fileMimeType,
                },
            });
        }

        // Gọi AI bằng Helper dùng chung (tự động Retry khi 429/503 và xử lý lỗi đồng nhất)
        // Nếu có file đính kèm, truyền parts array (text + inlineData), ngược lại truyền text thuần
        const promptPayload: string | any[] = (fileData && fileMimeType)
            ? [
                { text: combinedPrompt },
                {
                    inlineData: {
                        data: fileData.replace(/^data:(.*;base64,)?/, ""),
                        mimeType: fileMimeType,
                    },
                },
            ]
            : combinedPrompt;

        let questions: any;
        try {
            questions = await callGeminiWithRetry(promptPayload, {
                preferredModel: "gemini-2.5-flash",
                maxRetries: 5,
                jsonType: "array" // Ép hàm parse tìm mảng JSON
            });
        } catch (error: any) {
            console.error("Lỗi khi callGeminiWithRetry (Tạo bài kiểm tra):", error);
            
            if (error.message.includes("AI_RATE_LIMIT")) {
                return NextResponse.json(
                    { error: "AI hiện đang bị quá tải hoặc vượt hạn mức do lượng dùng cao. Vui lòng chờ 1-2 phút rồi thử lại." },
                    { status: 503 }
                );
            }
            if (error.message.includes("AI_PARSE_ERROR")) {
                return NextResponse.json(
                    { error: "AI trả về định dạng trả lời không hợp lệ. Vui lòng thử yêu cầu lại." },
                    { status: 500 }
                );
            }
            
            throw error;
        }

        if (!Array.isArray(questions)) {
            // Nếu AI trả về object đơn thay vì mảng, đóng gói nó lại
            if (typeof questions === "object" && questions !== null && questions.question) {
                questions = [questions];
            } else {
                return NextResponse.json(
                    { error: "Kết quả trả về không phải là danh sách câu hỏi hợp lệ." },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ questions });

    } catch (error: any) {
        console.error("AI Generation Core Error:", error);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi hệ thống khi tạo câu hỏi. " + error.message },
            { status: 500 }
        );
    }
}
