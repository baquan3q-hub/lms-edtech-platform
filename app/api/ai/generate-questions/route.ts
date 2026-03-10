import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

export const maxDuration = 60; // Allow more time for AI processing

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, numQuestions = 5, fileData, fileMimeType } = body;

        if (!prompt && !fileData) {
            return NextResponse.json(
                { error: "Vui lòng cung cấp yêu cầu hoặc tài liệu." },
                { status: 400 }
            );
        }

        const model = getGeminiModel("gemini-2.5-flash"); // Flash is fast and supports doc parsing

        const systemPrompt = `
You are an expert educational assistant specializing in creating multiple-choice questions.
Your task is to generate EXACTLY ${numQuestions} multiple choice questions in Vietnamese based on the user's prompt and/or the provided document.
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

        const parts: any[] = [
            { text: systemPrompt },
            { text: userPrompt },
        ];

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

        // Exponential backoff retry logic for 429 Too Many Requests
        let result;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
            try {
                result = await model.generateContent({
                    contents: [{ role: "user", parts }],
                });
                break; // Success, exit loop
            } catch (err: any) {
                if (err.status === 429 && retries < maxRetries - 1) {
                    retries++;
                    const waitTime = Math.pow(2, retries) * 1000 + (Math.random() * 1000);
                    console.log(`Gemini Rate Limit hit (429). Retrying in ${waitTime}ms (Attempt ${retries}/${maxRetries - 1})...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    throw err; // Re-throw if it's not a 429 or we ran out of retries
                }
            }
        }

        if (!result) {
            throw new Error("Không thể kết nối với AI (vượt quá giới hạn request).");
        }

        const response = await result.response;
        let text = response.text();

        // Basic cleansing in case the model wraps it in markdown
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        let questions;
        try {
            questions = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini output as JSON:", text);
            return NextResponse.json(
                { error: "AI trả về định dạng không hợp lệ. Vui lòng thử lại." },
                { status: 500 }
            );
        }

        if (!Array.isArray(questions)) {
            return NextResponse.json(
                { error: "Kết quả trả về không phải là danh sách câu hỏi." },
                { status: 500 }
            );
        }

        return NextResponse.json({ questions });

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tạo câu hỏi. " + error.message },
            { status: 500 }
        );
    }
}
