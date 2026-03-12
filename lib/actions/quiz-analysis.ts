"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationToStudentAndParents } from "@/lib/notifications/send-notification";

// ============================================================
// TEACHER: Fetch & Manage AI Analysis
// ============================================================

export async function fetchClassAnalysis(examId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("quiz_class_analysis")
            .select("*")
            .eq("exam_id", examId)
            .single();

        if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
        return { data: data || null, error: null };
    } catch (error: any) {
        console.error("Error fetching class analysis:", error);
        return { data: null, error: error.message };
    }
}

export async function fetchIndividualAnalyses(examId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("*, student:users!student_id(id, full_name, email)")
            .eq("exam_id", examId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Error fetching individual analyses:", error);
        return { data: [], error: error.message };
    }
}

export async function fetchIndividualAnalysesWithProgress(examId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("*, student:users!student_id(id, full_name, email), improvement_progress(*)")
            .eq("exam_id", examId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Error fetching analyses with progress:", error);
        return { data: [], error: error.message };
    }
}

export async function fetchStudentFeedback(examId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy submission của học sinh
        const { data: submission } = await adminSupabase
            .from("exam_submissions")
            .select("id")
            .eq("exam_id", examId)
            .eq("student_id", user.id)
            .single();

        if (!submission) return { data: null, error: "Không tìm thấy bài nộp" };

        // Lấy analysis đã gửi
        const { data: analysis, error } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("*")
            .eq("submission_id", submission.id)
            .eq("status", "sent")
            .single();

        if (error && error.code !== "PGRST116") throw error;
        if (!analysis) return { data: null, error: null };

        // Lấy improvement progress
        const { data: progress } = await adminSupabase
            .from("improvement_progress")
            .select("*")
            .eq("analysis_id", analysis.id)
            .eq("student_id", user.id)
            .order("task_index", { ascending: true });

        return { data: { ...analysis, progress: progress || [] }, error: null };
    } catch (error: any) {
        console.error("Error fetching student feedback:", error);
        return { data: null, error: error.message };
    }
}

