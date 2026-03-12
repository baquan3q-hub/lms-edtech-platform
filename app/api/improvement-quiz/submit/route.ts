import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// API: Nộp kết quả mini quiz cải thiện
// POST /api/improvement-quiz/submit
// Body: { analysisId, answers: { "q1": "b", "q2": "a", ... }, taskIndex }
// ============================================================
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { analysisId, answers, taskIndex = 0 } = body;

        if (!analysisId || !answers) {
            return NextResponse.json({ error: "Thiếu analysisId hoặc answers" }, { status: 400 });
        }

        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const adminSupabase = createAdminClient();

        // Lấy analysis để tính điểm
        const { data: analysis, error: analysisError } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("*")
            .eq("id", analysisId)
            .single();

        if (analysisError || !analysis) {
            return NextResponse.json({ error: "Không tìm thấy phân tích" }, { status: 404 });
        }

        // Lấy task tương ứng
        const tasks = analysis.improvement_tasks || [];
        const task = tasks[taskIndex];
        if (!task) {
            return NextResponse.json({ error: "Không tìm thấy bài tập" }, { status: 404 });
        }

        // Tính điểm
        const miniQuiz = task.mini_quiz || [];
        let correctCount = 0;
        const total = miniQuiz.length;

        miniQuiz.forEach((q: any) => {
            if (answers[q.id] === q.correct) {
                correctCount++;
            }
        });

        const percentage = total > 0 ? (correctCount / total) * 100 : 0;

        // Lưu kết quả
        const { data: result, error: insertError } = await adminSupabase
            .from("improvement_quiz_results")
            .upsert({
                analysis_id: analysisId,
                student_id: user.id,
                answers,
                score: correctCount,
                total,
                percentage,
            }, { onConflict: "analysis_id,student_id" })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // Update improvement_progress nếu có
        await adminSupabase
            .from("improvement_progress")
            .update({
                status: percentage >= 80 ? "completed" : "in_progress",
                quiz_score: correctCount,
                quiz_total: total,
                quiz_answers: answers,
                completed_at: percentage >= 80 ? new Date().toISOString() : null,
            })
            .eq("analysis_id", analysisId)
            .eq("student_id", user.id)
            .eq("task_index", taskIndex);

        return NextResponse.json({
            data: {
                score: correctCount,
                total,
                percentage: Math.round(percentage),
                passed: percentage >= 80,
            },
            error: null,
        });
    } catch (error: any) {
        console.error("Error submitting improvement quiz:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
