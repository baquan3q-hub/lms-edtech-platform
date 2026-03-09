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
    total_points: number;
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
                total_points: data.total_points,
                is_published: false,
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
    total_points: number;
    is_published?: boolean;
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
                total_points: data.total_points,
                is_published: data.is_published ?? false
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
                optionCounts
            };
        });

        // 5. Điểm mạnh / yếu
        const sortedByCorrect = [...questionAnalytics].sort((a, b) => b.correctPercent - a.correctPercent);
        const strengths = sortedByCorrect.slice(0, 3).filter(q => q.correctPercent >= 60);
        const weaknesses = sortedByCorrect.slice(-3).filter(q => q.correctPercent < 60).reverse();

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
            .select("id, title, description, duration_minutes, total_points, is_published, created_at")
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

export async function fetchExamQuestions(examId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data: exam, error } = await adminSupabase
            .from("exams")
            .select("id, title, description, questions, duration_minutes, total_points")
            .eq("id", examId)
            .eq("is_published", true)
            .single();

        if (error) throw error;

        // Strip isCorrect from options to prevent cheating
        const safeQuestions = ((exam.questions || []) as any[]).map((q: any) => ({
            ...q,
            options: (q.options || []).map((o: any) => ({ id: o.id, text: o.text }))
        }));

        return {
            data: { ...exam, questions: safeQuestions },
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
            .select("questions, total_points")
            .eq("id", examId)
            .single();

        if (!exam) return { data: null, error: "Không tìm thấy bài kiểm tra." };

        const questions = (exam.questions || []) as any[];
        let score = 0;
        questions.forEach((q: any, idx: number) => {
            const correctOption = (q.options || []).find((o: any) => o.isCorrect);
            const studentAnswer = answers[idx];
            if (studentAnswer?.selectedOptionId === correctOption?.id) {
                score += (q.points || 1);
            }
        });

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
                time_taken_seconds: timeTaken
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/student/classes/${classId}`);
        revalidatePath(`/teacher/classes/${classId}`);

        return { data: { submission, score, totalPoints: exam.total_points }, error: null };
    } catch (error: any) {
        console.error("Error submitting exam:", error);
        return { data: null, error: error.message };
    }
}
