"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================
// TEACHER: CRUD Homework
// ============================================================

export async function createHomework(classId: string, data: {
    title: string;
    description?: string;
    questions: any[];
    total_points: number;
    due_date?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        const { data: hw, error } = await adminSupabase
            .from("homework")
            .insert({
                class_id: classId,
                title: data.title,
                description: data.description || "",
                questions: data.questions,
                total_points: data.total_points,
                due_date: data.due_date || null,
                is_published: false,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        revalidatePath(`/teacher/classes/${classId}`);
        return { data: hw, error: null };
    } catch (error: any) {
        console.error("createHomework error:", error);
        return { data: null, error: error.message };
    }
}

export async function updateHomework(homeworkId: string, classId: string, data: {
    title: string;
    description?: string;
    questions: any[];
    total_points: number;
    due_date?: string;
    is_published?: boolean;
}) {
    try {
        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from("homework")
            .update({
                title: data.title,
                description: data.description || "",
                questions: data.questions,
                total_points: data.total_points,
                due_date: data.due_date || null,
                is_published: data.is_published ?? false,
                updated_at: new Date().toISOString(),
            })
            .eq("id", homeworkId);

        if (error) throw error;
        revalidatePath(`/teacher/classes/${classId}`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("updateHomework error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteHomework(homeworkId: string, classId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase.from("homework").delete().eq("id", homeworkId);
        if (error) throw error;
        revalidatePath(`/teacher/classes/${classId}`);
        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchClassHomework(classId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("homework")
            .select("*")
            .eq("class_id", classId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function fetchHomeworkDetail(homeworkId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("homework")
            .select("*")
            .eq("id", homeworkId)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

// ============================================================
// TEACHER: Xem & Chấm bài nộp
// ============================================================

export async function fetchHomeworkSubmissions(homeworkId: string) {
    try {
        const adminSupabase = createAdminClient();

        const { data: hw } = await adminSupabase
            .from("homework")
            .select("*")
            .eq("id", homeworkId)
            .single();

        const { data: submissions, error } = await adminSupabase
            .from("homework_submissions")
            .select(`
                *,
                student:users!homework_submissions_student_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq("homework_id", homeworkId)
            .order("submitted_at", { ascending: false });

        if (error) throw error;
        return { data: { homework: hw, submissions: submissions || [] }, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function gradeSubmission(submissionId: string, data: {
    score: number;
    feedback?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from("homework_submissions")
            .update({
                score: data.score,
                feedback: data.feedback || "",
                status: "graded",
                graded_at: new Date().toISOString(),
                graded_by: user.id,
            })
            .eq("id", submissionId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================================
// STUDENT: Xem & Nộp bài tập
// ============================================================

export async function fetchStudentHomework(classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Lấy bài tập đã publish
        const { data: homeworkList, error } = await adminSupabase
            .from("homework")
            .select("*")
            .eq("class_id", classId)
            .eq("is_published", true)
            .order("due_date", { ascending: true });

        if (error) throw error;

        // Lấy submissions của student
        const hwIds = (homeworkList || []).map((h: any) => h.id);
        let submissions: any[] = [];
        if (hwIds.length > 0) {
            const { data: subs } = await adminSupabase
                .from("homework_submissions")
                .select("*")
                .eq("student_id", user.id)
                .in("homework_id", hwIds);
            submissions = subs || [];
        }

        // Gắn submission vào homework
        const result = (homeworkList || []).map((hw: any) => ({
            ...hw,
            submission: submissions.find((s: any) => s.homework_id === hw.id) || null,
        }));

        return { data: result, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function submitHomework(homeworkId: string, answers: any[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Bạn chưa đăng nhập." };
        }

        const adminSupabase = createAdminClient();

        // 1. Fetch homework details for auto-grading
        const { data: homework, error: hwError } = await adminSupabase
            .from("homework")
            .select("questions")
            .eq("id", homeworkId)
            .single();

        if (hwError || !homework) {
            return { error: "Không tìm thấy bài tập." };
        }

        const questions = homework.questions as any[] || [];
        
        let autoScore = 0;
        let requiresManualGrading = false;

        // 2. Process answers and auto-grade MCQs
        const processedAnswers = answers.map((answer: any) => {
            const question = questions.find((q: any) => q.id === answer.question_id);
            if (!question) return answer;

            if (question.type === 'multiple_choice') {
                const correctOption = question.options?.find((opt: any) => opt.isCorrect);
                if (correctOption && answer.selected_option_id === correctOption.id) {
                    autoScore += Number(question.points) || 0;
                }
            } else {
                requiresManualGrading = true;
            }

            return answer;
        });

        // 3. Determine submission status
        // If there are manual grading questions, status remains 'submitted' pending teacher review
        // If all are MCQs, status is automatically 'graded'
        const finalStatus = requiresManualGrading ? 'submitted' : 'graded';
        const gradedAt = requiresManualGrading ? null : new Date().toISOString();

        // 4. Check if a submission already exists to handle multiple attempts
        const { data: existingSubmission, error: existingError } = await adminSupabase
            .from("homework_submissions")
            .select("*")
            .eq("homework_id", homeworkId)
            .eq("student_id", user.id)
            .maybeSingle();

        if (existingError) {
             console.error("Lỗi khi kiểm tra bài nộp hiện tại:", existingError);
             return { error: existingError.message };
        }

        if (existingSubmission) {
            // Push current state into attempt_history
            const currentHistory = Array.isArray(existingSubmission.attempt_history) 
                ? existingSubmission.attempt_history 
                : [];
            
            const historyEntry = {
                answers: existingSubmission.answers,
                score: existingSubmission.score,
                status: existingSubmission.status,
                submitted_at: existingSubmission.submitted_at,
                graded_at: existingSubmission.graded_at,
                feedback: existingSubmission.feedback,
            };

            const updatedHistory = [...currentHistory, historyEntry];
            const newAttemptsCount = (existingSubmission.attempts || 1) + 1;

            const { data, error } = await adminSupabase
                .from("homework_submissions")
                .update({
                    answers: processedAnswers,
                    score: autoScore,
                    status: finalStatus,
                    submitted_at: new Date().toISOString(),
                    graded_at: gradedAt,
                    attempts: newAttemptsCount,
                    attempt_history: updatedHistory
                })
                .eq("id", existingSubmission.id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
            
        } else {
            // First time submission
            const { data, error } = await adminSupabase
                .from("homework_submissions")
                .insert({
                    homework_id: homeworkId,
                    student_id: user.id,
                    answers: processedAnswers,
                    score: autoScore,
                    status: finalStatus,
                    submitted_at: new Date().toISOString(),
                    graded_at: gradedAt,
                    attempts: 1,
                    attempt_history: []
                })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        }

    } catch (error: any) {
        console.error("Lỗi nộp bài tập:", error);
        return { error: error.message };
    }
}
