import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeStudentBehavior } from "@/lib/actions/behavior-analysis";

// POST /api/ai/behavior-analysis — Trigger AI phân tích hành vi sau khi hoàn thành bài
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { classId, contextType, contextId } = body;

        if (!classId || !contextType || !contextId) {
            return NextResponse.json(
                { error: "Missing required fields: classId, contextType, contextId" },
                { status: 400 }
            );
        }

        // Validate contextType (theo yêu cầu mới, chỉ phân tích cho exam)
        if (!["quiz", "exam", "homework"].includes(contextType)) {
            return NextResponse.json(
                { error: "Invalid contextType. Must be: quiz, exam, homework" },
                { status: 400 }
            );
        }

        // CHỈ chạy phân tích AI cho bài kiểm tra (exam)
        if (contextType !== "exam") {
            return NextResponse.json({
                success: true,
                message: "Behavior analysis skipped (only runs for exams)",
            });
        }

        // Chạy phân tích (non-blocking: không cần chờ kết quả để trả response)
        const result = await analyzeStudentBehavior(
            user.id,
            classId,
            contextType,
            contextId
        );

        return NextResponse.json({
            success: result.success,
            gaming_score: result.result?.gaming_score,
            risk_level: result.result?.risk_level,
        });
    } catch (error: any) {
        console.error("Behavior analysis API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
