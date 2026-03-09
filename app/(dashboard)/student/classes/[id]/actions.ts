"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Đánh dấu một bài học là đã hoàn thành (hoặc cập nhật điểm số nếu có)
 */
export async function markItemCompleted(classId: string, itemId: string, score: number | null = null) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Vui lòng đăng nhập" };
        }

        const adminSupabase = createAdminClient();

        // Kiểm tra xem đã có bản ghi progress chưa
        const { data: existingProgress } = await adminSupabase
            .from('student_progress')
            .select('*')
            .eq('student_id', user.id)
            .eq('item_id', itemId)
            .single();

        let progressError;

        if (existingProgress) {
            // Update
            const { error } = await adminSupabase
                .from('student_progress')
                .update({
                    status: 'completed',
                    completed_at: existingProgress.completed_at || new Date().toISOString(),
                    last_accessed: new Date().toISOString(),
                    score: score !== null ? score : existingProgress.score,
                    attempts: existingProgress.attempts + 1
                })
                .eq('id', existingProgress.id);
            progressError = error;
        } else {
            // Insert
            const { error } = await adminSupabase
                .from('student_progress')
                .insert({
                    student_id: user.id,
                    item_id: itemId,
                    status: 'completed',
                    score: score,
                    attempts: 1,
                    last_accessed: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                });
            progressError = error;
        }

        if (progressError) {
            console.error("Lỗi khi cập nhật tiến độ:", progressError);
            return { error: "Không thể cập nhật tiến độ học tập" };
        }

        // Revalidate cache
        revalidatePath(`/student/classes/${classId}/learn`);
        revalidatePath(`/student/classes/${classId}/learn/${itemId}`);

        return { success: true };

    } catch (err: any) {
        console.error("Lỗi server markItemCompleted:", err);
        return { error: "Đã có lỗi xảy ra" };
    }
}

/**
 * Lấy danh sách câu hỏi của bài Quiz
 * Ưu tiên từ quiz_data (JSONB) trong item_contents
 * Fallback sang bảng quiz_questions nếu quiz_data trống
 * Ẩn đáp án đúng (isCorrect) trước khi gửi cho client
 */
export async function getQuizQuestions(itemId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Vui lòng đăng nhập" };
        }

        const adminSupabase = createAdminClient();

        // 1. Thử lấy từ item_contents.quiz_data (của Quiz Builder mới)
        const { data: itemContent } = await adminSupabase
            .from('item_contents')
            .select('quiz_data')
            .eq('item_id', itemId)
            .single();

        if (itemContent?.quiz_data && Array.isArray(itemContent.quiz_data) && itemContent.quiz_data.length > 0) {
            // quiz_data format: [{ id, question, options: [{ id, text, isCorrect }], points }]
            // ẨN isCorrect trước khi gửi cho client
            const safeQuestions = itemContent.quiz_data.map((q: any, index: number) => ({
                id: q.id,
                content: q.question,
                options: (q.options || []).map((opt: any) => ({
                    id: opt.id,
                    text: opt.text
                    // KHÔNG gửi isCorrect cho client
                })),
                points: q.points || 1,
                order_index: index
            }));

            return { questions: safeQuestions };
        }

        // 2. Fallback: Lấy từ bảng quiz_questions (schema cũ)
        const { data: questions, error } = await adminSupabase
            .from('quiz_questions')
            .select('id, content, options, points, order_index')
            .eq('item_id', itemId)
            .order('order_index', { ascending: true });

        if (error) {
            return { error: error.message };
        }

        return { questions: questions || [] };
    } catch (err: any) {
        console.error("Lỗi server getQuizQuestions:", err);
        return { error: "Đã có lỗi xảy ra" };
    }
}

/**
 * Nộp bài trắc nghiệm, chấm điểm tự động và cập nhật tiến độ
 * Hỗ trợ chấm điểm từ quiz_data (Builder mới) hoặc quiz_questions (schema cũ)
 */
