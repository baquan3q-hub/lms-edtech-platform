import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; // Fallback mapping if user hasn't changed env name yet

if (!apiKey) {
    console.warn("Missing Gemini API Key. AI features will not work.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

export const getGeminiModel = (modelName: string = "gemini-2.5-flash") => {
    return genAI.getGenerativeModel({ model: modelName });
};

// ============================================================
// KEY ROTATION SYSTEM — Xoay vòng 5 API keys để tránh rate limit
// Gemini Free Tier: 15 RPM/key → 5 keys = 75 RPM tổng
// ============================================================

const ALL_API_KEYS: string[] = [];

function loadApiKeys() {
    if (ALL_API_KEYS.length > 0) return;
    
    // Thu thập tất cả keys từ env
    const keyNames = [
        'GEMINI_API_KEY',
        'GEMINI_API_KEY_1',
        'GEMINI_API_KEY_2',
        'GEMINI_API_KEY_3',
        'GEMINI_API_KEY_4',
        'GEMINI_API_KEY_5',
    ];
    
    const seen = new Set<string>();
    for (const name of keyNames) {
        const key = process.env[name];
        if (key && !seen.has(key)) {
            seen.add(key);
            ALL_API_KEYS.push(key);
        }
    }
    
    if (ALL_API_KEYS.length === 0 && apiKey) {
        ALL_API_KEYS.push(apiKey);
    }
    
    console.log(`[Gemini] Loaded ${ALL_API_KEYS.length} unique API keys for rotation.`);
}

let rotationIndex = 0;

/**
 * Lấy API key tiếp theo trong vòng xoay
 * Round-robin: key1 → key2 → key3 → key4 → key5 → key1 → ...
 */
export function getNextApiKey(): string {
    loadApiKeys();
    if (ALL_API_KEYS.length === 0) return apiKey || "";
    const key = ALL_API_KEYS[rotationIndex % ALL_API_KEYS.length];
    rotationIndex++;
    return key;
}

/**
 * Tạo Gemini model với key rotation — dùng cho batch processing
 * Mỗi lần gọi sẽ dùng key khác nhau → phân tải rate limit
 */
export function getRotatingGeminiModel(
    modelName: string = "gemini-2.5-flash",
    config?: { temperature?: number; responseMimeType?: string }
) {
    const key = getNextApiKey();
    const ai = new GoogleGenerativeAI(key);
    return ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: config?.temperature ?? 0.3,
            responseMimeType: config?.responseMimeType || "application/json",
        },
    });
}

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
        useRotation?: boolean;
    }
) {
    const maxRetries = options?.maxRetries ?? 4;
    const jsonType = options?.jsonType ?? "object";
    const useRotation = options?.useRotation ?? false;
    
    // Yêu cầu đồng nhất hệ thống: CHỈ dùng 2.5-flash, không tự chuyển model khác
    const modelsToTry = [options?.preferredModel || "gemini-2.5-flash"];
    
    let currentModelIndex = 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const model = useRotation
                ? getRotatingGeminiModel(modelsToTry[currentModelIndex])
                : getGeminiModel(modelsToTry[currentModelIndex]);
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
