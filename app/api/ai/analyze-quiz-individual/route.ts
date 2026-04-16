import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiModel } from "@/lib/gemini";

// ============================================================
// Prompt cho học sinh điểm cao (≥85%): Khen ngợi + bài tập thử thách
// ============================================================
function buildHighPerformerPrompt(
    student: any, exam: any, score: number, totalPoints: number, wrongQuestions: any[]
): string {
    return `
Bạn là gia sư giáo dục chuyên nghiệp, thân thiện.
Học sinh đạt điểm CAO. Hãy KHEN NGỢI thành tích, tạo bài ÔN TẬP + MỞ RỘNG kiến thức, và ĐỀ XUẤT học lên phần cao hơn.
Trọng tâm: Vẫn phải chỉ ra lổ hổng kiến thức nếu có câu sai.

HỌC SINH: ${student?.full_name || "Học sinh"}
BÀI KIỂM TRA: ${exam.title}
ĐIỂM: ${score}/${totalPoints} (${((score / totalPoints) * 100).toFixed(0)}% — Xuất sắc!)

${wrongQuestions.length > 0 ? `CÂU LÀM SAI CHÍNH XÁC CỦA HỌC SINH (${wrongQuestions.length} câu):\n${JSON.stringify(wrongQuestions, null, 2)}\n(AI PHẢI TẬP TRUNG PHÂN TÍCH NHỮNG KIẾN THỨC CỦA CÁC CÂU NÀY MÀ HỌC SINH ĐÃ CHỌN SAI KHỎI ĐÁP ÁN ĐÚNG)` : "Không có câu sai — hoàn hảo!"}

Trả về DUY NHẤT một cục JSON theo cấu trúc sau:
{
  "knowledge_gaps": [${wrongQuestions.length > 0 ? "\"Tên kiến thức bị sai 1\", \"Tên kiến thức bị sai 2\"" : ""}],
  "ai_feedback": "Lời khen ngợi nhiệt tình (3-4 câu). Nhấn mạnh thành tích xuất sắc. Nếu có 1-2 câu sai nhẹ, nhắc nhẹ nhàng. KẾT THÚC bằng đề xuất cụ thể: Em nên tìm hiểu thêm về [chủ đề nâng cao liên quan] để phát triển hơn nữa.",
  "advancement_suggestion": "Gợi ý cụ thể 2-3 chủ đề/phần kiến thức nâng cao mà học sinh nên học tiếp theo, dựa trên nội dung bài kiểm tra. Ví dụ: Nếu bài kiểm tra về phương trình bậc 1, đề xuất học phương trình bậc 2. Viết dạng đoạn văn ngắn, thân thiện.",
  "improvement_tasks": [
    {
      "title": "📚 Ôn tập & Củng cố kiến thức cốt lõi",
      "type": "review",
      "knowledge_topic": "Kiến thức cốt lõi từ bài kiểm tra",
      "estimated_time": "15 phút",
      "theory": {
        "explanation": "Tóm tắt ngắn gọn các kiến thức QUAN TRỌNG NHẤT trong bài kiểm tra, giúp học sinh hệ thống hóa lại",
        "formula": "Công thức/quy tắc chính (nếu có)",
        "examples": ["Ví dụ ôn tập 1 kèm giải thích", "Ví dụ ôn tập 2 kèm giải thích"],
        "tip": "Mẹo ghi nhớ nhanh"
      },
      "mini_quiz": [
        {"id": "q1", "question": "Câu ôn tập kiến thức cốt lõi 1", "options": [{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}], "correct": "b", "explanation": "Giải thích"},
        {"id": "q2", "question": "Câu ôn tập 2", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q3", "question": "Câu ôn tập 3", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q4", "question": "Câu ôn tập 4", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q5", "question": "Câu ôn tập 5", "options": [...], "correct": "...", "explanation": "..."}
      ]
    },
    {
      "title": "🚀 Mở rộng & Nâng cao kiến thức",
      "type": "extension",
      "knowledge_topic": "Kiến thức nâng cao liên quan",
      "estimated_time": "20 phút",
      "theory": {
        "explanation": "Giới thiệu kiến thức MỚI, NÂNG CAO hơn bài kiểm tra. Mở rộng từ nội dung đã học sang phần tiếp theo. Giải thích dễ hiểu cho học sinh giỏi.",
        "formula": "Công thức/quy tắc nâng cao (nếu có)",
        "examples": ["Ví dụ nâng cao 1 kèm giải thích chi tiết", "Ví dụ nâng cao 2 kèm giải thích chi tiết"],
        "tip": "Mẹo cho bài tập khó + hướng dẫn tư duy"
      },
      "mini_quiz": [
        {"id": "q1", "question": "Câu nâng cao 1 — MỨC ĐỘ KHÓ", "options": [{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}], "correct": "b", "explanation": "Giải thích chi tiết"},
        {"id": "q2", "question": "Câu nâng cao 2", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q3", "question": "Câu nâng cao 3", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q4", "question": "Câu nâng cao 4", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q5", "question": "Câu nâng cao 5", "options": [...], "correct": "...", "explanation": "..."}
      ]
    }
  ]
}

YÊU CẦU BẮT BUỘC:
- PHẢI TẠO ĐÚNG 2 improvement_tasks:
  + Task 1 (type: "review"): Ôn tập kiến thức cốt lõi — câu hỏi mức TRUNG BÌNH, giúp củng cố lại
  + Task 2 (type: "extension"): Mở rộng kiến thức — câu hỏi mức KHÓ, kiến thức CHUYÊN SÂU hơn bài kiểm tra
- Mỗi task PHẢI CÓ ĐÚNG 5 câu hỏi mini_quiz (id: q1-q5)
- advancement_suggestion PHẢI ĐỀ XUẤT CỤ THỂ chủ đề học tiếp theo (không chung chung)
- ai_feedback PHẢI kết thúc bằng đề xuất phát triển cụ thể
- Tiếng Việt, khen ngợi nhiệt tình, truyền cảm hứng học tập
`;
}

