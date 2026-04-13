"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Types
// ============================================================
type QuestionType = "single_choice" | "multiple_choice" | "text" | "rating";

interface SurveyQuestion {
    question_text: string;
    question_type: QuestionType;
    options?: string[];
    is_required?: boolean;
    sort_order?: number;
}

// ============================================================
// Tạo khảo sát mới (Admin / Teacher)
// ============================================================
export async function createSurvey(data: {
    title: string;
    description?: string;
    scope: "system" | "course" | "class";
    courseId?: string;
    classId?: string;
    deadline?: string;
    questions: SurveyQuestion[];
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Xác định role
        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!userData || !["admin", "teacher"].includes(userData.role)) {
            return { error: "Không có quyền tạo khảo sát" };
        }

        // Validate: teacher chỉ được tạo scope = class
        if (userData.role === "teacher" && data.scope !== "class") {
            return { error: "Giáo viên chỉ được tạo khảo sát cho lớp học" };
        }

        if (data.questions.length === 0) {
            return { error: "Khảo sát phải có ít nhất 1 câu hỏi" };
        }

        // Tạo survey
        const { data: survey, error: surveyErr } = await adminSupabase
            .from("surveys")
            .insert({
                title: data.title,
                description: data.description || null,
                scope: data.scope,
                course_id: data.scope === "course" ? data.courseId : null,
                class_id: data.scope === "class" ? data.classId : null,
                created_by: user.id,
                created_by_role: userData.role,
                deadline: data.deadline || null,
            })
            .select()
            .single();

        if (surveyErr) return { error: surveyErr.message };

        // Tạo questions
        const questionsData = data.questions.map((q, idx) => ({
            survey_id: survey.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options || [],
            is_required: q.is_required !== false,
            sort_order: q.sort_order ?? idx,
        }));

        const { error: qErr } = await adminSupabase
            .from("survey_questions")
            .insert(questionsData);

        if (qErr) return { error: qErr.message };

        // Gửi notification
        try {
            await sendSurveyNotifications(adminSupabase, data, survey.id, data.title);
        } catch (notifErr) {
            console.error("Survey notification error:", notifErr);
        }

        return { data: survey };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Sửa khảo sát (Admin / Teacher)
// ============================================================
export async function updateSurvey(surveyId: string, data: {
    title: string;
    description?: string;
    deadline?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Check ownership/role
        const { data: survey } = await adminSupabase
            .from("surveys")
            .select("created_by")
            .eq("id", surveyId)
            .single();

        if (!survey) return { error: "Không tìm thấy khảo sát" };

        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role === "teacher" && survey.created_by !== user.id) {
             return { error: "Bạn chỉ được sửa khảo sát do chính mình tạo" };
        }

        const { data: updatedSurvey, error } = await adminSupabase
            .from("surveys")
            .update({
                title: data.title,
                description: data.description || null,
                deadline: data.deadline || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", surveyId)
            .select()
            .single();

        if (error) return { error: error.message };

        return { data: updatedSurvey };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}


// ============================================================
// Helper: Gửi notification khảo sát
// ============================================================
async function sendSurveyNotifications(
    adminSupabase: any,
    data: any,
    surveyId: string,
    title: string
) {
    const notifications: any[] = [];

    const buildForClass = async (classId: string) => {
        // Lấy HS
        const { data: students } = await adminSupabase
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId)
            .eq("status", "active");

        // Lấy PH
        const studentIds = students?.map((s: any) => s.student_id) || [];
        let parentIds: string[] = [];
        if (studentIds.length > 0) {
            const { data: parents } = await adminSupabase
                .from("parent_students")
                .select("parent_id")
                .in("student_id", studentIds);
            parentIds = [...new Set(parents?.map((p: any) => p.parent_id) || [])] as string[];
        }

        // PH nhận khảo sát
        parentIds.forEach((pid) => {
            notifications.push({
                user_id: pid,
                title: `📋 Khảo sát mới: ${title}`,
                message: "Bạn có khảo sát mới cần trả lời. Vui lòng kiểm tra.",
                type: "survey",
                link: `/parent/surveys`,
                metadata: { surveyId },
                is_read: false,
            });
        });
    };

    if (data.scope === "system") {
        const { data: parents } = await adminSupabase
            .from("users")
            .select("id")
            .eq("role", "parent");
        parents?.forEach((p: any) => {
            notifications.push({
                user_id: p.id,
                title: `📋 Khảo sát mới: ${title}`,
                message: "Bạn có khảo sát mới cần trả lời.",
                type: "survey",
                link: `/parent/surveys`,
                metadata: { surveyId },
                is_read: false,
            });
        });
    } else if (data.scope === "course" && data.courseId) {
        const { data: classes } = await adminSupabase
            .from("classes")
            .select("id")
            .eq("course_id", data.courseId);
        for (const cls of classes || []) {
            await buildForClass(cls.id);
        }
    } else if (data.scope === "class" && data.classId) {
        await buildForClass(data.classId);
    }

    // Deduplicate
    const unique = Array.from(
        new Map(notifications.map((n) => [n.user_id, n])).values()
    );

    if (unique.length > 0) {
        await adminSupabase.from("notifications").insert(unique);
    }
}

// ============================================================
// Lấy danh sách khảo sát (Admin / Teacher)
// ============================================================
export async function fetchSurveys(filters?: { scope?: string; role?: string }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        let query = adminSupabase
            .from("surveys")
            .select(`
                id, title, description, scope, course_id, class_id,
                created_by, created_by_role, is_active, deadline, created_at,
                course:courses(name),
                class:classes(name)
            `)
            .order("created_at", { ascending: false })
            .limit(50);

        // Teacher chỉ xem survey mình tạo
        if (userData?.role === "teacher") {
            query = query.eq("created_by", user.id);
        }

        if (filters?.scope && filters.scope !== "all") {
            query = query.eq("scope", filters.scope);
        }

        const { data, error } = await query;
        if (error) return { error: error.message };

        // Lấy thống kê responses
        const surveyIds = data?.map((s: any) => s.id) || [];
        let responseStats: Record<string, number> = {};

        if (surveyIds.length > 0) {
            const { data: responses } = await adminSupabase
                .from("survey_responses")
                .select("survey_id, user_id")
                .in("survey_id", surveyIds);

            if (responses) {
                // Đếm số user duy nhất đã trả lời mỗi survey
                const perSurvey: Record<string, Set<string>> = {};
                for (const r of responses) {
                    if (!perSurvey[r.survey_id]) perSurvey[r.survey_id] = new Set();
                    perSurvey[r.survey_id].add(r.user_id);
                }
                for (const [sid, users] of Object.entries(perSurvey)) {
                    responseStats[sid] = users.size;
                }
            }
        }

        const enriched = data?.map((s: any) => ({
            ...s,
            response_count: responseStats[s.id] || 0,
        }));

        return { data: enriched || [] };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Lấy chi tiết survey + câu hỏi
// ============================================================
export async function fetchSurveyDetail(surveyId: string) {
    try {
        const adminSupabase = createAdminClient();

        const { data: survey, error: sErr } = await adminSupabase
            .from("surveys")
            .select(`
                id, title, description, scope, course_id, class_id,
                created_by, created_by_role, is_active, deadline, created_at,
                course:courses(name),
                class:classes(name)
            `)
            .eq("id", surveyId)
            .single();

        if (sErr) return { error: sErr.message };

        const { data: questions } = await adminSupabase
            .from("survey_questions")
            .select("*")
            .eq("survey_id", surveyId)
            .order("sort_order");

        return { data: { ...survey, questions: questions || [] } };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Gửi câu trả lời khảo sát (PH/HS)
// ============================================================
export async function submitSurveyResponse(
    surveyId: string,
    answers: { question_id: string; answer: any }[]
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Kiểm tra survey còn active
        const { data: survey } = await adminSupabase
            .from("surveys")
            .select("is_active, deadline")
            .eq("id", surveyId)
            .single();

        if (!survey?.is_active) return { error: "Khảo sát đã đóng" };
        if (survey.deadline && new Date(survey.deadline) < new Date()) {
            return { error: "Khảo sát đã hết hạn" };
        }

        // Upsert responses
        const responseData = answers.map((a) => ({
            survey_id: surveyId,
            question_id: a.question_id,
            user_id: user.id,
            answer: a.answer,
            submitted_at: new Date().toISOString(),
        }));

        const { error } = await adminSupabase
            .from("survey_responses")
            .upsert(responseData, { onConflict: "question_id,user_id" });

        if (error) return { error: error.message };
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Lấy kết quả thống kê khảo sát
// ============================================================
export async function fetchSurveyAnalytics(surveyId: string) {
    try {
        const adminSupabase = createAdminClient();

        // Lấy questions
        const { data: questions } = await adminSupabase
            .from("survey_questions")
            .select("*")
            .eq("survey_id", surveyId)
            .order("sort_order");

        // Lấy tất cả responses
        const { data: responses } = await adminSupabase
            .from("survey_responses")
            .select("question_id, user_id, answer, submitted_at")
            .eq("survey_id", surveyId);

        // Đếm unique respondents
        const uniqueRespondents = new Set(responses?.map((r) => r.user_id) || []);

        // Tổng hợp per question
        const analytics = (questions || []).map((q: any) => {
            const qResponses = (responses || []).filter((r) => r.question_id === q.id);

            if (q.question_type === "single_choice" || q.question_type === "multiple_choice") {
                // Đếm số lượng cho mỗi option
                const optionCounts: Record<string, number> = {};
                (q.options || []).forEach((opt: string) => { optionCounts[opt] = 0; });

                qResponses.forEach((r) => {
                    const selected = r.answer?.selected || [];
                    selected.forEach((s: string) => {
                        optionCounts[s] = (optionCounts[s] || 0) + 1;
                    });
                });

                return {
                    ...q,
                    total_responses: qResponses.length,
                    option_counts: optionCounts,
                };
            } else if (q.question_type === "rating") {
                // Tính trung bình rating
                const ratings = qResponses.map((r) => r.answer?.rating || 0).filter((r: number) => r > 0);
                const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
                const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                ratings.forEach((r: number) => { distribution[r] = (distribution[r] || 0) + 1; });

                return {
                    ...q,
                    total_responses: qResponses.length,
                    average_rating: Math.round(avg * 10) / 10,
                    rating_distribution: distribution,
                };
            } else {
                // Text: trả về danh sách
                return {
                    ...q,
                    total_responses: qResponses.length,
                    text_answers: qResponses.map((r) => r.answer?.text || "").filter(Boolean),
                };
            }
        });

        return {
            data: {
                total_respondents: uniqueRespondents.size,
                questions: analytics,
            },
        };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Đóng/mở khảo sát
// ============================================================
export async function toggleSurveyActive(surveyId: string, isActive: boolean) {
    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("surveys")
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq("id", surveyId);

        if (error) return { error: error.message };
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Xóa khảo sát
// ============================================================
export async function deleteSurvey(surveyId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("surveys")
            .delete()
            .eq("id", surveyId);

        if (error) return { error: error.message };
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Lấy khảo sát cho Parent (active, thuộc scope phù hợp)
// ============================================================
export async function fetchSurveysForParent(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Lấy classIds của student
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, classes(course_id)")
            .eq("student_id", studentId)
            .eq("status", "active");

        const classIds = enrollments?.map((e: any) => e.class_id) || [];
        const courseIds = [...new Set(enrollments?.map((e: any) => (e.classes as any)?.course_id).filter(Boolean) || [])];

        // Lấy tất cả active surveys phù hợp scope
        let surveys: any[] = [];

        // System surveys
        const { data: systemSurveys } = await adminSupabase
            .from("surveys")
            .select("id, title, description, scope, deadline, created_at")
            .eq("scope", "system")
            .eq("is_active", true);

        if (systemSurveys) surveys.push(...systemSurveys);

        // Course surveys
        if (courseIds.length > 0) {
            const { data: courseSurveys } = await adminSupabase
                .from("surveys")
                .select("id, title, description, scope, deadline, created_at")
                .eq("scope", "course")
                .eq("is_active", true)
                .in("course_id", courseIds);
            if (courseSurveys) surveys.push(...courseSurveys);
        }

        // Class surveys
        if (classIds.length > 0) {
            const { data: classSurveys } = await adminSupabase
                .from("surveys")
                .select("id, title, description, scope, deadline, created_at")
                .eq("scope", "class")
                .eq("is_active", true)
                .in("class_id", classIds);
            if (classSurveys) surveys.push(...classSurveys);
        }

        // Kiểm tra user đã trả lời chưa
        const surveyIds = surveys.map((s) => s.id);
        let answeredSurveyIds = new Set<string>();

        if (surveyIds.length > 0) {
            const { data: myResponses } = await adminSupabase
                .from("survey_responses")
                .select("survey_id")
                .eq("user_id", user.id)
                .in("survey_id", surveyIds);

            answeredSurveyIds = new Set(myResponses?.map((r) => r.survey_id) || []);
        }

        const enriched = surveys.map((s) => ({
            ...s,
            is_answered: answeredSurveyIds.has(s.id),
        }));

        // Sort: chưa trả lời trước, rồi theo ngày tạo
        enriched.sort((a, b) => {
            if (a.is_answered !== b.is_answered) return a.is_answered ? 1 : -1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return { data: enriched };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}
