"use server";

import { requireActor, requireClassAccess, requireResourceAccess, requireRecordAccess } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateExam, gradeObjective, publicQuestions, answersSchema, questionSchema } from "@/lib/learning/grading";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createExamSnapshot } from "@/lib/exams/exam-snapshot";
import { checkAttemptEligibility, calculateAttemptExpiry } from "@/lib/exams/attempt-manager";
import { maskSubmissionForRole } from "@/lib/grading/score-visibility";
import { DEFAULT_PILOT_SCHOOL_ID } from "@/lib/auth/actor-context";
import { toStudentExam, toStudentSubmission, isGradePublished } from "@/lib/modules/assessment/dto";

// ============================================================
// TEACHER: CRUD Exams
// ============================================================

export async function createExam(classId: string, data: {
    title: string;
    description?: string;
    questions: any[];
    duration_minutes: number;
    due_date?: string;
    total_points: number;
    is_strict_mode?: boolean;
    strict_mode_limit?: number;
    show_answers?: boolean;
}) {
    try {
        const actor = await requireClassAccess(classId, "teach");
        const {data:examClass,error:classError}=await actor.db.from("classes").select("school_id").eq("id",classId).single();
        if(classError||!examClass?.school_id)throw new Error("Không xác định được trường sở hữu lớp.");

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        validateExam(data.questions, data.total_points);
        const adminSupabase = createAdminClient();
        const { data: exam, error } = await adminSupabase
            .from("exams")
            .insert({
                class_id: classId,
                school_id: examClass.school_id,
                title: data.title,
                description: data.description || "",
                questions: data.questions,
                duration_minutes: data.duration_minutes,
                due_date: data.due_date || null,
                total_points: data.total_points,
                is_published: false,
                publication_status: "draft",
                is_strict_mode: data.is_strict_mode ?? false,
                strict_mode_limit: data.strict_mode_limit ?? 0,
                show_answers: data.show_answers ?? true,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/teacher/classes/${classId}`);
        return { data: exam, error: null };
    } catch (error: any) {
        console.error("Error creating exam:", error);
        return { data: null, error: error.message };
    }
}

export async function updateExam(examId: string, classId: string, data: {
    title: string;
    description?: string;
    questions: any[];
    duration_minutes: number;
    due_date?: string;
    total_points: number;
    is_published?: boolean;
    is_strict_mode?: boolean;
    strict_mode_limit?: number;
    show_answers?: boolean;
}) {
    try {
        await requireClassAccess(classId, "teach"); const access = await requireResourceAccess("exams", examId, "teach"); if (access.resource.class_id !== classId) throw new Error("Sai lớp học.");

        validateExam(data.questions, data.total_points);
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("exams")
            .update({
                title: data.title,
                description: data.description || "",
                questions: data.questions,
                duration_minutes: data.duration_minutes,
                due_date: data.due_date || null,
                total_points: data.total_points,
                is_published: data.is_published ?? access.resource.is_published,
                publication_status: (data.is_published ?? access.resource.is_published) ? "published" : "draft",
                is_strict_mode: data.is_strict_mode ?? false,
                strict_mode_limit: data.strict_mode_limit ?? 0,
                show_answers: data.show_answers ?? true
            })
            .eq("id", examId);

        if (error) throw error;

        revalidatePath(`/teacher/classes/${classId}`);
        revalidatePath(`/student/classes/${classId}`);
        return { error: null };
    } catch (error: any) {
        console.error("Error updating exam:", error);
        return { error: error.message };
    }
}

export async function deleteExam(examId: string, classId: string) {
    try {
        await requireClassAccess(classId, "teach"); const access = await requireResourceAccess("exams", examId, "teach"); if (access.resource.class_id !== classId) throw new Error("Sai lớp học.");

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase.from("exams").delete().eq("id", examId);
        if (error) throw error;

        revalidatePath(`/teacher/classes/${classId}`);
        return { error: null };
    } catch (error: any) {
        console.error("Error deleting exam:", error);
        return { error: error.message };
    }
}

export async function fetchClassExams(classId: string) {
    try {
        await requireClassAccess(classId, "teach");

        // Chỉ lấy cột danh sách đề trong trang chi tiết lớp dùng (bỏ questions_snapshot, description...).
        // Bảng chưa có cột đếm câu hỏi nên vẫn đọc `questions` để đếm, nhưng chỉ trả về question_count.
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("exams")
            .select("id, title, is_published, duration_minutes, total_points, questions")
            .eq("class_id", classId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        const exams = (data || []).map(({ questions, ...exam }) => ({
            ...exam,
            question_count: Array.isArray(questions) ? questions.length : 0,
        }));
        return { data: exams, error: null };
    } catch (error: any) {
        console.error("Error fetching exams:", error);
        return { data: [], error: error.message };
    }
}

/**
 * Đếm số bài nộp đang chờ chấm (grading_status = 'pending') cho từng exam trong lớp.
 * Trả về Map<exam_id, pending_count>
 */
export async function fetchPendingExamGradingStats(classId: string) {
    try {
        await requireClassAccess(classId, "teach");

        const adminSupabase = createAdminClient();

        const { data: examList } = await adminSupabase
            .from("exams")
            .select("id")
            .eq("class_id", classId);

        if (!examList || examList.length === 0) return { data: {}, error: null };

        const examIds = examList.map(e => e.id);

        const { data: pendingSubs, error } = await adminSupabase
            .from("exam_submissions")
            .select("exam_id")
            .in("exam_id", examIds)
            .eq("grading_status", "pending");

        if (error) throw error;

        const countMap: Record<string, number> = {};
        (pendingSubs || []).forEach(s => {
            countMap[s.exam_id] = (countMap[s.exam_id] || 0) + 1;
        });

        return { data: countMap, error: null };
    } catch (error: any) {
        console.error("fetchPendingExamGradingStats error:", error);
        return { data: {}, error: error.message };
    }
}

// ============================================================
// TEACHER: Analytics — Phân tích kết quả bài kiểm tra
// ============================================================

export async function fetchExamAnalytics(examId: string) {
    try {
        await requireResourceAccess("exams", examId, "teach");

        const adminSupabase = createAdminClient();

        // 1. Lấy đề bài
        const { data: exam, error: examError } = await adminSupabase
            .from("exams")
            .select("*")
            .eq("id", examId)
            .single();
        if (examError) throw examError;

        // 2. Lấy tất cả bài nộp
        const { data: submissions, error: subError } = await adminSupabase
            .from("exam_submissions")
            .select("*, student:users!student_id(full_name, email)")
            .eq("exam_id", examId)
            .eq("grading_status", "graded")
            .order("score", { ascending: false });
        if (subError) throw subError;

        const questions = (exam.questions || []) as any[];
        const subs = (submissions || []) as any[];

        // 3. Tính thống kê tổng
        const totalStudents = subs.length;
        const scores = subs.map(s => Number(s.score) || 0);
        const avgScore = totalStudents > 0 ? scores.reduce((a, b) => a + b, 0) / totalStudents : 0;
        const highestScore = totalStudents > 0 ? Math.max(...scores) : 0;
        const lowestScore = totalStudents > 0 ? Math.min(...scores) : 0;
        const avgTime = totalStudents > 0 ? Math.round(subs.reduce((a, s) => a + (s.time_taken_seconds || 0), 0) / totalStudents) : 0;

        // 4. Phân tích từng câu hỏi
        const questionAnalytics = questions.map((q: any, qIdx: number) => {
            let correctCount = 0;
            let wrongCount = 0;
            const optionCounts: Record<string, number> = {};

            // Khởi tạo option counts
            (q.options || []).forEach((opt: any) => {
                optionCounts[opt.id] = 0;
            });

            subs.forEach(sub => {
                const studentAnswers = sub.answers || [];
                const studentAnswer = studentAnswers[qIdx];
                if (studentAnswer?.selectedOptionId) {
                    optionCounts[studentAnswer.selectedOptionId] = (optionCounts[studentAnswer.selectedOptionId] || 0) + 1;
                }
                // Kiểm tra đúng/sai
                const correctOption = (q.options || []).find((o: any) => o.isCorrect);
                if (correctOption && studentAnswer?.selectedOptionId === correctOption.id) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            });

            return {
                questionIndex: qIdx,
                question: q.question,
                options: q.options,
                correctCount,
                wrongCount,
                correctPercent: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0,
                optionCounts,
                tags: q.tags || []
            };
        });

        // 5. Điểm mạnh / yếu (Dựa trên Tag nếu có, nếu không thì theo Câu hỏi)
        const tagMap: Record<string, { correct: number; total: number }> = {};
        
        questionAnalytics.forEach((qa: any) => {
            const tags = qa.tags || [];
            tags.forEach((tag: string) => {
                if (!tagMap[tag]) tagMap[tag] = { correct: 0, total: 0 };
                tagMap[tag].correct += qa.correctCount;
                tagMap[tag].total += totalStudents;
            });
        });

        const tagAnalytics = Object.keys(tagMap).map(tag => {
            const stats = tagMap[tag];
            return {
                name: tag,
                percent: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
                type: 'tag'
            };
        });

        const sortedTags = [...tagAnalytics].sort((a, b) => b.percent - a.percent);
        
        let strengths = [];
        let weaknesses = [];

        if (sortedTags.length > 0) {
            strengths = sortedTags.filter(t => t.percent >= 60).slice(0, 3);
            weaknesses = sortedTags.filter(t => t.percent < 60).slice(-3).reverse();
        } else {
            const sortedByCorrect = [...questionAnalytics].sort((a, b) => b.correctPercent - a.correctPercent);
            strengths = sortedByCorrect.slice(0, 3).filter(q => q.correctPercent >= 60).map(q => ({ name: `Câu ${q.questionIndex + 1}: ${q.question}`, percent: q.correctPercent, type: 'question' }));
            weaknesses = sortedByCorrect.slice(-3).filter(q => q.correctPercent < 60).reverse().map(q => ({ name: `Câu ${q.questionIndex + 1}: ${q.question}`, percent: q.correctPercent, type: 'question' }));
        }

        return {
            data: {
                exam,
                submissions: subs,
                summary: {
                    totalStudents,
                    avgScore: Math.round(avgScore * 10) / 10,
                    highestScore,
                    lowestScore,
                    avgTimeSeconds: avgTime,
                    passCount: subs.filter(s => (Number(s.score) || 0) >= (exam.total_points * 0.5)).length
                },
                questionAnalytics,
                strengths,
                weaknesses
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error fetching exam analytics:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// STUDENT: Fetch Exams & Submit
// ============================================================

export async function fetchStudentExams(classId: string) {
    try {
        await requireClassAccess(classId, "learn");

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy exams đã publish
        const { data: exams, error } = await adminSupabase
            .from("exams")
            .select("id, title, description, duration_minutes, due_date, total_points, is_published, publication_status, max_attempts, created_at")
            .eq("class_id", classId)
            .eq("is_published", true).eq("publication_status", "published")
            .order("created_at", { ascending: false });
        if (error) throw error;

        // Lấy submissions của student
        const examIds = (exams || []).map(e => e.id);
        let submissions: any[] = [];
        if (examIds.length > 0) {
            const { data } = await adminSupabase
                .from("exam_submissions")
                .select("id, exam_id, score, total_points, submitted_at, time_taken_seconds, grading_status, status")
                .eq("student_id", user.id)
                .in("exam_id", examIds)
                .order("submitted_at", { ascending: false });
            if (data) submissions = data;
        }

        // Merge và áp dụng mặt nạ bảo mật điểm số (Score Visibility Gate)
        const enriched = (exams || []).map(exam => {
            const rawSub = (submissions || []).find(s => s.exam_id === exam.id);
            const maskedSub = rawSub ? maskSubmissionForRole(rawSub, 'student') : null;
            return { ...exam, submission: maskedSub };
        });

        return { data: enriched, error: null };
    } catch (error: any) {
        console.error("Error fetching student exams:", error);
        return { data: [], error: error.message };
    }
}

export async function fetchExamQuestions(examId: string, _studentId?: string) {
    try {
        const { id, db, resource: exam } = await requireResourceAccess("exams", examId);
        const { data: sub } = await db.from("exam_submissions").select("id, attempt_id, grading_status").eq("exam_id", examId).eq("student_id", id).order("submitted_at", { ascending:false }).limit(1).maybeSingle();
        const { data: attempt } = await db.from("exam_attempts").select("snapshot").eq("exam_id", examId).eq("student_id", id).order("attempt_no", { ascending: false }).limit(1).maybeSingle();
        const questions = z.array(questionSchema).parse(attempt?.snapshot?.questions || exam.questions_snapshot?.questions || exam.questions);
        const isGradedAndAllowed = Boolean(sub && isGradePublished(sub.grading_status));
        return { data: toStudentExam(exam, questions, isGradedAndAllowed), error: null };
    } catch {
        return { data: null, error: "Không thể tải đề hoặc bạn không có quyền truy cập." };
    }
}

export async function submitExamAnswers(examId: string, classId: string, answers: unknown, _startedAt: string, _timeTaken: number, attemptId?: string) {
    try {
        const { id, db, resource: exam } = await requireResourceAccess("exams", examId, "learn");
        if (exam.class_id !== classId || !attemptId) throw new Error("Lần làm bài không hợp lệ.");

        const { data: attempt, error } = await db.from("exam_attempts").select("*").eq("id", attemptId).eq("student_id", id).eq("exam_id", examId).single();
        if (error || !attempt) throw new Error("Không tìm thấy lần làm bài.");

        const questions = validateExam(attempt.snapshot.questions, attempt.snapshot.total_points);
        const checked = gradeObjective(questions, answers);

        const { data: submission, error: submitError } = await db.rpc("submit_learning_exam", {
            p_student: id,
            p_attempt: attemptId,
            p_answers: checked.answers
        });
        if (submitError) throw submitError;

        revalidatePath('/student/classes/' + classId);
        revalidatePath('/teacher/classes/' + classId);

        const isPublished = isGradePublished(submission.grading_status);
        return {
            data: {
                submission: toStudentSubmission(submission),
                score: isPublished ? submission.score : null,
                totalPoints: submission.total_points,
                questions: publicQuestions(questions, isPublished && exam.show_answers === true)
            },
            error: null
        };
    } catch (err: any) {
        return { data: null, error: err.message || "Không thể nộp bài. Bản nháp đã lưu vẫn được giữ; vui lòng thử lại." };
    }
}

export async function saveManualGrades(submissionId: string, newTotalScore: number, reason = "Giáo viên duyệt điểm", rubricGrades: unknown = null) {
    const { gradeExamSubmission } = await import("@/lib/actions/grading");
    return gradeExamSubmission({ submissionId, newScore: newTotalScore, reason, rubricGrades: rubricGrades as Record<string, unknown> | null, publishNow: true });
}

export async function beginExamAttempt(examId: string) {
    try {
        const { id, db, resource: exam } = await requireResourceAccess("exams", examId, "learn");
        validateExam(exam.questions, exam.total_points);
        const { data: attempt, error } = await db.rpc("begin_school_exam", { p_student:id, p_exam:examId });
        if (error || !attempt) throw error || new Error("Không thể mở lượt làm bài.");
        return { data: { id:attempt.id as string, started_at:attempt.started_at as string, expires_at:attempt.expires_at as string,
            draft_answers:answersSchema.parse(attempt.draft_answers), draft_version:Number(attempt.draft_version),
            questions:publicQuestions(z.array(questionSchema).parse(attempt.snapshot.questions)),
            total_points:Number(attempt.snapshot.total_points), attempt_no:Number(attempt.attempt_no) }, error:null };
    } catch { return { data:null, error:"Không thể mở lượt làm bài. Kiểm tra hạn nộp và số lần được phép làm." }; }
}

export async function saveExamDraft(attemptId: string, input: unknown, version: number) {
    try {
        const actor = await requireActor(["student"]);
        const answers = answersSchema.parse(input);

        const { data: attempt } = await actor.db
            .from("exam_attempts")
            .select("exam_id, snapshot, expires_at")
            .eq("id", attemptId)
            .eq("student_id", actor.id)
            .single();

        if (!attempt) throw new Error("Không tìm thấy bài.");
        await requireResourceAccess("exams", attempt.exam_id, "learn");

        if (answers.length > attempt.snapshot.questions.length) {
            throw new Error("Sai số câu trả lời.");
        }

        const now = new Date().toISOString();
        const { data, error } = await actor.db
            .from("exam_attempts")
            .update({ draft_answers: answers, draft_version: version + 1 })
            .eq("id", attemptId)
            .eq("student_id", actor.id)
            .eq("draft_version", version)
            .is("submitted_at", null)
            .gt("expires_at", now)
            .select("draft_version")
            .maybeSingle();

        if (error || !data) {
            return { error: "Bản nháp đã thay đổi ở nơi khác hoặc bài đã hết giờ.", version };
        }
        return { error: null, version: data.draft_version };
    } catch {
        return { error: "Chưa lưu được bản nháp. Kiểm tra kết nối mạng.", version };
    }
}