// ============================================================
// Prompt cho học sinh cần cải thiện (<85%): Động viên + bài ôn tập
// ============================================================
function buildImprovementPrompt(
    student: any, exam: any, score: number, totalPoints: number, wrongQuestions: any[]
): string {
    return `
Bạn là gia sư giáo dục chuyên nghiệp, thân thiện và KIÊN NHẪN.
Học sinh cần được hỗ trợ cải thiện. ĐỘNG VIÊN trước, rồi hướng dẫn ôn tập.
CHÚ Ý ĐẶC BIỆT: Bạn PHẢI đọc kỹ danh sách "CÂU LÀM SAI" để rút ra KẾT LUẬN về "Kiến thức hổng". KHÔNG đoán bừa.

HỌC SINH: ${student?.full_name || "Học sinh"}
BÀI KIỂM TRA: ${exam.title}
ĐIỂM: ${score}/${totalPoints} (${((score / totalPoints) * 100).toFixed(0)}%)

CÂU LÀM SAI CHÍNH XÁC CỦA HỌC SINH (${wrongQuestions.length} câu):
${JSON.stringify(wrongQuestions, null, 2)}
(AI PHẢI TẬP TRUNG PHÂN TÍCH CÁC CÂU LÀM SAI MÀ HỌC SINH ĐÃ CHỌN ĐỂ TẠO NHẬN XÉT, TẠO MẢNG KNOWLEDGE_GAPS VÀ CÁC THỰC HÀNH IMPROVEMENT)

Trả về DUY NHẤT một cục JSON theo cấu trúc sau:
{
  "knowledge_gaps": ["Rút ra từ các câu sai ở trên (ví dụ: Phép nhân số thập phân, Động từ to-be)"],
  "ai_feedback": "Nhận xét thân thiện: LUÔN khen điểm tốt trước (dù ít). Không dùng 'yếu', 'kém'. Dùng 'cần luyện thêm', 'sẽ tiến bộ'. 3-4 câu. Kết bằng lời động viên.",
  "improvement_tasks": [
    {
      "title": "Tên kiến thức cần ôn",
      "knowledge_topic": "Tên chính xác",
      "estimated_time": "15 phút",
      "theory": {
        "explanation": "Giải thích ngắn gọn 2-3 câu, dễ hiểu, có ví dụ thực tế",
        "formula": "Công thức/quy tắc chính",
        "examples": ["Ví dụ minh họa 1 kèm giải thích", "Ví dụ minh họa 2 kèm giải thích"],
        "tip": "Mẹo ghi nhớ nhanh"
      },
      "mini_quiz": [
        {"id": "q1", "question": "Câu 1 liên quan trực tiếp đến câu sai", "options": [{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}], "correct": "b", "explanation": "Giải thích chi tiết"},
        {"id": "q2", "question": "...", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q3", "question": "...", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q4", "question": "...", "options": [...], "correct": "...", "explanation": "..."},
        {"id": "q5", "question": "...", "options": [...], "correct": "...", "explanation": "..."}
      ]
    }
  ]
}

YÊU CẦU BẮT BUỘC DRACONIAN:
- PHẢI điền CHÍNH XÁC danh sách mảng knowledge_gaps DỰA DỰA VÀO CÂU LÀM SAI. KHÔNG ĐƯỢC ĐỂ TRỐNG ARRAY ẤY nếu có bất kì lỗi nào!
- Tạo thẻ knowledge_topic và theory ĐÚNG như phần kiến thức học sinh bị mất.
- Không nhận xét chung chung, bài ôn PHẢI là bài học cụ thể về chính cái chỗ học sinh sai ở phương án!
- Trả về JSON, không thêm văn bản bên ngoài.
`;
}

