import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRotatingGeminiModel } from "@/lib/gemini";

// ============================================================
// PROMPT cho HS GIỎI (≥80%): CHỈ nhận xét + nhắc nhở, KHÔNG tạo quiz
// Token rất nhẹ (~300 output tokens)
// ============================================================
function buildHighPerformerPrompt(
    studentName: string, examTitle: string, score: number, totalPoints: number,
    percentage: string, wrongQuestions: any[]
): string {
    const limitedWrong = wrongQuestions.slice(0, 3).map(wq => ({
        câu: wq.questionIndex,
        hỏi: (wq.question || "").substring(0, 60),
        đúng: wq.correctAnswer,
    }));

    return `Gia sư giáo dục. ${studentName} đạt ${score}/${totalPoints} (${percentage}%) bài "${examTitle}".
${wrongQuestions.length > 0 ? `Câu sai: ${JSON.stringify(limitedWrong)}` : "Hoàn hảo, không sai câu nào!"}

Trả về JSON:
{
  "knowledge_gaps": [${wrongQuestions.length > 0 ? '"tên kiến thức từ câu sai"' : ""}],
  "ai_feedback": "Khen ngợi cụ thể 3-4 câu, nhắc nhẹ kiến thức cần ôn nếu có câu sai, kết bằng lời động viên phát triển.",
  "advancement_suggestion": "2-3 chủ đề nâng cao nên tìm hiểu tiếp để phát triển hơn."
}

YÊU CẦU: knowledge_gaps dựa vào câu sai (mảng rỗng nếu không sai). ai_feedback phải thân thiện, khen ngợi trước. Tiếng Việt.`;
}

// ============================================================
// PROMPT cho HS CẦN CẢI THIỆN (<80%): Nhận xét + bài tập + quiz
// Token trung bình (~1200 output tokens)
// ============================================================
function buildImprovementPrompt(
    studentName: string, examTitle: string, score: number, totalPoints: number,
    percentage: string, wrongQuestions: any[]
): string {
    const limitedWrong = wrongQuestions.slice(0, 5).map(wq => ({
        câu: wq.questionIndex,
        hỏi: (wq.question || "").substring(0, 80),
        hs_chọn: wq.studentAnswer,
        đúng: wq.correctAnswer,
    }));

    return `Gia sư giáo dục kiên nhẫn. ${studentName} đạt ${score}/${totalPoints} (${percentage}%) bài "${examTitle}".
Câu sai (${wrongQuestions.length}): ${JSON.stringify(limitedWrong)}

Trả về JSON:
{
  "knowledge_gaps": ["kiến thức hổng rút từ câu sai 1","kiến thức hổng 2"],
  "ai_feedback": "Động viên trước. Khen điểm tốt. KHÔNG dùng 'yếu/kém'. Dùng 'cần luyện thêm'. 3-4 câu. Kết bằng động viên.",
  "improvement_tasks": [
    {
      "title": "Tên kiến thức cần ôn",
      "type": "review",
      "knowledge_topic": "Tên chính xác",
      "estimated_time": "15 phút",
      "theory": {
        "explanation": "Giải thích dễ hiểu 2-3 câu",
        "formula": "Công thức/quy tắc nếu có",
        "examples": ["VD1 kèm giải thích","VD2"],
        "tip": "Mẹo ghi nhớ"
      },
      "mini_quiz": [
        {"id":"q1","question":"Câu hỏi liên quan câu sai","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}],"correct":"b","explanation":"Giải thích đáp án"},
        {"id":"q2","question":"Câu 2","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}],"correct":"c","explanation":"..."},
        {"id":"q3","question":"Câu 3","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}],"correct":"a","explanation":"..."}
      ]
    }
  ]
}

YÊU CẦU BẮT BUỘC:
- knowledge_gaps DỰA VÀO CÂU SAI, KHÔNG ĐỂ TRỐNG
- Tạo 1-2 tasks tùy số kiến thức hổng, mỗi task ĐÚNG 3 câu quiz trắc nghiệm
- Mỗi câu quiz PHẢI có 4 options (a,b,c,d), 1 correct, 1 explanation
- Câu quiz PHẢI liên quan trực tiếp đến kiến thức câu sai
- Tiếng Việt`;
}

