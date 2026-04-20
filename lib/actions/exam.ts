"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data: exam, error } = await adminSupabase
            .from("exams")
            .insert({
                class_id: classId,
                title: data.title,
                description: data.description || "",
                questions: data.questions,
                duration_minutes: data.duration_minutes,
                due_date: data.due_date || null,
                total_points: data.total_points,
                is_published: false,
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
                is_published: data.is_published ?? false,
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
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("exams")
            .select("*")
            .eq("class_id", classId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
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
                if (studentAnswer?.selectedOptionId === correctOption?.id) {
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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy exams đã publish
        const { data: exams, error } = await adminSupabase
            .from("exams")
            .select("id, title, description, duration_minutes, due_date, total_points, is_published, created_at")
            .eq("class_id", classId)
            .eq("is_published", true)
            .order("created_at", { ascending: false });
        if (error) throw error;

        // Lấy submissions của student
        const examIds = (exams || []).map(e => e.id);
        let submissions: any[] = [];
        if (examIds.length > 0) {
            const { data } = await adminSupabase
                .from("exam_submissions")
                .select("exam_id, score, total_points, submitted_at, time_taken_seconds")
                .eq("student_id", user.id)
                .in("exam_id", examIds);
            if (data) submissions = data;
        }

        // Merge
        const enriched = (exams || []).map(exam => {
            const sub = (submissions || []).find(s => s.exam_id === exam.id);
            return { ...exam, submission: sub || null };
        });

        return { data: enriched, error: null };
    } catch (error: any) {
        console.error("Error fetching student exams:", error);
        return { data: [], error: error.message };
    }
}

export async function fetchExamQuestions(examId: string, studentId?: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data: exam, error } = await adminSupabase
            .from("exams")
            .select("id, title, description, questions, duration_minutes, due_date, total_points, show_answers, is_strict_mode, strict_mode_limit")
            .eq("id", examId)
            .eq("is_published", true)
            .single();

        if (error) throw error;

        let hasSubmitted = false;
        if (studentId) {
             const { data: existing } = await adminSupabase
                .from("exam_submissions")
                .select("id")
                .eq("exam_id", examId)
                .eq("student_id", studentId)
                .single();
            if (existing) hasSubmitted = true;
        }

        // Strip isCorrect from options to prevent cheating if not submitted
        let finalQuestions = exam.questions;
        if (!hasSubmitted) {
            finalQuestions = ((exam.questions || []) as any[]).map((q: any) => ({
                ...q,
                options: (q.options || []).map((o: any) => ({ id: o.id, text: o.text }))
            }));
        }

        return {
            data: { ...exam, questions: finalQuestions },
            error: null
        };
    } catch (error: any) {
        console.error("Error fetching exam questions:", error);
        return { data: null, error: error.message };
    }
}

export async function submitExamAnswers(examId: string, classId: string, answers: any[], startedAt: string, timeTaken: number) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Kiểm tra đã nộp chưa
        const { data: existing } = await adminSupabase
            .from("exam_submissions")
            .select("id")
            .eq("exam_id", examId)
            .eq("student_id", user.id)
            .single();

        if (existing) return { data: null, error: "Bạn đã nộp bài kiểm tra này rồi." };

        // Lấy đề để chấm
        const { data: exam } = await adminSupabase
            .from("exams")
            .select("questions, total_points, title")
            .eq("id", examId)
            .single();

        if (!exam) return { data: null, error: "Không tìm thấy bài kiểm tra." };

        const questions = (exam.questions || []) as any[];
        let score = 0;
        let hasEssay = false;

        questions.forEach((q: any, idx: number) => {
            if (q.type !== "ESSAY") {
                const correctOption = (q.options || []).find((o: any) => o.isCorrect);
                const studentAnswer = answers[idx];
                if (studentAnswer?.selectedOptionId === correctOption?.id) {
                    score += (q.points || 1);
                }
            } else {
                hasEssay = true;
            }
        });

        const gradingStatus = hasEssay ? 'pending' : 'graded';

        // Lưu bài nộp
        const { data: submission, error } = await adminSupabase
            .from("exam_submissions")
            .insert({
                exam_id: examId,
                student_id: user.id,
                answers,
                score,
                total_points: exam.total_points,
                started_at: startedAt,
                submitted_at: new Date().toISOString(),
                time_taken_seconds: timeTaken,
                grading_status: gradingStatus
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/student/classes/${classId}`);
        revalidatePath(`/teacher/classes/${classId}`);

        // Gửi notification cho GV nếu có câu tự luận cần chấm
        if (hasEssay) {
            try {
                const { data: classData } = await adminSupabase
                    .from("classes")
                    .select("teacher_id")
                    .eq("id", classId)
                    .single();

                const { data: studentData } = await adminSupabase
                    .from("users")
                    .select("full_name")
                    .eq("id", user.id)
                    .single();

                if (classData?.teacher_id) {
                    await adminSupabase.from("notifications").insert({
                        user_id: classData.teacher_id,
                        title: `📚 Bài KT cần chấm: ${exam.title || 'Bài kiểm tra'}`,
                        message: `Học sinh ${studentData?.full_name || 'N/A'} đã nộp bài kiểm tra "${exam.title}" có câu tự luận cần giáo viên chấm điểm thủ công.`,
                        type: "warning",
                        read: false,
                    });
                }
            } catch (notifErr) {
                console.error("Lỗi gửi notification cho GV (exam):", notifErr);
            }
        }

        return { data: { submission, score, totalPoints: exam.total_points }, error: null };
    } catch (error: any) {
        console.error("Error submitting exam:", error);
        return { data: null, error: error.message };
    }
}

export async function saveManualGrades(submissionId: string, newTotalScore: number) {
    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("exam_submissions")
            .update({ 
                score: newTotalScore, 
                grading_status: 'graded' 
            })
            .eq("id", submissionId);
            
        if (error) throw error;
        
        return { success: true, error: null };
    } catch (err: any) {
        console.error("Error saving manual grades:", err);
        return { success: false, error: err.message };
    }
}