// ============================================================
// Validate mini_quiz có đúng 5 câu cho mỗi task
// ============================================================
function validateAndFixQuizCount(aiResult: any): any {
    if (!aiResult?.improvement_tasks) return aiResult;

    aiResult.improvement_tasks = aiResult.improvement_tasks.map((task: any) => {
        const quiz = task.mini_quiz || [];
        if (quiz.length === 5) return task;

        // Pad nếu thiếu, trim nếu thừa
        while (quiz.length < 5) {
            quiz.push({
                id: `q${quiz.length + 1}`,
                question: `Câu hỏi bổ sung ${quiz.length + 1} về ${task.knowledge_topic || task.title}`,
                options: [
                    { id: "a", text: "Đáp án A" },
                    { id: "b", text: "Đáp án B" },
                    { id: "c", text: "Đáp án C" },
                    { id: "d", text: "Đáp án D" },
                ],
                correct: "a",
                explanation: "Đáp án sẽ được giáo viên cập nhật.",
            });
        }
        task.mini_quiz = quiz.slice(0, 5);
        return task;
    });

    return aiResult;
}

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
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const isHighPerformer = percentage >= 85;

    // Xây dựng prompt theo mức độ
    const prompt = isHighPerformer
        ? buildHighPerformerPrompt(studentObj, exam, score, totalPoints, wrongQuestions)
        : buildImprovementPrompt(studentObj, exam, score, totalPoints, wrongQuestions);

    const genAI = require("@google/generative-ai").GoogleGenerativeAI;
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const genAiInstance = new genAI(apiKey);
    const model = genAiInstance.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2 // Giảm temperature để tăng tính logic và chính xác đối với kết quả sai của hs
        } 
    });
    
    let aiResult: any = null;

    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            let text = result.response.text();
            
            aiResult = JSON.parse(text);
            aiResult = validateAndFixQuizCount(aiResult); // Đảm bảo 5 câu/task
            break;
        } catch (err: any) {
            const isOverloaded = err.status === 429 || err.status === 503 || err.message?.includes("429") || err.message?.includes("503");
            
            if (isOverloaded && attempt < 3) {
                const waitTime = Math.pow(2, attempt) * 2000 + 1000;
                console.log(`Individual Analysis - Gemini Rate Limit hit. Retry ${attempt + 1}/3 in ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }
            
            if (attempt === 3) {
                aiResult = {
                    knowledge_gaps: [],
                    ai_feedback: isOverloaded 
                        ? "AI đang quá tải. Vui lòng thử lại sau vài phút."
                        : "Không thể tạo nhận xét tự động. Giáo viên vui lòng viết nhận xét thủ công.",
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
            advancement_suggestion: aiResult.advancement_suggestion || null,
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
