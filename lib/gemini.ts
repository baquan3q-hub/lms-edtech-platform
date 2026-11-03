import { GoogleGenAI, type Part } from "@google/genai";
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export function getNextApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI chưa được cấu hình.");
    return key;
}
type ModelConfig = { temperature?: number; responseMimeType?: string; maxOutputTokens?: number };
function modelAdapter(modelName: string, config: ModelConfig = {}) {
    return { async generateContent(prompt: string | Part[]) {
        const ai = new GoogleGenAI({ apiKey: getNextApiKey(), httpOptions: { timeout: 30000 } });
        const result = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || modelName,
            contents: typeof prompt === "string" ? prompt : [{ role: "user", parts: prompt }],
            config: { temperature: 0.2, maxOutputTokens: 8192, ...config },
        });
        return { response: { text: () => result.text || "" } };
    } };
}
export const genAI = { getGenerativeModel: ({ model, generationConfig }: { model: string; generationConfig?: ModelConfig }) => modelAdapter(model, generationConfig) };
export const getGeminiModel = (modelName = AI_MODEL) => modelAdapter(modelName);
export const getRotatingGeminiModel = (modelName = AI_MODEL, config?: ModelConfig) => modelAdapter(modelName, { responseMimeType: "application/json", ...config });
export async function callGeminiWithRetry(prompt: string | Part[], options?: {
    preferredModel?: string; maxRetries?: number; jsonType?: "array" | "object"; useRotation?: boolean;
}): Promise<unknown> {
    const max = Math.min(options?.maxRetries ?? 3, 4);
    for (let attempt = 0; attempt < max; attempt++) {
        try {
            const result = await getRotatingGeminiModel(options?.preferredModel || AI_MODEL).generateContent(prompt);
            return JSON.parse(result.response.text().replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
        } catch (error) {
            const status = (error as { status?: number }).status;
            if (attempt === max - 1 || (!(error instanceof SyntaxError) && status !== 429 && status !== 503)) throw new Error("AI tạm thời không khả dụng. Vui lòng thử lại.");
            await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt + Math.random() * 500));
        }
    }
    throw new Error("AI tạm thời không khả dụng.");
}