export async function submitQuiz(classId: string, itemId: string, answers: Record<string, string[]>) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Vui lòng đăng nhập" };
        }

        const adminSupabase = createAdminClient();

        // 1. Lấy cấu hình quiz
        const { data: itemContent } = await adminSupabase
            .from('item_contents')
            .select('min_score, max_attempts, score_method, quiz_data')
            .eq('item_id', itemId)
            .single();

        let totalScore = 0;
        let maxPossibleScore = 0;

        // 2. Chấm điểm dựa trên nguồn dữ liệu
        if (itemContent?.quiz_data && Array.isArray(itemContent.quiz_data) && itemContent.quiz_data.length > 0) {
            // ====== CHẤM TỪ quiz_data (Builder mới) ======
            itemContent.quiz_data.forEach((q: any) => {
                const questionPoints = Number(q.points) || 1;
                maxPossibleScore += questionPoints;

                const studentAnswers = answers[q.id] || [];
                // Tìm đáp án đúng từ options
                const correctOptionIds = (q.options || [])
                    .filter((opt: any) => opt.isCorrect)
                    .map((opt: any) => opt.id);

                // So sánh: phải chọn đúng và đủ
                if (studentAnswers.length === correctOptionIds.length) {
                    const isCorrect = studentAnswers.every((ans: string) => correctOptionIds.includes(ans));
                    if (isCorrect) {
                        totalScore += questionPoints;
                    }
                }
            });
        } else {
            // ====== CHẤM TỪ quiz_questions (Schema cũ) ======
            const { data: questions, error: questionsError } = await adminSupabase
                .from('quiz_questions')
                .select('id, correct_options, points')
                .eq('item_id', itemId);

            if (questionsError || !questions) {
                return { error: "Không thể tải cấu trúc đề thi để chấm điểm" };
            }

            questions.forEach(q => {
                const questionPoints = Number(q.points) || 1;
                maxPossibleScore += questionPoints;

                const studentAnswers = answers[q.id] || [];
                const correctAnswers = q.correct_options || [];

                if (studentAnswers.length === correctAnswers.length) {
                    const isCorrect = studentAnswers.every(ans => correctAnswers.includes(ans));
                    if (isCorrect) {
                        totalScore += questionPoints;
                    }
                }
            });
        }

        // 3. Tính điểm hệ 10
        const finalScore10 = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 10 : 0;
        const roundedScore = Math.round(finalScore10 * 10) / 10;

        // Xác định Đạt / Trượt
        const minScoreToPass = itemContent?.min_score ? Number(itemContent.min_score) : 0;
        const passed = roundedScore >= minScoreToPass;

        // 4. Lưu vào quiz_attempts
        const { error: attemptError } = await adminSupabase
            .from('quiz_attempts')
            .insert({
                student_id: user.id,
                item_id: itemId,
                answers: answers,
                score: roundedScore,
                submitted_at: new Date().toISOString(),
                passed: passed
            });

        if (attemptError) {
            console.error("Lỗi lưu attempt:", attemptError);
            return { error: "Lỗi lưu lịch sử nộp bài" };
        }

        // 5. Cập nhật student_progress
        const { data: existingProgress } = await adminSupabase
            .from('student_progress')
            .select('id, score, attempts, completed_at')
            .eq('student_id', user.id)
            .eq('item_id', itemId)
            .single();

        let finalSavedScore = roundedScore;
        const scoreMethod = itemContent?.score_method || 'highest';

        if (existingProgress && existingProgress.score !== null) {
            const currentSavedScore = Number(existingProgress.score);
            if (scoreMethod === 'highest') {
                finalSavedScore = Math.max(currentSavedScore, roundedScore);
            } else if (scoreMethod === 'average') {
                const totalAttempts = existingProgress.attempts;
                finalSavedScore = ((currentSavedScore * totalAttempts) + roundedScore) / (totalAttempts + 1);
                finalSavedScore = Math.round(finalSavedScore * 10) / 10;
            } else { // 'latest'
                finalSavedScore = roundedScore;
            }
        }

        await adminSupabase
            .from('student_progress')
            .upsert({
                id: existingProgress?.id,
                student_id: user.id,
                item_id: itemId,
                status: 'completed',
                score: finalSavedScore,
                attempts: (existingProgress?.attempts || 0) + 1,
                last_accessed: new Date().toISOString(),
                completed_at: existingProgress?.completed_at || new Date().toISOString()
            }, { onConflict: 'student_id, item_id' });

        // Revalidate
        revalidatePath(`/student/classes/${classId}/learn`);
        revalidatePath(`/student/classes/${classId}/learn/${itemId}`);

        return {
            success: true,
            score: roundedScore,
            passed: passed,
            maxPossibleScore: 10
        };

    } catch (err: any) {
        console.error("Lỗi server submitQuiz:", err);
        return { error: "Đã có lỗi xảy ra khi nộp bài" };
    }
}
