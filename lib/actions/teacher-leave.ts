"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ==========================================
// TEACHER LEAVE REQUESTS — Đơn xin nghỉ dạy của GV
// ==========================================

/** GV tạo đơn xin nghỉ dạy */
export async function createTeacherLeaveRequest(data: {
    class_id: string;
    session_id?: string;
    leave_date: string;
    reason: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Kiểm tra GV là teacher của lớp này
        const { data: classData } = await adminSupabase
            .from("classes")
            .select("id, name, teacher_id")
            .eq("id", data.class_id)
            .eq("teacher_id", user.id)
            .single();

        if (!classData) {
            return { success: false, error: "Bạn không phải giáo viên của lớp này" };
        }

        // Kiểm tra đã có đơn trùng chưa
        const { data: existing } = await adminSupabase
            .from("teacher_leave_requests")
            .select("id")
            .eq("teacher_id", user.id)
            .eq("class_id", data.class_id)
            .eq("leave_date", data.leave_date)
            .not("status", "eq", "rejected")
            .maybeSingle();

        if (existing) {
            return { success: false, error: "Bạn đã có đơn xin nghỉ cho ngày này rồi" };
        }

        // Tạo đơn
        const { data: newRequest, error } = await adminSupabase
            .from("teacher_leave_requests")
            .insert({
                teacher_id: user.id,
                class_id: data.class_id,
                session_id: data.session_id || null,
                leave_date: data.leave_date,
                reason: data.reason,
                status: "pending",
            })
            .select()
            .single();

        if (error) throw error;

        // Notification cho tất cả Admin
        const { data: admins } = await adminSupabase
            .from("users")
            .select("id")
            .eq("role", "admin");

        if (admins && admins.length > 0) {
            const { data: teacherInfo } = await adminSupabase
                .from("users")
                .select("full_name")
                .eq("id", user.id)
                .single();

            const notifications = admins.map(admin => ({
                user_id: admin.id,
                title: "📋 Đơn xin nghỉ dạy mới",
                message: `GV ${teacherInfo?.full_name || "Giáo viên"} xin nghỉ dạy lớp ${classData.name} ngày ${data.leave_date}.`,
                type: "teacher_leave",
                link: "/admin/attendance",
                metadata: {
                    leaveRequestId: newRequest.id,
                    teacherId: user.id,
                    classId: data.class_id,
                    leaveDate: data.leave_date,
                }
            }));

            await adminSupabase.from("notifications").insert(notifications);
        }

        revalidatePath("/teacher/classes");
        return { success: true, data: newRequest, error: null };
    } catch (error: any) {
        console.error("Lỗi createTeacherLeaveRequest:", error);
        return { success: false, error: error.message };
    }
}