// ============================================================
// Validate: đảm bảo mỗi task có đúng 3 câu quiz hợp lệ
// ============================================================
function validateAndFixQuizCount(aiResult: any, targetCount: number = 3): any {
    if (!aiResult?.improvement_tasks) return aiResult;

    aiResult.improvement_tasks = aiResult.improvement_tasks.map((task: any) => {
        const quiz = task.mini_quiz || [];
        while (quiz.length < targetCount) {
            quiz.push({
                id: `q${quiz.length + 1}`,
                question: `Câu bổ sung ${quiz.length + 1} về ${task.knowledge_topic || task.title}`,
                options: [
                    { id: "a", text: "Đáp án A" }, { id: "b", text: "Đáp án B" },
                    { id: "c", text: "Đáp án C" }, { id: "d", text: "Đáp án D" },
                ],
                correct: "a",
                explanation: "Giáo viên sẽ cập nhật đáp án.",
            });
        }
        task.mini_quiz = quiz.slice(0, targetCount);
        return task;
    });
    return aiResult;
}

function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// Phân tích 1 học sinh — tự động chọn prompt theo % điểm
// ≥80%: Chỉ nhận xét + nhắc nhở (KHÔNG quiz)
// <80%: Nhận xét + bài tập + quiz trắc nghiệm
// ============================================================
async function analyzeOneStudent(adminSupabase: any, submission: any, exam: any) {
    const questions = (exam.questions || []) as any[];
    const studentAnswers = (submission.answers || []) as any[];
    const studentObj = Array.isArray(submission.student) ? submission.student[0] : submission.student;
    const studentName = studentObj?.full_name || "Học sinh";

    // Xác định câu sai
    const wrongQuestions = questions
        .map((q: any, qIdx: number) => {
            if (q.type === "ESSAY") return null;
            const correctOption = (q.options || []).find((o: any) => o.isCorrect);
            const studentAnswer = studentAnswers[qIdx];
            if (studentAnswer?.selectedOptionId === correctOption?.id) return null;
            const selectedOption = (q.options || []).find((o: any) => o.id === studentAnswer?.selectedOptionId);
            return {
                questionIndex: qIdx + 1,
                question: q.question,
                studentAnswer: selectedOption?.text || "Không trả lời",
                correctAnswer: correctOption?.text || "N/A",
                tags: q.tags || []
            };
        })
        .filter(Boolean);

    const score = Number(submission.score) || 0;
    const totalPoints = exam.total_points || 10;
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const percentageStr = percentage.toFixed(0);
    const isHighPerformer = percentage >= 80;

    // Chọn prompt theo mức điểm
    const prompt = isHighPerformer
        ? buildHighPerformerPrompt(studentName, exam.title, score, totalPoints, percentageStr, wrongQuestions)
        : buildImprovementPrompt(studentName, exam.title, score, totalPoints, percentageStr, wrongQuestions);

    console.log(`[AI] ${studentName}: ${score}/${totalPoints} (${percentageStr}%) → ${isHighPerformer ? 'NHẸ (chỉ nhận xét)' : 'ĐẦY ĐỦ (nhận xét + quiz)'}`);

    // Key rotation — mỗi HS dùng key khác
    const model = getRotatingGeminiModel("gemini-2.5-flash", {
        temperature: 0.2,
        responseMimeType: "application/json"
    });

    let aiResult: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            let text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) text = jsonMatch[0];
            aiResult = JSON.parse(text);

            // Validate quiz cho HS cần cải thiện
            if (!isHighPerformer) {
                aiResult = validateAndFixQuizCount(aiResult, 3);
            }
            break;
        } catch (err: any) {
            const isOverloaded = err.status === 429 || err.status === 503 ||
                err.message?.includes("429") || err.message?.includes("503") ||
                err.message?.includes("quota") || err.message?.includes("RESOURCE_EXHAUSTED");

            if (isOverloaded && attempt < 2) {
                // Exponential backoff: 4s, 10s — đủ dài để tránh rate limit
                const waitTime = Math.pow(2, attempt + 1) * 2000 + Math.random() * 2000;
                console.log(`[AI] ${studentName} — Rate limit. Retry ${attempt + 1}/2 in ${Math.round(waitTime)}ms`);
                await delay(waitTime);
                continue;
            }

            if (attempt === 2) {
                console.error(`[AI] ${studentName} — Failed after 3 attempts:`, err.message);
                aiResult = {
                    knowledge_gaps: wrongQuestions.slice(0, 3).map((wq: any) => wq.tags?.[0] || `Câu ${wq.questionIndex}`),
                    ai_feedback: isOverloaded
                        ? "⏳ AI đang quá tải. Vui lòng bấm 'Chạy phân tích cá nhân' lại sau 1-2 phút."
                        : "Không thể tạo nhận xét tự động. Giáo viên vui lòng viết nhận xét thủ công.",
                    improvement_tasks: [],
                    advancement_suggestion: null,
                };
            }
            await delay(1000);
        }
    }

    // Lưu DB
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7);

    const { data, error } = await adminSupabase
        .from("quiz_individual_analysis")
        .upsert({
            submission_id: submission.id,
            student_id: submission.student_id,
            exam_id: exam.id,
            knowledge_gaps: aiResult.knowledge_gaps || [],
            wrong_questions: wrongQuestions,
            ai_feedback: aiResult.ai_feedback || "",
            improvement_tasks: aiResult.improvement_tasks || [],
            advancement_suggestion: aiResult.advancement_suggestion || null,
            status: 'ai_draft',
            deadline: deadlineDate.toISOString(),
            created_at: new Date().toISOString()
        }, { onConflict: 'submission_id' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================
// POST handler — Tuần tự, skip existing, key rotation
// ============================================================
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { examId, submissionId } = body;
        const adminSupabase = createAdminClient();

        // Lấy exam
        const { data: exam } = await adminSupabase
            .from("exams").select("*").eq("id", examId || "").single();

        if (!exam && !submissionId) {
            return NextResponse.json({ error: "Không tìm thấy bài kiểm tra" }, { status: 404 });
        }

        // === Xử lý 1 học sinh ===
        if (submissionId) {
            const { data: sub } = await adminSupabase
                .from("exam_submissions")
                .select("*, student:users!student_id(id, full_name)")
                .eq("id", submissionId).single();
            if (!sub) return NextResponse.json({ error: "Không tìm thấy bài nộp" }, { status: 404 });

            let examData = exam;
            if (!examData) {
                const { data: e } = await adminSupabase.from("exams").select("*").eq("id", sub.exam_id).single();
                examData = e;
            }
            if (!examData) return NextResponse.json({ error: "Không tìm thấy đề" }, { status: 404 });

            const result = await analyzeOneStudent(adminSupabase, sub, examData);
            return NextResponse.json({ data: result, error: null });
        }

        // === Xử lý hàng loạt — TUẦN TỰ ===
        const { data: submissions, error: subError } = await adminSupabase
            .from("exam_submissions")
            .select("*, student:users!student_id(id, full_name)")
            .eq("exam_id", examId);
        if (subError) throw subError;
        if (!submissions?.length) {
            return NextResponse.json({ error: "Chưa có bài nộp nào" }, { status: 400 });
        }

        // Kiểm tra HS đã có analysis hợp lệ → skip
        // HS giỏi (≥80%) sẽ KHÔNG có improvement_tasks → chỉ kiểm tra ai_feedback
        const { data: existingAnalyses } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("submission_id, ai_feedback")
            .eq("exam_id", examId);

        const alreadyDone = new Set(
            (existingAnalyses || [])
                .filter((a: any) => a.ai_feedback && !a.ai_feedback.includes("quá tải") && !a.ai_feedback.includes("⏳"))
                .map((a: any) => a.submission_id)
        );

        const pendingSubmissions = submissions.filter((s: any) => !alreadyDone.has(s.id));
        let success = alreadyDone.size;
        let failed = 0;
        let skipped = alreadyDone.size;
        const errors: string[] = [];

        console.log(`[Batch] Total: ${submissions.length}, Skip: ${skipped}, Pending: ${pendingSubmissions.length}`);

        // Tuần tự từng HS — delay 4s giữa mỗi HS (tránh rate limit)
        for (let i = 0; i < pendingSubmissions.length; i++) {
            const sub = pendingSubmissions[i];
            const studentObj = Array.isArray(sub.student) ? sub.student[0] : sub.student;

            try {
                console.log(`[Batch] ${i + 1}/${pendingSubmissions.length}: ${studentObj?.full_name}`);
                await analyzeOneStudent(adminSupabase, sub, exam);
                success++;
            } catch (err: any) {
                failed++;
                errors.push(`${studentObj?.full_name || 'HS'}: ${err.message || 'Lỗi'}`);
                console.error(`[Batch] Failed: ${studentObj?.full_name}:`, err.message);
            }

            // Delay 4s giữa mỗi HS — đảm bảo không vượt 15 RPM/key
            if (i < pendingSubmissions.length - 1) {
                await delay(4000);
            }
        }

        return NextResponse.json({
            data: { success, failed, skipped, total: submissions.length, errors },
            error: null
        });
    } catch (error: any) {
        console.error("Error in analyze-quiz-individual:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