export async function approveAnalysis(analysisId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("quiz_individual_analysis")
            .update({ status: "approved" })
            .eq("id", analysisId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function editAnalysis(analysisId: string, data: {
    feedback?: string;
    tasks?: any[];
    deadline?: string;
}) {
    try {
        const adminSupabase = createAdminClient();

        // Lấy thông tin bài kiểm tra để lấy user_id và title cho notification
        const { data: analysis } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("*, exams:exam_id(title, class_id)")
            .eq("id", analysisId)
            .single();

        const updateData: any = { status: "edited" };
        if (data.feedback !== undefined) updateData.teacher_edited_feedback = data.feedback;
        if (data.tasks !== undefined) updateData.teacher_edited_tasks = data.tasks;
        if (data.deadline !== undefined) updateData.deadline = data.deadline;

        const { error } = await adminSupabase
            .from("quiz_individual_analysis")
            .update(updateData)
            .eq("id", analysisId);

        if (error) throw error;

        // Gửi notification cho phụ huynh và học sinh
        if (analysis) {
            const examTitle = Array.isArray(analysis.exams) ? analysis.exams[0]?.title : analysis.exams?.title;
            const classId = Array.isArray(analysis.exams) ? analysis.exams[0]?.class_id : analysis.exams?.class_id;

            await sendNotificationToStudentAndParents({
                studentId: analysis.student_id,
                title: "📝 Nhận xét & Đề xuất học tập mới",
                message: `Giáo viên vừa đánh giá và giao lộ trình cải thiện cho bài kiểm tra "${examTitle || 'gần đây'}".`,
                type: "feedback",
                link: `/parent/children/${analysis.student_id}/progress`,
                metadata: { analysisId: analysis.id, classId },
            });
        }

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateImprovementProgress(
    progressId: string,
    status: string,
    quizData?: { quiz_score: number; quiz_total: number; quiz_answers: Record<string, string> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const updateData: any = { status };
        if (status === "completed") updateData.completed_at = new Date().toISOString();
        if (quizData) {
            updateData.quiz_score = quizData.quiz_score;
            updateData.quiz_total = quizData.quiz_total;
            updateData.quiz_answers = quizData.quiz_answers;
        }

        const { error } = await adminSupabase
            .from("improvement_progress")
            .update(updateData)
            .eq("id", progressId)
            .eq("student_id", user.id);

        if (error) throw error;

        // === Tự động thông báo cho giáo viên khi HS hoàn thành task ===
        if (status === "completed") {
            try {
                // Lấy thông tin progress → analysis → exam → class → teacher
                const { data: prog } = await adminSupabase
                    .from("improvement_progress")
                    .select("analysis_id, task_index")
                    .eq("id", progressId)
                    .single();

                if (prog) {
                    const { data: analysis } = await adminSupabase
                        .from("quiz_individual_analysis")
                        .select("id, student_id, exam_id")
                        .eq("id", prog.analysis_id)
                        .single();

                    if (analysis) {
                        // Lấy thông tin student, exam, class
                        const [{ data: student }, { data: exam }] = await Promise.all([
                            adminSupabase.from("users").select("full_name").eq("id", analysis.student_id).single(),
                            adminSupabase.from("exams").select("title, class_id").eq("id", analysis.exam_id).single(),
                        ]);

                        if (exam?.class_id) {
                            const { data: cls } = await adminSupabase
                                .from("classes").select("teacher_id").eq("id", exam.class_id).single();

                            if (cls?.teacher_id) {
                                // Kiểm tra tất cả tasks đã hoàn thành chưa
                                const { data: allProgress } = await adminSupabase
                                    .from("improvement_progress")
                                    .select("status")
                                    .eq("analysis_id", prog.analysis_id);

                                const allDone = allProgress?.every((p: any) => p.status === "completed");
                                const doneCount = allProgress?.filter((p: any) => p.status === "completed").length || 0;
                                const totalCount = allProgress?.length || 0;
                                const studentName = student?.full_name || "Học sinh";
                                const examTitle = exam?.title || "bài kiểm tra";

                                const message = allDone
                                    ? `🎉 ${studentName} đã hoàn thành TẤT CẢ ${totalCount} bài tập cải thiện cho "${examTitle}". Điểm quiz: ${quizData?.quiz_score ?? 0}/${quizData?.quiz_total ?? 0}`
                                    : `📝 ${studentName} hoàn thành bài tập ${doneCount}/${totalCount} cho "${examTitle}". Điểm quiz: ${quizData?.quiz_score ?? 0}/${quizData?.quiz_total ?? 0}`;

                                await adminSupabase.from("notifications").insert({
                                    user_id: cls.teacher_id,
                                    title: allDone ? "✅ Học sinh hoàn thành tất cả bài tập" : "📊 Cập nhật tiến độ học sinh",
                                    message,
                                    type: "student_progress",
                                    link: `/teacher/classes/${exam.class_id}/exams/${analysis.exam_id}/analytics`,
                                    is_read: false,
                                });
                            }
                        }
                    }
                }
            } catch (notifyErr: any) {
                console.error("Lỗi gửi notification cho GV:", notifyErr.message);
                // Không throw — notification failure không ảnh hưởng kết quả chính
            }
        }

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================================
// STUDENT: Supplementary Quizzes
// ============================================================

export async function fetchSupplementaryQuizzes(examId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("supplementary_quizzes")
            .select("*")
            .eq("exam_id", examId)
            .eq("student_id", user.id)
            .neq("status", "draft")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        return { data: [], error: error.message };
    }
}

export async function submitSupplementaryQuiz(
    quizId: string,
    answers: Record<string, string>
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy quiz để tính điểm
        const { data: quiz } = await adminSupabase
            .from("supplementary_quizzes")
            .select("*")
            .eq("id", quizId)
            .eq("student_id", user.id)
            .single();

        if (!quiz) return { success: false, error: "Không tìm thấy bài quiz" };

        // Tách MCQ vs Essay answers
        const questions = quiz.questions || [];
        const mcqAnswers: Record<string, string> = {};
        const essayAnswers: Record<string, string> = {};

        questions.forEach((q: any) => {
            if (q.type === 'essay') {
                essayAnswers[q.id] = answers[q.id] || "";
            } else {
                mcqAnswers[q.id] = answers[q.id] || "";
            }
        });

        // Tính điểm MCQ
        let score = 0;
        const mcqQuestions = questions.filter((q: any) => q.type !== 'essay');
        mcqQuestions.forEach((q: any) => {
            if (mcqAnswers[q.id] === q.correct) score++;
        });

        const { error } = await adminSupabase
            .from("supplementary_quizzes")
            .update({
                student_answers: mcqAnswers,
                essay_answers: essayAnswers,
                score,
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("id", quizId)
            .eq("student_id", user.id);

        if (error) throw error;

        // === Tự động thông báo cho giáo viên khi HS nộp bài bổ trợ ===
        try {
            if (quiz.teacher_id) {
                const { data: student } = await adminSupabase
                    .from("users").select("full_name").eq("id", user.id).single();

                const studentName = student?.full_name || "Học sinh";
                const essayCount = Object.keys(essayAnswers).filter(k => essayAnswers[k]?.trim()).length;

                let message = `${studentName} đã hoàn thành bài bổ trợ "${quiz.title}". Trắc nghiệm: ${score}/${mcqQuestions.length}`;
                if (essayCount > 0) {
                    message += `. Có ${essayCount} câu tự luận cần chấm.`;
                }

                await adminSupabase.from("notifications").insert({
                    user_id: quiz.teacher_id,
                    title: "📝 Học sinh nộp bài bổ trợ",
                    message,
                    type: "student_progress",
                    link: quiz.exam_id
                        ? `/teacher/classes/${quiz.exam?.class_id || ""}/exams/${quiz.exam_id}/analytics`
                        : "/teacher",
                    is_read: false,
                });
            }
        } catch (notifyErr: any) {
            console.error("Lỗi gửi notification cho GV (supplementary):", notifyErr.message);
        }

        return { success: true, score, total: mcqQuestions.length, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// ============================================================
// TEACHER: Save & Send Supplementary Quiz
// ============================================================

export async function saveSupplementaryQuizDraft(data: {
    analysisId: string;
    examId: string;
    studentId: string;
    title: string;
    questions: any[];
    quizId?: string; // nếu đã có thì update
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        if (data.quizId) {
            // Update existing
            const { data: updated, error } = await adminSupabase
                .from("supplementary_quizzes")
                .update({
                    title: data.title,
                    questions: data.questions,
                    total_questions: data.questions.length,
                })
                .eq("id", data.quizId)
                .select()
                .single();
            if (error) throw error;
            return { data: updated, error: null };
        } else {
            // Insert new
            const { data: created, error } = await adminSupabase
                .from("supplementary_quizzes")
                .insert({
                    analysis_id: data.analysisId,
                    exam_id: data.examId,
                    student_id: data.studentId,
                    teacher_id: user.id,
                    title: data.title,
                    questions: data.questions,
                    total_questions: data.questions.length,
                    status: 'draft'
                })
                .select()
                .single();
            if (error) throw error;
            return { data: created, error: null };
        }
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function sendSupplementaryQuiz(quizId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { data: quiz, error: fetchError } = await adminSupabase
            .from("supplementary_quizzes")
            .select("*, exam:exams!exam_id(title, class_id)")
            .eq("id", quizId)
            .single();

        if (fetchError || !quiz) return { success: false, error: "Không tìm thấy bài tập" };

        // Update status
        const { error } = await adminSupabase
            .from("supplementary_quizzes")
            .update({ status: 'pending', sent_at: new Date().toISOString() })
            .eq("id", quizId);

        if (error) throw error;

        // Gửi notification
        const examObj = Array.isArray(quiz.exam) ? quiz.exam[0] : quiz.exam;
        await adminSupabase.from("notifications").insert({
            user_id: quiz.student_id,
            title: "📝 Bài tập bổ trợ mới",
            message: `Giáo viên gửi bài tập bổ trợ "${quiz.title}" với ${quiz.total_questions} câu hỏi. Hãy làm bài ngay!`,
            type: "quiz_feedback",
            link: `/student/classes/${examObj?.class_id || ''}/exams/${quiz.exam_id}/feedback`,
            is_read: false
        });

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

