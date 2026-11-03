import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AI_MODEL, getNextApiKey } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSchoolAiAccess, recordAiFailure, recordAiSuccess, recordSchoolAiTokenUsage } from "./quota-manager";
import { sanitizeContextForAI, computeSourceDataHash } from "./pii-sanitizer";
import {
    questionGenerationSchema,
    rubricFeedbackSchema,
    earlyInterventionRecommendationSchema,
    type QuestionGenerationDraft,
    type RubricFeedbackDraft,
    type EarlyInterventionRecommendationDraft,
} from "./schemas";

export interface AiServiceResult<T> {
    success: boolean;
    jobId?: string;
    draft?: T;
    error?: string;
    reason?: string;
}

/**
 * TÁC VỤ 1: Sinh bản nháp câu hỏi bài tập / đề kiểm tra
 */
export async function generateQuestionsDraft(params: {
    schoolId: string;
    requestedBy: string;
    subject: string;
    gradeLevel: number;
    topic: string;
    questionCount?: number;
    difficulty?: "easy" | "medium" | "hard";
    pointsPerQuestion?: number;
}): Promise<AiServiceResult<QuestionGenerationDraft>> {
    const { schoolId, requestedBy, subject, gradeLevel, topic, questionCount = 3, difficulty = "medium", pointsPerQuestion = 1.0 } = params;

    // 1. Kiểm tra Quota & Cờ trường
    const quotaCheck = await checkSchoolAiAccess(schoolId, 1500);
    if (!quotaCheck.allowed) {
        return { success: false, reason: quotaCheck.reason, error: quotaCheck.message };
    }

    const inputData = { subject, gradeLevel, topic, questionCount, difficulty, pointsPerQuestion };
    const sourceHash = computeSourceDataHash(inputData);
    const supabase = createAdminClient();

    const promptText = `Bạn là chuyên gia sư phạm phổ thông K12. Hãy soạn ${questionCount} câu hỏi trắc nghiệm khách quan cho môn "${subject}", Khối ${gradeLevel}, Chủ đề "${topic}", độ khó "${difficulty}".
Yêu cầu bắt buộc:
1. Mỗi câu có đúng 4 phương án (id: "A", "B", "C", "D"), đáp án đúng và lời giải chi tiết.
2. Không dùng câu hỏi mẫu, không để placeholder như "Đáp án A", "Lựa chọn 1".
3. Trả về đúng định dạng JSON:
{
  "subject": "${subject}",
  "grade_level": ${gradeLevel},
  "topic": "${topic}",
  "questions": [
    {
      "id": "q1",
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": [
        {"id": "A", "text": "..."},
        {"id": "B", "text": "..."},
        {"id": "C", "text": "..."},
        {"id": "D", "text": "..."}
      ],
      "correct_answer": "A",
      "explanation": "...",
      "difficulty": "${difficulty}",
      "points": ${pointsPerQuestion}
    }
  ]
}`;

    try {
        let validatedDraft: QuestionGenerationDraft | null = null;
        let actualTokens: number | null = null;

        try {
            const ai = new GoogleGenAI({ apiKey: getNextApiKey(), httpOptions: { timeout: 25000 } });
            const result = await ai.models.generateContent({
                model: AI_MODEL,
                contents: promptText,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                },
            });

            actualTokens = result.usageMetadata?.totalTokenCount ?? null;
            const parsedJson = JSON.parse((result.text || "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
            validatedDraft = questionGenerationSchema.parse(parsedJson);
            recordAiSuccess(schoolId);
        } catch (apiError: unknown) {
            recordAiFailure(schoolId);
            throw apiError;
        }

        // Lưu job vào learning_ai_jobs với review_status = 'draft' (AI KHÔNG TỰ CÔNG BỐ)
        const { data: job, error: jobErr } = await supabase
            .from("learning_ai_jobs")
            .insert({
                school_id: schoolId,
                requested_by: requestedBy,
                kind: "question_generation",
                target_type: "exam_draft",
                source_data_hash: sourceHash,
                prompt_version: "question-gen-v1",
                model_name: AI_MODEL,
                status: "ready",
                review_status: "draft",
                raw_output: validatedDraft,
                estimated_tokens: 1500,
                actual_tokens: actualTokens,
                finished_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (jobErr) {
            return { success: false, error: "Lỗi lưu trữ bản nháp AI: " + jobErr.message };
        }

        if (actualTokens !== null) await recordSchoolAiTokenUsage(schoolId, actualTokens);

        return {
            success: true,
            jobId: job.id,
            draft: validatedDraft,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || "Không thể sinh câu hỏi bằng AI.",
            reason: "AI_GENERATION_FAILED",
        };
    }
}

/**
 * TÁC VỤ 2: Sinh bản nháp nhận xét / gợi ý chấm điểm theo Rubric
 */
export async function generateRubricFeedbackDraft(params: {
    schoolId: string;
    requestedBy: string;
    submissionId: string;
    studentAnswerText: string;
    rubricCriteria: Array<{ id: string; name: string; max_score: number; description?: string }>;
    studentIdentifiers?: { name?: string; studentCode?: string; email?: string; phone?: string };
}): Promise<AiServiceResult<RubricFeedbackDraft>> {
    const { schoolId, requestedBy, submissionId, studentAnswerText, rubricCriteria, studentIdentifiers } = params;

    // 1. Kiểm tra Quota & Cờ trường
    const quotaCheck = await checkSchoolAiAccess(schoolId, 1200);
    if (!quotaCheck.allowed) {
        return { success: false, reason: quotaCheck.reason, error: quotaCheck.message };
    }

    // 2. Lọc sạch PII cá nhân của học sinh
    const { sanitizedData, sourceHash } = sanitizeContextForAI(
        { submissionId, studentAnswerText, rubricCriteria },
        studentIdentifiers
    );

    const supabase = createAdminClient();

    const promptText = `Bạn là trợ lý chấm thi sư phạm. Hãy phân tích câu trả lời của học sinh theo thang tiêu chí Rubric sau và đưa ra gợi ý nhận xét:
[TIÊU CHÍ RUBRIC]:
${JSON.stringify(rubricCriteria, null, 2)}

[BÀI LÀM CỦA HỌC SINH (ĐÃ ẨN DANH)]:
"${sanitizedData.studentAnswerText}"

QUY TẮC BẮT BUỘC:
1. Gợi ý điểm từng tiêu chí trong khoảng [0, max_score].
2. Trích dẫn minh chứng trực tiếp từ bài làm.
3. Nhận xét mang tính xây dựng, tích cực, khuyến khích học sinh tiến bộ.
4. NGHIÊM CẤM tuyệt đối phán xét đạo đức, suy diễn gian lận hay lười biếng.
5. Trả về đúng JSON:
{
  "criteria_feedback": [
    {
      "criterion_id": "...",
      "criterion_name": "...",
      "suggested_score": 2.5,
      "max_score": 3.0,
      "evidence_quote": "...",
      "feedback_text": "..."
    }
  ],
  "overall_feedback": {
    "strengths": "...",
    "areas_for_improvement": "...",
    "next_steps": "..."
  }
}`;

    try {
        let validatedDraft: RubricFeedbackDraft | null = null;
        let actualTokens: number | null = null;

        try {
            const ai = new GoogleGenAI({ apiKey: getNextApiKey(), httpOptions: { timeout: 20000 } });
            const result = await ai.models.generateContent({
                model: AI_MODEL,
                contents: promptText,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                    maxOutputTokens: 2048,
                },
            });

            actualTokens = result.usageMetadata?.totalTokenCount ?? null;
            const parsedJson = JSON.parse((result.text || "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
            validatedDraft = rubricFeedbackSchema.parse(parsedJson);
            recordAiSuccess(schoolId);
        } catch (apiError: unknown) {
            recordAiFailure(schoolId);
            throw apiError;
        }

        // Lưu bản nháp vào learning_ai_jobs
        const { data: job, error: jobErr } = await supabase
            .from("learning_ai_jobs")
            .insert({
                school_id: schoolId,
                requested_by: requestedBy,
                kind: "rubric_grading_feedback",
                target_type: "exam_submission",
                target_id: submissionId,
                submission_id: submissionId,
                source_data_hash: sourceHash,
                prompt_version: "rubric-feedback-v1",
                model_name: AI_MODEL,
                status: "ready",
                review_status: "draft", // AI KHÔNG TỰ CÔNG BỐ
                raw_output: validatedDraft,
                estimated_tokens: 1200,
                actual_tokens: actualTokens,
                finished_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (jobErr) {
            return { success: false, error: "Lỗi lưu bản nháp nhận xét: " + jobErr.message };
        }

        if (actualTokens !== null) await recordSchoolAiTokenUsage(schoolId, actualTokens);

        return {
            success: true,
            jobId: job.id,
            draft: validatedDraft,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || "Không thể sinh gợi ý chấm điểm theo Rubric.",
            reason: "AI_FEEDBACK_FAILED",
        };
    }
}

/**
 * TÁC VỤ 3: Gợi ý kế hoạch can thiệp sớm dựa trên dữ liệu chuyên cần & điểm số đã chốt
 */
export async function generateInterventionRecommendationDraft(params: {
    schoolId: string;
    requestedBy: string;
    studentId: string;
    caseId?: string;
    academicSummary: { averageScore: number; recentScores: number[]; failingExamsCount: number };
    attendanceSummary: { unexcusedAbsences: number; totalAbsences: number; attendanceRate: number };
    studentIdentifiers?: { name?: string; studentCode?: string; email?: string; phone?: string };
}): Promise<AiServiceResult<EarlyInterventionRecommendationDraft>> {
    const { schoolId, requestedBy, studentId, caseId, academicSummary, attendanceSummary, studentIdentifiers } = params;

    const quotaCheck = await checkSchoolAiAccess(schoolId, 1000);
    if (!quotaCheck.allowed) {
        return { success: false, reason: quotaCheck.reason, error: quotaCheck.message };
    }

    const { sanitizedData, sourceHash } = sanitizeContextForAI(
        { studentId, academicSummary, attendanceSummary },
        studentIdentifiers
    );

    const supabase = createAdminClient();

    const promptText = `Bạn là chuyên gia tư vấn tâm lý học đường và can thiệp giáo dục sớm. Hãy xem xét các dữ kiện học tập thực tế đã chốt của học sinh sau:
[DỮ LIỆU HỌC TẬP]:
- Điểm trung bình: ${academicSummary.averageScore}
- Điểm gần đây: ${academicSummary.recentScores.join(", ")}
- Số bài kiểm tra dưới trung bình: ${academicSummary.failingExamsCount}
- Số buổi nghỉ không phép: ${attendanceSummary.unexcusedAbsences}
- Tổng số buổi vắng: ${attendanceSummary.totalAbsences}
- Tỷ lệ chuyên cần: ${attendanceSummary.attendanceRate}%

YÊU CẦU BẮT BUỘC:
1. Xác định risk_level ('low', 'medium', 'high') và primary_concern ('attendance', 'academic', 'comprehensive').
2. Đề xuất từ 1 đến 3 hành động can thiệp thiết thực kèm thời hạn theo dõi (target_timeline_days).
3. Viết 1 đoạn văn bản nháp để giáo viên tham khảo khi trao đổi với phụ huynh. Lời văn tôn trọng, đồng hành, hợp tác, không quy chụp.
4. Trả về đúng JSON:
{
  "risk_level": "medium",
  "primary_concern": "attendance",
  "observed_patterns": "Học sinh vắng không phép 3 buổi trong 2 tuần qua...",
  "recommended_actions": [
    {
      "action_type": "parent_consultation",
      "title": "Họp trao đổi trực tiếp với phụ huynh",
      "description": "Tìm hiểu nguyên nhân các buổi vắng và thống nhất biện pháp hỗ trợ",
      "target_timeline_days": 7
    }
  ],
  "parent_communication_draft": "Kính gửi phụ huynh, nhà trường xin gửi thông tin về tình hình học tập và chuyên cần gần đây của em..."
}`;

    try {
        let validatedDraft: EarlyInterventionRecommendationDraft | null = null;
        let actualTokens: number | null = null;

        try {
            const ai = new GoogleGenAI({ apiKey: getNextApiKey(), httpOptions: { timeout: 20000 } });
            const result = await ai.models.generateContent({
                model: AI_MODEL,
                contents: promptText,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                    maxOutputTokens: 2048,
                },
            });

            actualTokens = result.usageMetadata?.totalTokenCount ?? null;
            const parsedJson = JSON.parse((result.text || "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
            validatedDraft = earlyInterventionRecommendationSchema.parse(parsedJson);
            recordAiSuccess(schoolId);
        } catch (apiError: unknown) {
            recordAiFailure(schoolId);
            throw apiError;
        }

        // Lưu bản nháp vào learning_ai_jobs
        const { data: job, error: jobErr } = await supabase
            .from("learning_ai_jobs")
            .insert({
                school_id: schoolId,
                requested_by: requestedBy,
                kind: "early_intervention_recommendation",
                target_type: "intervention_case",
                target_id: caseId || null,
                intervention_case_id: caseId || null,
                source_data_hash: sourceHash,
                prompt_version: "intervention-rec-v1",
                model_name: AI_MODEL,
                status: "ready",
                review_status: "draft", // AI KHÔNG TỰ CÔNG BỐ
                raw_output: validatedDraft,
                estimated_tokens: 1000,
                actual_tokens: actualTokens,
                finished_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (jobErr) {
            return { success: false, error: "Lỗi lưu bản nháp can thiệp sớm: " + jobErr.message };
        }

        if (actualTokens !== null) await recordSchoolAiTokenUsage(schoolId, actualTokens);

        return {
            success: true,
            jobId: job.id,
            draft: validatedDraft,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || "Không thể sinh đề xuất can thiệp sớm.",
            reason: "AI_INTERVENTION_FAILED",
        };
    }
}
