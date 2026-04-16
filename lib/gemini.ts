import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; // Fallback mapping if user hasn't changed env name yet

if (!apiKey) {
    console.warn("Missing Gemini API Key. AI features will not work.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

export const getGeminiModel = (modelName: string = "gemini-2.5-flash") => {
    return genAI.getGenerativeModel({ model: modelName });
};

/**
 * Hàm tiện ích: Gọi Gemini AI kèm Retry thông minh (429/503/404 Auto-Fallback)
 * - Tự động retry khi quá tải (429/503) với exponential backoff
 * - Tự động fallback sang model khác khi model bị 404
 * - Dùng Regex tìm JSON trong response của AI
 * 
 * @param prompt  - Prompt gửi cho AI
 * @param options - Cấu hình: preferredModel, maxRetries, jsonType ('array' | 'object')
 * @returns parsed JSON result hoặc throw Error
 */
export async function callGeminiWithRetry(
    prompt: string | any[],
    options?: {
        preferredModel?: string;
        maxRetries?: number;
        jsonType?: "array" | "object";
    }
) {
    const maxRetries = options?.maxRetries ?? 4;
    const jsonType = options?.jsonType ?? "object";
    
    // Yêu cầu đồng nhất hệ thống: CHỈ dùng 2.5-flash, không tự chuyển model khác
    const modelsToTry = [options?.preferredModel || "gemini-2.5-flash"];
    
    let currentModelIndex = 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const model = getGeminiModel(modelsToTry[currentModelIndex]);
            // Hỗ trợ cả string lẫn array of parts (text + inlineData khi có file đính kèm)
            const result = await model.generateContent(prompt);
            let text = result.response.text();

            // Regex: tìm JSON array hoặc object trong text
            const regex = jsonType === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
            const jsonMatch = text.match(regex);
            if (jsonMatch) {
                text = jsonMatch[0];
            } else {
                text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            }

            const parsed = JSON.parse(text);
            return parsed;
        } catch (err: any) {
            const isOverloaded = err.status === 429 || err.status === 503 || err.message?.includes("429") || err.message?.includes("503") || err.message?.includes("high demand") || err.message?.includes("quota");
            const isNotFound = err.status === 404 || err.message?.includes("404") || err.message?.includes("not found");

            if ((isOverloaded || isNotFound) && attempt < maxRetries - 1) {
                // Đổi model ngay lập tức để tránh đợi vô ích nếu model cũ đã cạn Quota miễn phí
                if (currentModelIndex < modelsToTry.length - 1) {
                    console.log(`Model ${modelsToTry[currentModelIndex]} failed (${isNotFound ? '404' : '429/503 Quota'}). Switching to ${modelsToTry[currentModelIndex + 1]}...`);
                    currentModelIndex++;
                }

                const waitTime = isNotFound ? 500 : 1500;
                console.log(`Gemini Rate Limit hit. Retry ${attempt + 1}/${maxRetries - 1} in ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }

            if (isOverloaded) {
                throw new Error("AI_RATE_LIMIT: AI hiện vượt quá hạn mức sử dụng hoặc đang bị Google chặn giới hạn miễn phí. Vui lòng thử lại sau.");
            }

            // JSON parse error or other
            if (err instanceof SyntaxError) {
                if (attempt < maxRetries - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                throw new Error("AI_PARSE_ERROR: AI trả về dữ liệu không đúng định dạng JSON.");
            }

            throw err;
        }
    }

    throw new Error("AI_MAX_RETRIES: Không thể kết nối với AI sau nhiều lần thử.");
}
