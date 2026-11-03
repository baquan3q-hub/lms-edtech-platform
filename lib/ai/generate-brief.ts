import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AI_MODEL, getNextApiKey } from "@/lib/gemini";
import { briefInstruction, briefSchema, missingBrief, type LearningBrief } from "./brief";
export async function generateBrief(facts: unknown, fallback: LearningBrief = missingBrief) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const ai = new GoogleGenAI({ apiKey: getNextApiKey(), httpOptions: { timeout: 20000 } });
            const result = await ai.models.generateContent({ model: AI_MODEL,
                contents: JSON.stringify({ facts }),
                config: { systemInstruction: briefInstruction, responseMimeType: "application/json",
                    responseJsonSchema: { type: "object", properties: { summary: { type: "string" }, evidence: { type: "string" }, next_action: { type: "string" } }, required: ["summary", "evidence", "next_action"], additionalProperties: false },
                    temperature: 0.1, maxOutputTokens: 2048 },
            });
            const parsed = briefSchema.parse(JSON.parse(result.text || ""));
            if (/gian lận|lười|kém thông minh|chắc chắn không học/iu.test(JSON.stringify(parsed))) continue;
            return { brief: parsed, status: "ready" as const };
        } catch { /* One repair attempt before a factual fallback. */ }
    }
    return { brief: briefSchema.parse(fallback), status: "unavailable" as const };
}
