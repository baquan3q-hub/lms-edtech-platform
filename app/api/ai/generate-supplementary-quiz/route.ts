import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRotatingGeminiModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { analysisId, examId, studentId, teacherId, questionTypes = "mixed", autoSave = false } = await req.json();
        if (!analysisId || !studentId) {
            return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
        }

        const adminSupabase = createAdminClient();

        // Lấy analysis để biết kiến thức hổng
        const { data: analysis } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("*, student:users!student_id(full_name)")
            .eq("id", analysisId)
            .single();

        if (!analysis) {
            return NextResponse.json({ error: "Không tìm thấy phân tích" }, { status: 404 });
        }

        // Lấy exam title
        const { data: exam } = await adminSupabase
            .from("exams")
            .select("title, class_id")
            .eq("id", analysis.exam_id)
            .single();

        const studentObj = Array.isArray(analysis.student) ? analysis.student[0] : analysis.student;
        const knowledgeGaps = analysis.knowledge_gaps || [];
        const wrongQuestions = analysis.wrong_questions || [];

        // Xác định loại câu hỏi cần tạo
        let questionInstruction = "";
        if (questionTypes === "mcq") {
            questionInstruction = "Tạo 10 câu hỏi TRẮC NGHIỆM (type: mcq).";
        } else if (questionTypes === "essay") {
            questionInstruction = "Tạo 5 câu hỏi TỰ LUẬN (type: essay).";
        } else {
            questionInstruction = "Tạo 7 câu TRẮC NGHIỆM (type: mcq) + 3 câu TỰ LUẬN (type: essay) = 10 câu tổng.";
        }

        const prompt = `
Bạn là giáo viên chuyên nghiệp. Tạo bài tập bổ trợ để học sinh ôn luyện.
Trả về JSON THUẦN TÚY (KHÔNG markdown, KHÔNG backtick).

HỌC SINH: ${studentObj?.full_name || "Học sinh"}
BÀI KIỂM TRA GỐC: ${exam?.title || "Bài kiểm tra"}

KIẾN THỨC HỔNG:
${knowledgeGaps.map((g: string) => `- ${g}`).join('\n')}

CÂU ĐÃ LÀM SAI:
${JSON.stringify(wrongQuestions.slice(0, 5), null, 2)}

${questionInstruction}

Trả về JSON:
{
  "title": "Bài tập bổ trợ: [tên kiến thức]",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Câu hỏi trắc nghiệm",
      "options": [
        {"id": "a", "text": "Đáp án A"},
        {"id": "b", "text": "Đáp án B"},
        {"id": "c", "text": "Đáp án C"},
        {"id": "d", "text": "Đáp án D"}
      ],
      "correct": "b",
      "explanation": "Giải thích ngắn gọn tại sao đáp án này đúng"
    },
    {
      "id": "q8",
      "type": "essay",
      "question": "Câu hỏi tự luận yêu cầu học sinh viết trả lời",
      "sample_answer": "Đáp án mẫu ngắn gọn cho giáo viên tham khảo",
      "max_score": 10,
      "rubric": "Tiêu chí chấm: [mô tả]"
    }
  ]
}

YÊU CẦU:
- Câu hỏi phải liên quan trực tiếp đến kiến thức hổng
- Sắp xếp từ dễ đến khó
- Trắc nghiệm: 4 đáp án (a, b, c, d), giải thích rõ ràng
- Tự luận: nêu rõ yêu cầu, kèm đáp án mẫu và tiêu chí chấm
- Ngôn ngữ: Tiếng Việt
`;

        const model = getRotatingGeminiModel("gemini-2.5-flash");
        let quizData: any = null;

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                quizData = JSON.parse(text);
                break;
            } catch (parseErr) {
                if (attempt === 1) {
                    return NextResponse.json({ error: "Không thể tạo bài tập. Vui lòng thử lại." }, { status: 500 });
                }
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        // Nếu autoSave = false, trả về cho GV xem trước
        if (!autoSave) {
            return NextResponse.json({ data: quizData, saved: false, error: null });
        }

        // Lưu vào DB (khi autoSave = true)
        const { data: quiz, error } = await adminSupabase
            .from("supplementary_quizzes")
            .insert({
                analysis_id: analysisId,
                exam_id: analysis.exam_id,
                student_id: studentId,
                teacher_id: teacherId,
                title: quizData.title || `Bài tập bổ trợ - ${exam?.title || ''}`,
                questions: quizData.questions || [],
                total_questions: (quizData.questions || []).length,
                status: 'draft'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data: quiz, saved: true, error: null });
    } catch (error: any) {
        console.error("Error generating supplementary quiz:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