/** Lấy danh sách đơn xin nghỉ (cho GV hoặc Admin) */
export async function getTeacherLeaveRequests(filters?: {
    teacher_id?: string;
    class_id?: string;
    status?: string;
    month?: number;
    year?: number;
}) {
    try {
        const adminSupabase = createAdminClient();
        let query = adminSupabase
            .from("teacher_leave_requests")
            .select(`
                *,
                teacher:users!teacher_id(id, full_name, email, avatar_url),
                class:classes!class_id(id, name),
                substitute:users!substitute_teacher_id(id, full_name),
                reviewer:users!reviewed_by(id, full_name),
                session:class_sessions!session_id(id, session_date, start_time, end_time),
                makeup_session:class_sessions!makeup_session_id(id, session_date, start_time, end_time)
            `)
            .order("created_at", { ascending: false });

        if (filters?.teacher_id) query = query.eq("teacher_id", filters.teacher_id);
        if (filters?.class_id) query = query.eq("class_id", filters.class_id);
        if (filters?.status) query = query.eq("status", filters.status);

        if (filters?.month && filters?.year) {
            const startDate = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
            const endDate = filters.month === 12
                ? `${filters.year + 1}-01-01`
                : `${filters.year}-${String(filters.month + 1).padStart(2, "0")}-01`;
            query = query.gte("leave_date", startDate).lt("leave_date", endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Lỗi getTeacherLeaveRequests:", error);
        return { data: [], error: error.message };
    }
}

/** Admin duyệt đơn xin nghỉ + quyết định action */
export async function reviewTeacherLeave(
    requestId: string,
    decision: "approved" | "rejected",
    actionData?: {
        admin_action?: "substitute" | "reschedule" | "cancel";
        substitute_teacher_id?: string;
        admin_note?: string;
        // For reschedule
        makeup_date?: string;
        makeup_start_time?: string;
        makeup_end_time?: string;
        makeup_room_id?: string;
    }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy thông tin đơn
        const { data: request, error: fetchErr } = await adminSupabase
            .from("teacher_leave_requests")
            .select(`
                *,
                teacher:users!teacher_id(id, full_name),
                class:classes!class_id(id, name, teacher_id)
            `)
            .eq("id", requestId)
            .single();

        if (fetchErr || !request) {
            return { success: false, error: "Không tìm thấy đơn xin nghỉ" };
        }

        const updateData: any = {
            status: decision,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            admin_note: actionData?.admin_note || null,
        };

        if (decision === "approved" && actionData) {
            updateData.admin_action = actionData.admin_action;

            const classObj = Array.isArray(request.class) ? request.class[0] : request.class;
            const teacherObj = Array.isArray(request.teacher) ? request.teacher[0] : request.teacher;

            // === Action: Substitute ===
            if (actionData.admin_action === "substitute" && actionData.substitute_teacher_id) {
                updateData.substitute_teacher_id = actionData.substitute_teacher_id;

                // Update class_sessions
                if (request.session_id) {
                    await adminSupabase
                        .from("class_sessions")
                        .update({
                            substitute_teacher_id: actionData.substitute_teacher_id,
                            teaching_status: "substitute",
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", request.session_id);
                }

                // Notify GV thay
                const { data: subTeacher } = await adminSupabase
                    .from("users")
                    .select("full_name")
                    .eq("id", actionData.substitute_teacher_id)
                    .single();

                await adminSupabase.from("notifications").insert({
                    user_id: actionData.substitute_teacher_id,
                    title: "📚 Bạn được gán dạy thay",
                    message: `Admin đã gán bạn dạy thay lớp ${classObj?.name} ngày ${request.leave_date} thay cho GV ${teacherObj?.full_name}.`,
                    type: "teacher_leave",
                    link: "/teacher/classes",
                });
            }

            // === Action: Reschedule ===
            if (actionData.admin_action === "reschedule" && actionData.makeup_date) {
                // Cancel session gốc
                if (request.session_id) {
                    await adminSupabase
                        .from("class_sessions")
                        .update({
                            status: "cancelled",
                            teaching_status: "cancelled",
                            cancel_reason: `GV xin nghỉ — dạy bù ngày ${actionData.makeup_date}`,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", request.session_id);
                }

                // Tạo buổi học bù
                const { data: makeupSession, error: makeupErr } = await adminSupabase
                    .from("class_sessions")
                    .insert({
                        class_id: request.class_id,
                        session_date: actionData.makeup_date,
                        start_time: actionData.makeup_start_time || "08:00",
                        end_time: actionData.makeup_end_time || "10:00",
                        status: "scheduled",
                        teaching_status: "pending",
                        is_makeup: true,
                        original_session_id: request.session_id || null,
                    })
                    .select()
                    .single();

                if (!makeupErr && makeupSession) {
                    updateData.makeup_session_id = makeupSession.id;
                }

                // Notify HS + PH
                const { data: enrollments } = await adminSupabase
                    .from("enrollments")
                    .select("student_id")
                    .eq("class_id", request.class_id)
                    .eq("status", "active");

                if (enrollments && enrollments.length > 0) {
                    const notifications: any[] = [];
                    for (const en of enrollments) {
                        notifications.push({
                            user_id: en.student_id,
                            title: "📅 Lịch học thay đổi",
                            message: `Buổi học lớp ${classObj?.name} ngày ${request.leave_date} được dời sang ngày ${actionData.makeup_date}.`,
                            type: "schedule_change",
                            link: "/student/schedule",
                        });

                        const { data: parents } = await adminSupabase
                            .from("parent_students")
                            .select("parent_id")
                            .eq("student_id", en.student_id);

                        if (parents) {
                            for (const p of parents) {
                                notifications.push({
                                    user_id: p.parent_id,
                                    title: "📅 Lịch học con thay đổi",
                                    message: `Buổi học lớp ${classObj?.name} của con ngày ${request.leave_date} được dời sang ngày ${actionData.makeup_date}.`,
                                    type: "schedule_change",
                                    link: "/parent",
                                });
                            }
                        }
                    }
                    if (notifications.length > 0) {
                        await adminSupabase.from("notifications").insert(notifications);
                    }
                }
            }

            // === Action: Cancel ===
            if (actionData.admin_action === "cancel") {
                if (request.session_id) {
                    await adminSupabase
                        .from("class_sessions")
                        .update({
                            status: "cancelled",
                            teaching_status: "cancelled",
                            cancel_reason: `GV xin nghỉ — buổi học bị huỷ`,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", request.session_id);
                }

                // Notify HS + PH
                const { data: enrollments } = await adminSupabase
                    .from("enrollments")
                    .select("student_id")
                    .eq("class_id", request.class_id)
                    .eq("status", "active");

                if (enrollments && enrollments.length > 0) {
                    const notifications: any[] = [];
                    for (const en of enrollments) {
                        notifications.push({
                            user_id: en.student_id,
                            title: "❌ Huỷ buổi học",
                            message: `Buổi học lớp ${classObj?.name} ngày ${request.leave_date} đã bị huỷ do GV xin nghỉ.`,
                            type: "schedule_change",
                            link: "/student/schedule",
                        });

                        const { data: parents } = await adminSupabase
                            .from("parent_students")
                            .select("parent_id")
                            .eq("student_id", en.student_id);

                        if (parents) {
                            for (const p of parents) {
                                notifications.push({
                                    user_id: p.parent_id,
                                    title: "❌ Huỷ buổi học của con",
                                    message: `Buổi học lớp ${classObj?.name} ngày ${request.leave_date} đã bị huỷ.`,
                                    type: "schedule_change",
                                    link: "/parent",
                                });
                            }
                        }
                    }
                    if (notifications.length > 0) {
                        await adminSupabase.from("notifications").insert(notifications);
                    }
                }
            }
        }

        // Cập nhật đơn
        const { error: updateErr } = await adminSupabase
            .from("teacher_leave_requests")
            .update(updateData)
            .eq("id", requestId);

        if (updateErr) throw updateErr;

        // Notify GV kết quả
        const statusVn = decision === "approved" ? "được chấp thuận" : "bị từ chối";
        const classObj = Array.isArray(request.class) ? request.class[0] : request.class;

        await adminSupabase.from("notifications").insert({
            user_id: request.teacher_id,
            title: `Kết quả đơn xin nghỉ: ${statusVn}`,
            message: `Đơn xin nghỉ dạy lớp ${classObj?.name} ngày ${request.leave_date} đã ${statusVn}.${actionData?.admin_note ? ` Ghi chú: ${actionData.admin_note}` : ""}`,
            type: "teacher_leave",
            link: "/teacher/classes",
        });

        revalidatePath("/admin/attendance");
        revalidatePath("/teacher/classes");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi reviewTeacherLeave:", error);
        return { success: false, error: error.message };
    }
}

/** Lấy danh sách GV có thể dạy thay (rảnh trong khung giờ) */
export async function getAvailableTeachersForSubstitute(
    leaveDate: string,
    startTime: string,
    endTime: string,
    excludeTeacherId: string
) {
    try {
        const adminSupabase = createAdminClient();

        // Lấy tất cả GV
        const { data: allTeachers } = await adminSupabase
            .from("users")
            .select("id, full_name, email, avatar_url")
            .eq("role", "teacher")
            .neq("id", excludeTeacherId);

        if (!allTeachers || allTeachers.length === 0) return { data: [], error: null };

        // Lấy class_sessions trùng giờ ngày đó
        const { data: busySessions } = await adminSupabase
            .from("class_sessions")
            .select(`
                class_id,
                class:classes!class_id(teacher_id)
            `)
            .eq("session_date", leaveDate)
            .neq("status", "cancelled")
            .lt("start_time", endTime)
            .gt("end_time", startTime);

        const busyTeacherIds = new Set<string>();
        for (const sess of (busySessions || [])) {
            const classObj = Array.isArray(sess.class) ? sess.class[0] : sess.class;
            if (classObj?.teacher_id) {
                busyTeacherIds.add(classObj.teacher_id);
            }
        }

        // Cũng check substitute assignments
        const { data: substituteSessions } = await adminSupabase
            .from("class_sessions")
            .select("substitute_teacher_id")
            .eq("session_date", leaveDate)
            .neq("status", "cancelled")
            .not("substitute_teacher_id", "is", null)
            .lt("start_time", endTime)
            .gt("end_time", startTime);

        for (const sess of (substituteSessions || [])) {
            if (sess.substitute_teacher_id) {
                busyTeacherIds.add(sess.substitute_teacher_id);
            }
        }

        const availableTeachers = allTeachers.filter(t => !busyTeacherIds.has(t.id));

        return { data: availableTeachers, error: null };
    } catch (error: any) {
        console.error("Lỗi getAvailableTeachersForSubstitute:", error);
        return { data: [], error: error.message };
    }
}

/** GV rút đơn xin nghỉ (chỉ khi pending) */
export async function withdrawTeacherLeave(requestId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { data: request } = await adminSupabase
            .from("teacher_leave_requests")
            .select("id, status, teacher_id")
            .eq("id", requestId)
            .eq("teacher_id", user.id)
            .single();

        if (!request) return { success: false, error: "Không tìm thấy đơn" };
        if (request.status !== "pending") {
            return { success: false, error: "Chỉ có thể rút đơn đang chờ duyệt" };
        }

        const { error } = await adminSupabase
            .from("teacher_leave_requests")
            .delete()
            .eq("id", requestId);

        if (error) throw error;

        revalidatePath("/teacher/classes");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi withdrawTeacherLeave:", error);
        return { success: false, error: error.message };
    }
}

/** Lấy đơn xin nghỉ của GV hiện tại */
export async function getMyLeaveRequests() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        return getTeacherLeaveRequests({ teacher_id: user.id });
    } catch (error: any) {
        return { data: [], error: error.message };
    }
}
