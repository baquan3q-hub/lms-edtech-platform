"use server";

import { requireClassAccess, requireResourceAccess, requireRecordAccess } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordAuditEvent } from "@/lib/audit/audit-logger";
import { produceOutboxEvent } from "@/lib/outbox/outbox-producer";
import { withIdempotency } from "@/lib/idempotency/idempotency-manager";
import { DEFAULT_PILOT_SCHOOL_ID } from "@/lib/auth/actor-context";
import { maskSubmissionForRole } from "@/lib/grading/score-visibility";
import { toStudentHomework, toStudentHomeworkSubmission, validateHomework, homeworkAnswersSchema } from "@/lib/modules/assessment/homework-dto";
import { z } from "zod";

// ============================================================
// TEACHER: CRUD Homework
// ============================================================

export async function createHomework(classId: string, data: {
    title: string;
    description?: string;
    questions: any[];
    total_points: number;
    due_date?: string;
    is_published?: boolean;
}) {
    try {
        await requireClassAccess(classId, "teach");
        validateHomework(data.questions, data.total_points);

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Lấy school_id từ class
        const { data: cls } = await adminSupabase
            .from("classes")
            .select("school_id")
            .eq("id", classId)
            .single();

        if(!cls?.school_id)throw new Error("Không xác định được trường sở hữu lớp.");
        const schoolId = cls.school_id;

        const { data: hw, error } = await adminSupabase
            .from("homework")
            .insert({
                class_id: classId,
                school_id: schoolId,
                title: data.title,
                description: data.description || "",
                questions: data.questions,
                total_points: data.total_points,
                due_date: data.due_date || null,
                is_published: data.is_published ?? false,
                publication_status: data.is_published ? "published" : "draft",
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
        const access = await requireResourceAccess("homework", homeworkId, "teach");
        if (access.resource.class_id !== classId) throw new Error("Sai lớp học.");
        validateHomework(data.questions, data.total_points);

        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from("homework")
            .update({
                title: data.title,
                description: data.description || "",
                questions: data.questions,
                total_points: data.total_points,
                due_date: data.due_date || null,
                is_published: data.is_published ?? access.resource.is_published,
                publication_status: (data.is_published ?? access.resource.is_published) ? "published" : "draft",
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
        await requireResourceAccess("homework", homeworkId, "teach");

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
        await requireClassAccess(classId, "teach");

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

/**
 * Đếm số bài nộp đang chờ chấm (status = 'submitted') cho từng homework trong lớp.
 * Trả về Map<homework_id, pending_count>
 */
export async function fetchPendingHomeworkGradingStats(classId: string) {
    try {
        await requireClassAccess(classId, "teach");

        const adminSupabase = createAdminClient();

        // Lấy danh sách homework_id của lớp
        const { data: hwList } = await adminSupabase
            .from("homework")
            .select("id")
            .eq("class_id", classId);

        if (!hwList || hwList.length === 0) return { data: {}, error: null };

        const hwIds = hwList.map(h => h.id);

        // Lấy submissions status = 'submitted' (chờ chấm thủ công)
        const { data: pendingSubs, error } = await adminSupabase
            .from("homework_submissions")
            .select("homework_id")
            .in("homework_id", hwIds)
            .eq("status", "submitted");

        if (error) throw error;

        // Đếm theo homework_id
        const countMap: Record<string, number> = {};
        (pendingSubs || []).forEach(s => {
            countMap[s.homework_id] = (countMap[s.homework_id] || 0) + 1;
        });

        return { data: countMap, error: null };
    } catch (error: any) {
        console.error("fetchPendingHomeworkGradingStats error:", error);
        return { data: {}, error: error.message };
    }
}

export async function fetchHomeworkDetail(homeworkId: string) {
    try {
        const access = await requireResourceAccess("homework", homeworkId);

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("homework")
            .select("*")
            .eq("id", homeworkId)
            .single();
        if (error) throw error;
        return { data: access.role === "student" || access.role === "parent" ? toStudentHomework(data) : data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

// ============================================================
// TEACHER: Xem & Chấm bài nộp
// ============================================================

export async function fetchHomeworkSubmissions(homeworkId: string) {
    try {
        await requireResourceAccess("homework", homeworkId, "teach");

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
    const { gradeHomeworkSubmissionK12 } = await import("@/lib/actions/grading");
    return gradeHomeworkSubmissionK12({ submissionId, newScore: data.score, feedback: data.feedback, publishNow: true });
}

// ============================================================
// STUDENT: Xem & Nộp bài tập
// ============================================================

export async function fetchStudentHomework(classId: string) {
    try {
        await requireClassAccess(classId, "learn");

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

        // Gắn submission vào homework kèm mặt nạ điểm số
        const result = (homeworkList || []).map((hw: any) => {
            const rawSub = submissions.find((s: any) => s.homework_id === hw.id);
            return {
                ...toStudentHomework(hw),
                submission: rawSub ? toStudentHomeworkSubmission(rawSub) : null,
            };
        });

        return { data: result, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function submitHomework(homeworkId: string, answers: any[], requestKey?: string) {
    try {
        const { id, db } = await requireResourceAccess("homework", homeworkId, "learn");
        const checked = homeworkAnswersSchema.parse(answers);
        const key = z.uuid().parse(requestKey || crypto.randomUUID());
        const { data, error } = await db.rpc("submit_school_homework", { p_student:id,p_homework:homeworkId,p_answers:checked,p_request_key:key });
        if (error) throw error;
        revalidatePath("/student", "layout");
        revalidatePath("/teacher", "layout");
        return { data:toStudentHomeworkSubmission(data),error:null };
    } catch { return { data:null,error:"Không thể nộp bài. Bản nháp được giữ lại; kiểm tra kết nối, hạn nộp và số lần được phép làm." }; }
}

