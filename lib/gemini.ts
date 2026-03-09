import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; // Fallback mapping if user hasn't changed env name yet

if (!apiKey) {
    console.warn("Missing Gemini API Key. AI features will not work.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

export const getGeminiModel = (modelName: string = "gemini-1.5-flash") => {
    return genAI.getGenerativeModel({ model: modelName });
};
