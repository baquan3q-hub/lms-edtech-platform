import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiModel } from "@/lib/gemini";

async function analyzeOneStudent(
    adminSupabase: any,
    submission: any,
    exam: any
) {
    const questions = (exam.questions || []) as any[];
    const studentAnswers = (submission.answers || []) as any[];
    const studentObj = Array.isArray(submission.student) ? submission.student[0] : submission.student;

    // Xác định câu sai
    const wrongQuestions = questions
        .map((q: any, qIdx: number) => {
            if (q.type === "ESSAY") return null; // skip essay
            const correctOption = (q.options || []).find((o: any) => o.isCorrect);
            const studentAnswer = studentAnswers[qIdx];
            if (studentAnswer?.selectedOptionId === correctOption?.id) return null; // đúng → skip

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

    // Nếu không có câu sai, vẫn tạo feedback
    const score = Number(submission.score) || 0;
    const totalPoints = exam.total_points || 10;

    const prompt = `
Bạn là gia sư giáo dục chuyên nghiệp, thân thiện và tận tình.
Phân tích bài làm của học sinh và tạo bài học cải thiện cá nhân hóa.
Trả về JSON THUẦN TÚY (KHÔNG dùng markdown code block, KHÔNG backtick).

HỌC SINH: ${studentObj?.full_name || "Học sinh"}
BÀI KIỂM TRA: ${exam.title}
ĐIỂM: ${score}/${totalPoints}

CÂU LÀM SAI (${wrongQuestions.length} câu):
${wrongQuestions.length > 0 ? JSON.stringify(wrongQuestions, null, 2) : "Không có câu sai — học sinh làm rất tốt!"}

Trả về JSON thuần túy:
{
  "knowledge_gaps": ["Tên kiến thức hổng 1", "Tên kiến thức hổng 2"],
  "ai_feedback": "Nhận xét thân thiện, cụ thể, bằng tiếng Việt, 3-4 câu. LUÔN khen điểm tốt trước, góp ý sau. Kết thúc bằng câu động viên. Không dùng ngôn ngữ tiêu cực.",
  "improvement_tasks": [
    {
      "title": "Tên ngắn gọn của kiến thức cần ôn",
      "knowledge_topic": "Tên kiến thức chính xác",
      "estimated_time": "15 phút",
      "theory": {
        "explanation": "Giải thích ngắn gọn 2-3 câu khi nào dùng, dùng như thế nào",
        "formula": "Công thức hoặc quy tắc chính (nếu có)",
        "examples": [
          "Ví dụ 1: câu ví dụ cụ thể kèm giải thích",
          "Ví dụ 2: câu ví dụ cụ thể kèm giải thích"
        ],
        "tip": "Mẹo ghi nhớ nhanh (nếu có)"
      },
      "mini_quiz": [
        {
          "id": "q1",
          "question": "Câu hỏi trắc nghiệm liên quan trực tiếp đến kiến thức",
          "options": [
            {"id": "a", "text": "Đáp án A"},
            {"id": "b", "text": "Đáp án B"},
            {"id": "c", "text": "Đáp án C"},
            {"id": "d", "text": "Đáp án D"}
          ],
          "correct": "b",
          "explanation": "Giải thích tại sao đáp án này đúng, bằng tiếng Việt"
        }
      ]
    }
  ]
}

YÊU CẦU:
- Tạo 2-3 improvement_tasks tương ứng với kiến thức hổng
- Mỗi task PHẢI CÓ phần theory (lý thuyết ngắn gọn) và mini_quiz (3-5 câu trắc nghiệm)
- Câu hỏi mini_quiz phải liên quan trực tiếp đến câu sai của học sinh
- Lý thuyết ngắn gọn, dễ hiểu, luôn có ví dụ thực tế
- Ngôn ngữ: Tiếng Việt
- Nếu không có câu sai, hãy đề xuất bài tập nâng cao
`;

    const model = getGeminiModel("gemini-2.5-flash");
    let aiResult: any = null;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            aiResult = JSON.parse(text);
            break;
        } catch (parseErr) {
            if (attempt === 1) {
                aiResult = {
                    knowledge_gaps: [],
                    ai_feedback: "Không thể tạo nhận xét tự động. Giáo viên vui lòng viết nhận xét thủ công.",
                    improvement_tasks: []
                };
            }
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    // Lưu vào DB
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

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
            status: 'ai_draft',
            deadline: deadline.toISOString(),
            created_at: new Date().toISOString()
        }, { onConflict: 'submission_id' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { examId, submissionId } = body;

        const adminSupabase = createAdminClient();

        // Lấy exam
        const { data: exam, error: examError } = await adminSupabase
            .from("exams")
            .select("*")
            .eq("id", examId || "")
            .single();

        if (!exam && !submissionId) {
            return NextResponse.json({ error: "Không tìm thấy bài kiểm tra" }, { status: 404 });
        }

        // Xử lý 1 học sinh
        if (submissionId) {
            const { data: sub, error: subError } = await adminSupabase
                .from("exam_submissions")
                .select("*, student:users!student_id(id, full_name)")
                .eq("id", submissionId)
                .single();
            if (subError || !sub) {
                return NextResponse.json({ error: "Không tìm thấy bài nộp" }, { status: 404 });
            }

            // Lấy exam nếu chưa có
            let examData = exam;
            if (!examData) {
                const { data: e } = await adminSupabase.from("exams").select("*").eq("id", sub.exam_id).single();
                examData = e;
            }
            if (!examData) return NextResponse.json({ error: "Không tìm thấy đề" }, { status: 404 });

            const result = await analyzeOneStudent(adminSupabase, sub, examData);
            return NextResponse.json({ data: result, error: null });
        }

        // Xử lý hàng loạt
        const { data: submissions, error: subError } = await adminSupabase
            .from("exam_submissions")
            .select("*, student:users!student_id(id, full_name)")
            .eq("exam_id", examId);
        if (subError) throw subError;

        if (!submissions || submissions.length === 0) {
            return NextResponse.json({ error: "Chưa có bài nộp nào" }, { status: 400 });
        }

        // Batch 5 học sinh/lần, delay 2s giữa các batch
        const batchSize = 5;
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < submissions.length; i += batchSize) {
            const batch = submissions.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(sub => analyzeOneStudent(adminSupabase, sub, exam))
            );

            results.forEach((r, idx) => {
                if (r.status === "fulfilled") {
                    success++;
                } else {
                    failed++;
                    const studentObj = Array.isArray(batch[idx].student) ? batch[idx].student[0] : batch[idx].student;
                    errors.push(`${studentObj?.full_name || 'Unknown'}: ${r.reason?.message || 'Error'}`);
                }
            });

            // Delay giữa các batch để tránh rate limit
            if (i + batchSize < submissions.length) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        return NextResponse.json({
            data: { success, failed, total: submissions.length, errors },
            error: null
        });
    } catch (error: any) {
        console.error("Error in analyze-quiz-individual:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
