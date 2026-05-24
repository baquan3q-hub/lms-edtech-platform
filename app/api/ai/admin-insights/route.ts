import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { getNextApiKey } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type InsightResult = {
    data: string | null;
    error: string | null;
};

function getErrorDetails(error: unknown) {
    if (error instanceof Error) {
        const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
        return { message: error.message, status };
    }

    if (typeof error === "object" && error !== null) {
        const record = error as Record<string, unknown>;
        return {
            message: typeof record.message === "string" ? record.message : "",
            status: typeof record.status === "number" ? record.status : undefined,
        };
    }

    return { message: "", status: undefined };
}

function getAiErrorMessage(error: unknown) {
    const { message, status } = getErrorDetails(error);

    if (status === 429 || message.includes("429") || message.toLowerCase().includes("quota")) {
        return "AI đang vượt hạn mức sử dụng. Vui lòng thử lại sau ít phút.";
    }

    if (status === 503 || message.includes("503") || message.toLowerCase().includes("overloaded")) {
        return "Gemini đang quá tải. Vui lòng thử lại sau ít phút.";
    }

    if (status === 404 || message.includes("404")) {
        return "Model Gemini được cấu hình hiện không khả dụng.";
    }

    return message || "Lỗi không xác định khi gọi Gemini API.";
}

function buildPrompt(attendanceData: unknown, gradesData: unknown, submissionData: unknown) {
    const safeAttendance = Array.isArray(attendanceData) ? attendanceData.slice(-30) : [];
    const safeGrades = Array.isArray(gradesData) ? gradesData : [];
    const safeSubmission = Array.isArray(submissionData) ? submissionData : [];

    return `Bạn là Chuyên gia Tư vấn Quản trị Hệ thống LMS (Edtech platform).
Dưới đây là các dữ liệu thống kê mới nhất về hoạt động của trung tâm giáo dục. Hãy phân tích và viết 1 đoạn văn súc tích (3-5 câu), ngôn ngữ chuyên nghiệp và dễ hiểu.
Bạn cần chỉ ra: điểm tích cực, điểm cần lưu ý, và một lời khuyên hành động cụ thể.

Dữ liệu:
1. Tình trạng nộp bài: ${JSON.stringify(safeSubmission)}
2. Phổ điểm: ${JSON.stringify(safeGrades)}
3. Lịch sử điểm danh (30 ngày gần nhất): ${JSON.stringify(safeAttendance)}

Lưu ý: Nếu dữ liệu nào trống (mảng rỗng []), hãy ghi nhận là "chưa có dữ liệu" cho mục đó và tập trung phân tích các mục còn lại. Trả lời bằng tiếng Việt. Không cần chào hỏi.`;
}

async function generateInsight(prompt: string): Promise<InsightResult> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const apiKey = getNextApiKey();
            if (!apiKey) {
                return {
                    data: null,
                    error: "Chưa cấu hình GEMINI_API_KEY trong biến môi trường (.env.local).",
                };
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();

            if (!text) {
                return { data: null, error: "AI trả về kết quả rỗng. Vui lòng thử lại." };
            }

            return { data: text, error: null };
        } catch (error: unknown) {
            lastError = error;
            const { message, status } = getErrorDetails(error);
            const shouldRetry =
                status === 429 ||
                status === 503 ||
                message.includes("429") ||
                message.includes("503") ||
                message.toLowerCase().includes("quota") ||
                message.toLowerCase().includes("overloaded");

            if (!shouldRetry || attempt === 2) {
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        }
    }

    console.error("[Admin AI Insight Error]", lastError);
    return { data: null, error: getAiErrorMessage(lastError) };
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const prompt = buildPrompt(body?.attendanceData, body?.gradesData, body?.submissionData);
        const result = await generateInsight(prompt);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 502 });
        }

        return NextResponse.json({ data: result.data });
    } catch (error: unknown) {
        console.error("[Admin AI Insight API Error]", error);
        const { message } = getErrorDetails(error);
        return NextResponse.json(
            { error: message || "Không thể tạo phân tích AI." },
            { status: 500 }
        );
    }
}
