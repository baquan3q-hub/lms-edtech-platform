import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRotatingGeminiModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { examId, classId } = await req.json();
        if (!examId || !classId) {
            return NextResponse.json({ error: "Thiếu examId hoặc classId" }, { status: 400 });
        }

        const adminSupabase = createAdminClient();

        // BƯỚC 1 — Lấy đề thi và bài nộp
        const { data: exam, error: examError } = await adminSupabase
            .from("exams")
            .select("*")
            .eq("id", examId)
            .single();
        if (examError || !exam) {
            return NextResponse.json({ error: "Không tìm thấy bài kiểm tra" }, { status: 404 });
        }

        const { data: submissions, error: subError } = await adminSupabase
            .from("exam_submissions")
            .select("*, student:users!student_id(id, full_name)")
            .eq("exam_id", examId);
        if (subError) throw subError;

        if (!submissions || submissions.length < 3) {
            return NextResponse.json({ error: "Cần ít nhất 3 bài nộp để phân tích" }, { status: 400 });
        }

        const questions = (exam.questions || []) as any[];
        const subs = submissions as any[];

        // BƯỚC 2 — Tính thống kê từng câu
        const questionStats = questions.map((q: any, qIdx: number) => {
            const optionCounts: Record<string, number> = {};
            let correctCount = 0;

            (q.options || []).forEach((opt: any) => { optionCounts[opt.id] = 0; });

            subs.forEach(sub => {
                const studentAnswer = (sub.answers || [])[qIdx];
                if (studentAnswer?.selectedOptionId) {
                    optionCounts[studentAnswer.selectedOptionId] = (optionCounts[studentAnswer.selectedOptionId] || 0) + 1;
                }
                const correctOption = (q.options || []).find((o: any) => o.isCorrect);
                if (studentAnswer?.selectedOptionId === correctOption?.id) {
                    correctCount++;
                }
            });

            const correctRate = Math.round((correctCount / subs.length) * 100);

            // Tìm đáp án sai phổ biến nhất
            const correctOptionId = (q.options || []).find((o: any) => o.isCorrect)?.id;
            let mostChosenWrong = "";
            let maxWrongCount = 0;
            Object.entries(optionCounts).forEach(([optId, count]) => {
                if (optId !== correctOptionId && count > maxWrongCount) {
                    maxWrongCount = count;
                    mostChosenWrong = (q.options || []).find((o: any) => o.id === optId)?.text || optId;
                }
            });

            return {
                questionIndex: qIdx,
                question: q.question,
                correctRate,
                correctCount,
                wrongCount: subs.length - correctCount,
                mostChosenWrong,
                mostChosenWrongCount: maxWrongCount,
                difficulty: correctRate < 40 ? 'hard' : correctRate < 70 ? 'medium' : 'easy',
                optionCounts,
                tags: q.tags || []
            };
        });

        // BƯỚC 3 — Tính phân bố điểm và thống kê tổng
        const scores = subs.map(s => Number(s.score) || 0);
        const totalPoints = exam.total_points || 10;
        const avgScore = scores.reduce((a, b) => a + b, 0) / subs.length;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const passThreshold = totalPoints * 0.5;
        const passCount = scores.filter(s => s >= passThreshold).length;
        const failCount = subs.length - passCount;
        const passRate = Math.round((passCount / subs.length) * 100);

        // Chuẩn hóa điểm về thang 10 để phân bố
        const scoreDistribution: Record<string, number> = { '0-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
        scores.forEach(s => {
            const scaled = totalPoints > 0 ? (s / totalPoints) * 10 : 0;
            if (scaled <= 4) scoreDistribution['0-4']++;
            else if (scaled <= 6) scoreDistribution['5-6']++;
            else if (scaled <= 8) scoreDistribution['7-8']++;
            else scoreDistribution['9-10']++;
        });

        // BƯỚC 4 — Kiểm tra Cache (lưu trữ) để tránh tốn Token AI
        const { data: existingAnalysis } = await adminSupabase
            .from("quiz_class_analysis")
            .select("*")
            .eq("exam_id", examId)
            .single();

        // Nếu đã có bản phân tích và số lượng bài nộp không đổi, trả về luôn (tiết kiệm Token)
        if (existingAnalysis && existingAnalysis.total_submissions === subs.length && existingAnalysis.ai_summary && !existingAnalysis.ai_summary.includes('Không thể phân tích')) {
            console.log("Returning cached analysis for exam:", examId);
            return NextResponse.json({ data: existingAnalysis, error: null });
        }

        const prompt = `
Bạn là chuyên gia phân tích giáo dục.
Phân tích kết quả bài kiểm tra sau và trả về JSON thuần túy (KHÔNG dùng markdown code block).

THÔNG TIN BÀI KIỂM TRA:
- Tên: ${exam.title}
- Tổng số bài nộp: ${subs.length}
- Điểm trung bình: ${avgScore.toFixed(1)}/${totalPoints}
- Điểm cao nhất: ${maxScore}, thấp nhất: ${minScore}
- Tỷ lệ đạt (≥50%): ${passRate}%

THỐNG KÊ TỪNG CÂU:
${JSON.stringify(questionStats.map(qs => ({
    câu: qs.questionIndex + 1,
    nội_dung: qs.question,
    tỉ_lệ_đúng: qs.correctRate + '%',
    độ_khó: qs.difficulty,
    đáp_án_sai_phổ_biến: qs.mostChosenWrong
})), null, 2)}

Trả về JSON thuần túy với cấu trúc:
{
  "ai_summary": "Tóm tắt tổng thể bằng 2-3 câu tiếng Việt, nhận xét chân thực",
  "strengths": ["điểm mạnh 1 của cả lớp", "điểm mạnh 2"],
  "weaknesses": ["điểm yếu 1 cần cải thiện", "điểm yếu 2"],
  "knowledge_gaps": [
    {
      "topic": "Tên kiến thức bị hổng",
      "severity": "high hoặc medium hoặc low",
      "affected_students_percent": 68,
      "evidence": "Câu X,Y có tỷ lệ sai cao"
    }
  ],
  "teaching_suggestions": [
    "Gợi ý cụ thể cho giáo viên 1",
    "Gợi ý cụ thể cho giáo viên 2"
  ]
}
`;

        const model = getRotatingGeminiModel("gemini-2.5-flash");
        let aiResult: any = null;

        // Xử lý Gọi AI có Retry khi Quá tải 429 / 503
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                let text = result.response.text();
                
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    text = jsonMatch[0];
                } else {
                    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                }
                
                aiResult = JSON.parse(text);
                break;
            } catch (err: any) {
                const isOverloaded = err.status === 429 || err.status === 503 || err.message?.includes("429") || err.message?.includes("503");
                
                if (isOverloaded) {
                    if (attempt < 3) {
                        const waitTime = Math.pow(2, attempt) * 2000 + 1000;
                        console.log(`Gemini Rate Limit hit. Retrying in ${waitTime}ms...`);
                        await new Promise(r => setTimeout(r, waitTime));
                        continue;
                    } else {
                        return NextResponse.json({ error: "AI hiện đang vượt quá hạn mức sử dụng miễn phí hoặc quá tải. Vui lòng thử lại sau 1-2 phút." }, { status: 429 });
                    }
                }
                
                if (attempt === 3) {
                    console.error("Failed to parse Gemini response after attempts", err.message);
                    aiResult = {
                        ai_summary: "Không thể phân tích tự động do phản hồi từ AI không đúng cấu trúc. Vui lòng thử lại.",
                        strengths: [],
                        weaknesses: [],
                        knowledge_gaps: [],
                        teaching_suggestions: []
                    };
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Lấy teacher_id
        const { data: classData } = await adminSupabase
            .from("classes")
            .select("teacher_id")
            .eq("id", classId)
            .single();

        // BƯỚC 5 — Upsert vào database
        const { data: analysis, error: insertError } = await adminSupabase
            .from("quiz_class_analysis")
            .upsert({
                exam_id: examId,
                class_id: classId,
                teacher_id: classData?.teacher_id || null,
                total_submissions: subs.length,
                avg_score: Math.round(avgScore * 100) / 100,
                pass_count: passCount,
                fail_count: failCount,
                strengths: aiResult.strengths || [],
                weaknesses: aiResult.weaknesses || [],
                knowledge_gaps: aiResult.knowledge_gaps || [],
                question_stats: questionStats,
                teaching_suggestions: aiResult.teaching_suggestions || [],
                score_distribution: scoreDistribution,
                ai_summary: aiResult.ai_summary || "",
                generated_at: new Date().toISOString(),
                status: 'draft'
            }, { onConflict: 'exam_id' })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ data: analysis, error: null });
    } catch (error: any) {
        console.error("Error in analyze-quiz-class:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
