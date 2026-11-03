"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { calcAttendanceRateFormatted, calcAttendanceRate } from "@/lib/utils/attendance-rate";

// ==========================================
// ATTENDANCE SESSIONS
// ==========================================

/** Lấy hoặc tạo session điểm danh cho 1 lớp + 1 ngày */
export async function getOrCreateAttendanceSession(classId: string, date: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Kiểm tra session đã tồn tại chưa
        const { data: existing } = await adminSupabase
            .from("attendance_sessions")
            .select("*")
            .eq("class_id", classId)
            .eq("session_date", date)
            .maybeSingle();

        if (existing) return { data: existing, error: null };

        // Tạo mới
        const { data: newSession, error } = await adminSupabase
            .from("attendance_sessions")
            .insert({
                class_id: classId,
                teacher_id: user.id,
                session_date: date,
                status: "open",
            })
            .select()
            .single();

        if (error) throw error;
        return { data: newSession, error: null };
    } catch (error: any) {
        console.error("Lỗi getOrCreateAttendanceSession:", error);
        return { data: null, error: error.message };
    }
}

/** Đóng session điểm danh */
export async function closeAttendanceSession(sessionId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("attendance_sessions")
            .update({ status: "closed", end_time: new Date().toTimeString().split(" ")[0] })
            .eq("id", sessionId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi closeAttendanceSession:", error);
        return { success: false, error: error.message };
    }
}

/** Xóa session điểm danh (và các records liên quan) */
export async function deleteAttendanceSession(sessionId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Lấy thông tin session
        const { data: sessionInfo } = await adminSupabase
            .from("attendance_sessions")
            .select("teacher_id")
            .eq("id", sessionId)
            .single();

        // Only allow the teacher who created it, or an admin
        const { data: userData } = await adminSupabase.from("users").select("role").eq("id", user.id).single();
        if (userData?.role !== "admin" && sessionInfo?.teacher_id !== user.id) {
            return { success: false, error: "Bạn không có quyền xóa buổi điểm danh này" };
        }

        // 2. Lấy thông tin session trước khi xoá (để revert teaching_status)
        const { data: sessionData } = await adminSupabase
            .from("attendance_sessions")
            .select("class_id, session_date")
            .eq("id", sessionId)
            .single();

        // 3. Xóa records + session
        const { error: deleteRecordsError } = await adminSupabase
            .from("attendance_records")
            .delete()
            .eq("session_id", sessionId);

        if (deleteRecordsError) throw deleteRecordsError;

        const { error: deleteSessionError } = await adminSupabase
            .from("attendance_sessions")
            .delete()
            .eq("id", sessionId);

        if (deleteSessionError) throw deleteSessionError;

        // 4. Revert teaching_status trên class_sessions
        if (sessionData) {
            await adminSupabase
                .from("class_sessions")
                .update({
                    teaching_status: "pending",
                    actual_teacher_id: null,
                    taught_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("class_id", sessionData.class_id)
                .eq("session_date", sessionData.session_date);
        }

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi deleteAttendanceSession:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// ATTENDANCE RECORDS
// ==========================================

/** Lưu (upsert) danh sách điểm danh */
export async function saveAttendanceRecords(
    sessionId: string,
    classId: string,
    records: { student_id: string; status: string; note?: string }[]
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };
        if (!records.length || new Set(records.map(r => r.student_id)).size !== records.length ||
            records.some(r => !["present", "absent", "late", "excused"].includes(r.status))) {
            return { success: false, error: "Dữ liệu điểm danh không hợp lệ" };
        }

        const adminSupabase = createAdminClient();
        const [sessionResult, classResult, actorResult, enrollmentResult, previousResult] = await Promise.all([
            adminSupabase.from("attendance_sessions")
                .select("id, class_id, teacher_id, session_date").eq("id", sessionId).single(),
            adminSupabase.from("classes")
                .select("name, teacher_id, teacher:users!teacher_id(full_name)").eq("id", classId).single(),
            adminSupabase.from("users").select("role").eq("id", user.id).single(),
            adminSupabase.from("enrollments").select("student_id")
                .eq("class_id", classId).eq("status", "active"),
            adminSupabase.from("attendance_records")
                .select("student_id, status, note").eq("session_id", sessionId),
        ]);
        if (sessionResult.error || classResult.error || actorResult.error ||
            enrollmentResult.error || previousResult.error) {
            throw sessionResult.error || classResult.error || actorResult.error ||
                enrollmentResult.error || previousResult.error;
        }
        const session = sessionResult.data;
        const classInfo = classResult.data;
        if (session.class_id !== classId ||
            (actorResult.data.role !== "admin" &&
             classInfo.teacher_id !== user.id && session.teacher_id !== user.id)) {
            return { success: false, error: "Bạn không có quyền điểm danh lớp này" };
        }
        const enrolledStudents = new Set((enrollmentResult.data || []).map(e => e.student_id));
        const previousRecords = new Map((previousResult.data || []).map(r => [r.student_id, r]));
        if (records.some(r => !enrolledStudents.has(r.student_id) && !previousRecords.has(r.student_id))) {
            return { success: false, error: "Danh sách có học sinh không thuộc lớp" };
        }

        const changedRecords = records.filter(r => previousRecords.get(r.student_id)?.status !== r.status);
        const recordsToWrite = records.filter(r => {
            const previous = previousRecords.get(r.student_id);
            return !previous || previous.status !== r.status || (previous.note || null) !== (r.note || null);
        });
        const now = new Date().toISOString();
        if (recordsToWrite.length) {
            const { error: upsertError } = await adminSupabase.from("attendance_records").upsert(
            recordsToWrite.map(r => ({
                session_id: sessionId,
                student_id: r.student_id,
                status: r.status,
                note: r.note || null,
                marked_by: user.id,
                marked_at: now,
                updated_by: user.id,
                updated_at: now,
            })),
            { onConflict: "session_id,student_id" }
            );
            if (upsertError) throw upsertError;
        }

        // Các phần hậu xử lý độc lập chạy song song. Điểm danh đã lưu ngay cả khi
        // một dịch vụ phụ (thông báo/điểm thưởng) gặp lỗi.
        const notify = async () => {
            if (!changedRecords.length) return;
            const absentOrLate = changedRecords.filter(r => r.status === "absent" || r.status === "late");
            const [parentResult, adminResult] = await Promise.all([
                absentOrLate.length
                    ? adminSupabase.from("parent_students").select("student_id, parent_id")
                        .in("student_id", absentOrLate.map(r => r.student_id))
                    : Promise.resolve({ data: [], error: null }),
                adminSupabase.from("users").select("id").eq("role", "admin"),
            ]);
            if (parentResult.error || adminResult.error) throw parentResult.error || adminResult.error;
            const parentsByStudent = new Map<string, string[]>();
            for (const link of parentResult.data || []) {
                const parents = parentsByStudent.get(link.student_id) || [];
                parents.push(link.parent_id);
                parentsByStudent.set(link.student_id, parents);
            }
            const notifications: Record<string, unknown>[] = [];
            for (const record of absentOrLate) {
                const statusVn = record.status === "absent" ? "vắng mặt" : "đi trễ";
                notifications.push({
                    user_id: record.student_id,
                    title: `Thông báo điểm danh: ${statusVn}`,
                    message: `Bạn được đánh dấu ${statusVn} trong buổi học ngày hôm nay.`,
                    type: "attendance",
                    link: "/student/attendance",
                });
                for (const parentId of parentsByStudent.get(record.student_id) || []) {
                    notifications.push({
                        user_id: parentId,
                        title: `Thông báo điểm danh con: ${statusVn}`,
                        message: `Con bạn được đánh dấu ${statusVn} trong buổi học hôm nay.`,
                        type: "attendance",
                        link: "/parent",
                    });
                }
            }
            const presentCount = records.filter(r => r.status === "present").length;
            const absentCount = records.filter(r => r.status === "absent").length;
            const lateCount = records.filter(r => r.status === "late").length;
            const excusedCount = records.filter(r => r.status === "excused").length;
            const attendanceRate = calcAttendanceRateFormatted(presentCount, lateCount, excusedCount, absentCount);
            const teacher = Array.isArray(classInfo.teacher) ? classInfo.teacher[0] : classInfo.teacher;
            const teacherName = teacher?.full_name || "Giáo viên";
            const summary = {
                sessionId, classId, className: classInfo.name || classId, teacherName,
                totalStudents: records.length, presentCount, absentCount, lateCount, excusedCount,
                attendanceRate,
            };
            for (const admin of adminResult.data || []) {
                notifications.push({
                    user_id: admin.id,
                    title: `Điểm danh hoàn tất — ${summary.className}`,
                    message: `GV ${teacherName} vừa điểm danh. Có mặt: ${presentCount}/${records.length} (${attendanceRate}%)`,
                    type: "attendance_completed",
                    metadata: summary,
                });
            }
            if (notifications.length) {
                const { error } = await adminSupabase.from("notifications").insert(notifications);
                if (error) throw error;
            }
        };

        const syncTeachingStatus = async () => {
            const { data: matchingSession, error } = await adminSupabase.from("class_sessions")
                .select("id, substitute_teacher_id")
                .eq("class_id", classId).eq("session_date", session.session_date).maybeSingle();
            if (error) throw error;
            if (!matchingSession) return;
            const taughtAt = new Date().toISOString();
            const { error: updateError } = await adminSupabase.from("class_sessions").update({
                teaching_status: matchingSession.substitute_teacher_id === user.id ? "substitute" : "taught",
                actual_teacher_id: user.id, taught_at: taughtAt, updated_at: taughtAt,
            }).eq("id", matchingSession.id);
            if (updateError) throw updateError;
        };

        const updatePointsAndAchievements = async () => {
            if (!changedRecords.length) return;
            // Thay thế điểm cơ bản của những học sinh đổi trạng thái, tránh cộng trùng khi lưu lại.
            const changedStudentIds = changedRecords.map(r => r.student_id);
            const { error: deleteError } = await adminSupabase.from("attendance_points").delete()
                .eq("session_id", sessionId).in("student_id", changedStudentIds)
                .in("reason", ["present", "late", "excused", "absent"]);
            if (deleteError) throw deleteError;
            const pointsRules: Record<string, number> = { present: 10, late: 5, excused: 8, absent: 0 };
            const basePoints = changedRecords.filter(r => pointsRules[r.status] > 0).map(r => ({
                student_id: r.student_id, class_id: classId, session_id: sessionId,
                points_earned: pointsRules[r.status], reason: r.status,
            }));
            if (basePoints.length) {
                const { error } = await adminSupabase.from("attendance_points").insert(basePoints);
                if (error) throw error;
            }

            const presentStudents = changedRecords.filter(r => r.status === "present");
            if (!presentStudents.length) return;
            const streakRules = [
                { min: 10, type: "streak_10", bonus: 80 },
                { min: 5, type: "streak_5", bonus: 30 },
                { min: 3, type: "streak_3", bonus: 15 },
            ];
            const achievements: { student_id: string; class_id: string; achievement_type: string;
                session_id: string; points_earned: number; reason: string }[] = [];
            // Giới hạn số truy vấn đồng thời để không dồn tải lên database.
            for (let offset = 0; offset < presentStudents.length; offset += 8) {
                const batch = presentStudents.slice(offset, offset + 8);
                const results = await Promise.all(batch.map(r => adminSupabase.from("attendance_records")
                    .select("status").eq("student_id", r.student_id)
                    .order("marked_at", { ascending: false }).limit(10)));
                for (let index = 0; index < batch.length; index++) {
                    if (results[index].error) throw results[index].error;
                    let streak = 0;
                    for (const recent of results[index].data || []) {
                        if (recent.status !== "present") break;
                        streak++;
                    }
                    for (const rule of streakRules) {
                        if (streak >= rule.min) {
                            achievements.push({
                                student_id: batch[index].student_id, class_id: classId,
                                achievement_type: rule.type, session_id: sessionId,
                                points_earned: rule.bonus, reason: rule.type,
                            });
                        }
                    }
                }
            }
            if (!achievements.length) return;
            const { error: achievementError } = await adminSupabase.from("student_achievements")
                .upsert(achievements.map(({ student_id, class_id, achievement_type }) =>
                    ({ student_id, class_id, achievement_type })),
                    { onConflict: "student_id,class_id,achievement_type" });
            if (achievementError) throw achievementError;
            const { data: existingBonuses, error: bonusError } = await adminSupabase
                .from("attendance_points").select("student_id, reason")
                .eq("class_id", classId)
                .in("student_id", presentStudents.map(r => r.student_id))
                .in("reason", streakRules.map(r => r.type));
            if (bonusError) throw bonusError;
            const awarded = new Set((existingBonuses || []).map(p => `${p.student_id}:${p.reason}`));
            const newBonuses = achievements.filter(a => !awarded.has(`${a.student_id}:${a.reason}`))
                .map(({ student_id, class_id, session_id, points_earned, reason }) =>
                    ({ student_id, class_id, session_id, points_earned, reason }));
            if (newBonuses.length) {
                const { error } = await adminSupabase.from("attendance_points").insert(newBonuses);
                if (error) throw error;
            }
        };

        const sideEffects = await Promise.allSettled([
            notify(), syncTeachingStatus(), updatePointsAndAchievements(),
        ]);
        for (const effect of sideEffects) {
            if (effect.status === "rejected") console.error("Attendance post-save effect failed:", effect.reason);
        }
        revalidatePath(`/teacher/classes/${classId}`);
        revalidatePath("/admin");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi saveAttendanceRecords:", error);
        return { success: false, error: error.message };
    }
}

/** Lấy records của 1 session */
export async function getAttendanceRecords(sessionId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("attendance_records")
            .select(`
                *,
                student:users!student_id(id, full_name, email)
            `)
            .eq("session_id", sessionId);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Lỗi getAttendanceRecords:", error);
        return { data: [], error: error.message };
    }
}

/** Lấy lịch sử điểm danh của 1 lớp trong 1 tháng */
export async function getAttendanceHistory(classId: string, month: number, year: number) {
    try {
        const adminSupabase = createAdminClient();

        // Tính ngày đầu và cuối tháng
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        // Lấy tất cả sessions trong tháng
        const { data: sessions, error: sessErr } = await adminSupabase
            .from("attendance_sessions")
            .select("*")
            .eq("class_id", classId)
            .gte("session_date", startDate)
            .lt("session_date", endDate)
            .order("session_date", { ascending: true });

        if (sessErr) throw sessErr;
        if (!sessions || sessions.length === 0) return { data: { sessions: [], records: [] }, error: null };

        const sessionIds = sessions.map((s: any) => s.id);

        // Lấy tất cả records
        const { data: records, error: recErr } = await adminSupabase
            .from("attendance_records")
            .select(`
                *,
                student:users!student_id(id, full_name, email)
            `)
            .in("session_id", sessionIds);

        if (recErr) throw recErr;

        return { data: { sessions, records: records || [] }, error: null };
    } catch (error: any) {
        console.error("Lỗi getAttendanceHistory:", error);
        return { data: { sessions: [], records: [] }, error: error.message };
    }
}

/** Lấy lịch sử điểm danh của 1 học sinh */
export async function getStudentAttendanceHistory(studentId: string, month: number, year: number) {
    try {
        const adminSupabase = createAdminClient();

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        const { data, error } = await adminSupabase
            .from("attendance_records")
            .select(`
                *,
                session:attendance_sessions!session_id(
                    id, class_id, session_date, status,
                    class:classes!class_id(name)
                )
            `)
            .eq("student_id", studentId)
            .gte("session.session_date", startDate)
            .lt("session.session_date", endDate);

        if (error) throw error;

        // Filter out rows where session is null (due to inner filter on related table)
        const filtered = (data || []).filter((r: any) => r.session !== null);
        return { data: filtered, error: null };
    } catch (error: any) {
        console.error("Lỗi getStudentAttendanceHistory:", error);
        return { data: [], error: error.message };
    }
}

// ==========================================
// ABSENCE REQUESTS (ĐƠN XIN NGHỈ)
// ==========================================

/** Phụ huynh tạo đơn xin nghỉ */
export async function createAbsenceRequest(data: {
    student_id: string;
    class_id: string;
    absence_date: string;
    reason: string;
    attachment_url?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error, data: newRequest } = await adminSupabase
            .from("absence_requests")
            .insert({
                parent_id: user.id,
                student_id: data.student_id,
                class_id: data.class_id,
                absence_date: data.absence_date,
                reason: data.reason,
                attachment_url: data.attachment_url || null,
                status: "pending",
            })
            .select()
            .single();

        if (error) throw error;

        // --- Add Notifications for Teacher ---
        const { data: classData } = await adminSupabase
            .from("classes")
            .select("teacher_id, name")
            .eq("id", data.class_id)
            .single();

        if (classData?.teacher_id) {
            await adminSupabase.from("notifications").insert({
                user_id: classData.teacher_id,
                title: "Đơn xin nghỉ mới",
                message: `Có đơn xin nghỉ mới từ lớp ${classData.name}.`,
                type: "absence_request",
                link: "/teacher/absence-requests"
            });
        }
        // ------------------------------------

        revalidatePath("/parent/absence-request");
        return { success: true, data: newRequest, error: null };
    } catch (error: any) {
        console.error("Lỗi createAbsenceRequest:", error);
        return { success: false, error: error.message };
    }
}

/** Lấy danh sách đơn xin nghỉ (cho PH hoặc GV) */
export async function getAbsenceRequests(filters?: {
    parent_id?: string;
    class_id?: string;
    status?: string;
    student_id?: string;
}) {
    try {
        const adminSupabase = createAdminClient();
        let query = adminSupabase
            .from("absence_requests")
            .select(`
                *,
                student:users!student_id(id, full_name, email),
                parent:users!parent_id(id, full_name, email),
                class:classes!class_id(id, name),
                reviewer:users!reviewed_by(id, full_name)
            `)
            .order("created_at", { ascending: false });

        if (filters?.parent_id) query = query.eq("parent_id", filters.parent_id);
        if (filters?.class_id) query = query.eq("class_id", filters.class_id);
        if (filters?.status) query = query.eq("status", filters.status);
        if (filters?.student_id) query = query.eq("student_id", filters.student_id);

        const { data, error } = await query;
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Lỗi getAbsenceRequests:", error);
        return { data: [], error: error.message };
    }
}

/** GV duyệt hoặc từ chối đơn xin nghỉ */
export async function reviewAbsenceRequest(
    requestId: string,
    decision: "approved" | "rejected",
    rejectReason?: string
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Cập nhật trạng thái đơn
        const { data: updatedRequest, error: updateErr } = await adminSupabase
            .from("absence_requests")
            .update({
                status: decision,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                reject_reason: decision === "rejected" ? rejectReason : null,
            })
            .eq("id", requestId)
            .select(`
                *,
                student:users!student_id(id, full_name)
            `)
            .single();

        if (updateErr) throw updateErr;

        // Nếu duyệt → tự động update attendance record thành 'excused'
        if (decision === "approved" && updatedRequest) {
            // Tìm session đã tồn tại cho ngày đó
            const { data: session } = await adminSupabase
                .from("attendance_sessions")
                .select("id")
                .eq("class_id", updatedRequest.class_id)
                .eq("session_date", updatedRequest.absence_date)
                .maybeSingle();

            if (session) {
                await adminSupabase
                    .from("attendance_records")
                    .upsert({
                        session_id: session.id,
                        student_id: updatedRequest.student_id,
                        status: "excused",
                        note: "Đơn xin nghỉ đã được duyệt",
                        marked_by: user.id,
                        marked_at: new Date().toISOString(),
                        updated_by: user.id,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: "session_id,student_id" });
            }
        }

        // --- Add Notifications for Parent ---
        if (updatedRequest) {
            const statusVn = decision === "approved" ? "chấp thuận" : "từ chối";
            const reasonStr = decision === "rejected" && rejectReason ? ` Lý do: ${rejectReason}` : "";

            await adminSupabase.from("notifications").insert({
                user_id: updatedRequest.parent_id,
                title: `Kết quả đơn xin nghỉ: ${statusVn}`,
                message: `Đơn xin nghỉ ngày ${updatedRequest.absence_date} đã bị ${statusVn}.${reasonStr}`,
                type: "absence_request",
                link: "/parent/absence-request"
            });
        }
        // ------------------------------------

        revalidatePath("/teacher/absence-requests");
        return { success: true, data: updatedRequest, error: null };
    } catch (error: any) {
        console.error("Lỗi reviewAbsenceRequest:", error);
        return { success: false, error: error.message };
    }
}

/** Kiểm tra đơn xin nghỉ đã duyệt cho ngày cụ thể */
export async function getApprovedAbsencesForDate(classId: string, date: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("absence_requests")
            .select(`
                *,
                student:users!student_id(id, full_name)
            `)
            .eq("class_id", classId)
            .eq("absence_date", date)
            .eq("status", "approved");

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Lỗi getApprovedAbsencesForDate:", error);
        return { data: [], error: error.message };
    }
}

// ==========================================
// ADMIN STATISTICS
// ==========================================

/** Thống kê tổng quan điểm danh cho Admin */
export async function getAttendanceOverview(month: number, year: number, classId?: string, cycle: "month" | "year" | "since_start" = "month") {
    try {
        const adminSupabase = createAdminClient();

        let startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        let endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        if (cycle === "year") {
            startDate = `${year}-01-01`;
            endDate = `${year + 1}-01-01`;
        } else if (cycle === "since_start") {
            startDate = "1970-01-01";
            endDate = "9999-12-31";
        }

        // Đếm đơn chờ duyệt đồng thời với việc tải buổi học.
        let sessionQuery = adminSupabase
            .from("attendance_sessions")
            .select(`
                id, class_id, session_date,
                class:classes!class_id(id, name, teacher_id,
                    teacher:users!teacher_id(id, full_name)
                )
            `)
            .gte("session_date", startDate)
            .lt("session_date", endDate)
            .order("session_date", { ascending: true });

        if (classId) sessionQuery = sessionQuery.eq("class_id", classId);

        const [{ data: sessions, error: sessErr }, { count: pendingRequests, error: pendingErr }] = await Promise.all([
            sessionQuery,
            adminSupabase.from("absence_requests")
                .select("id", { count: "exact", head: true })
                .eq("status", "pending"),
        ]);
        if (sessErr) throw sessErr;
        if (pendingErr) throw pendingErr;

        if (!sessions || sessions.length === 0) {
            return {
                data: {
                    totalSessions: 0,
                    avgAttendanceRate: 0,
                    studentsHighAbsence: [],
                    pendingRequests: pendingRequests || 0,
                    classSummaries: [],
                },
                error: null,
            };
        }

        const sessionIds = sessions.map((s: any) => s.id);

        // Lấy records
        const { data: records, error: recordsErr } = await adminSupabase
            .from("attendance_records")
            .select("session_id, student_id, status")
            .in("session_id", sessionIds);
        if (recordsErr) throw recordsErr;

        const allRecords = records || [];
        const validSessionIds = new Set<string>();
        const countsBySession = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();
        const studentAbsences: Record<string, number> = {};
        const studentTotal: Record<string, number> = {};
        let presentCount = 0;
        let absentCount = 0;
        let excusedCount = 0;

        // Mỗi bản ghi chỉ được duyệt một lần, kể cả khi xem toàn bộ năm.
        for (const record of allRecords) {
            validSessionIds.add(record.session_id);
            const counts = countsBySession.get(record.session_id) || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            counts.total++;
            if (record.status === "present") { counts.present++; presentCount++; }
            else if (record.status === "absent") { counts.absent++; absentCount++; }
            else if (record.status === "late") counts.late++;
            else if (record.status === "excused") { counts.excused++; excusedCount++; }
            countsBySession.set(record.session_id, counts);
            studentTotal[record.student_id] = (studentTotal[record.student_id] || 0) + 1;
            if (record.status === "absent") {
                studentAbsences[record.student_id] = (studentAbsences[record.student_id] || 0) + 1;
            }
        }

        const validSessions = sessions.filter(s => validSessionIds.has(s.id));
        const relevantTotal = presentCount + absentCount + excusedCount;
        const avgRate = relevantTotal > 0 ? Math.round((presentCount / relevantTotal) * 100) : 0;

        const classMap: Record<string, any> = {};
        for (const sess of validSessions) {
            const cid = sess.class_id;
            if (!classMap[cid]) {
                const classObj = sess.class as any;
                classMap[cid] = {
                    classId: cid,
                    className: classObj?.name || "",
                    teacherName: classObj?.teacher?.full_name || "",
                    totalSessions: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    totalLate: 0,
                    totalExcused: 0,
                    totalRecords: 0,
                };
            }
            classMap[cid].totalSessions++;

            const counts = countsBySession.get(sess.id)!;
            classMap[cid].totalRecords += counts.total;
            classMap[cid].totalPresent += counts.present;
            classMap[cid].totalAbsent += counts.absent;
            classMap[cid].totalLate += counts.late;
            classMap[cid].totalExcused += counts.excused;
        }

        const classSummaries = Object.values(classMap).map((c: any) => ({
            ...c,
            attendanceRate: calcAttendanceRate(c.totalPresent, c.totalLate, c.totalExcused, c.totalAbsent),
        }));

        const studentsHighAbsence = Object.entries(studentAbsences)
            .filter(([sid, count]) => {
                const total = studentTotal[sid] || 1;
                return (count / total) > 0.2;
            })
            .map(([sid, count]) => ({
                studentId: sid,
                absentCount: count,
                totalSessions: studentTotal[sid],
                absentRate: Math.round((count / (studentTotal[sid] || 1)) * 100),
            }));

        return {
            data: {
                totalSessions: validSessions.length,
                avgAttendanceRate: avgRate,
                studentsHighAbsence,
                pendingRequests: pendingRequests || 0,
                classSummaries,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Lỗi getAttendanceOverview:", error);
        return { data: null, error: error.message };
    }
}

// ==========================================
// HELPER: Lấy danh sách lớp mà giáo viên phụ trách
// ==========================================
export async function getTeacherClassIds() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("classes")
            .select("id, name")
            .eq("teacher_id", user.id);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        return { data: [], error: error.message };
    }
}

/** Lấy thông tin con của phụ huynh (dùng cho trang absence request) */
export async function getParentChildren() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("parent_students")
            .select(`
                student_id,
                student:users!student_id(id, full_name, email)
            `)
            .eq("parent_id", user.id);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        return { data: [], error: error.message };
    }
}

/** Lấy danh sách lớp mà học sinh đang tham gia */
export async function getStudentClasses(studentId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("enrollments")
            .select(`
                class_id,
                class:classes!class_id(id, name)
            `)
            .eq("student_id", studentId)
            .eq("status", "active");

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        return { data: [], error: error.message };
    }
}

/** Phụ huynh thu hồi đơn xin nghỉ (chỉ khi đang ở trạng thái pending) */
export async function withdrawAbsenceRequest(requestId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Kiểm tra đơn tồn tại và thuộc về parent hiện tại
        const { data: request, error: fetchErr } = await adminSupabase
            .from("absence_requests")
            .select("*, class:classes!class_id(id, name, teacher_id)")
            .eq("id", requestId)
            .eq("parent_id", user.id)
            .single();

        if (fetchErr || !request) {
            return { success: false, error: "Không tìm thấy đơn xin nghỉ." };
        }

        // Chỉ cho phép thu hồi khi đang ở trạng thái pending
        if (request.status !== "pending") {
            return { success: false, error: "Chỉ có thể thu hồi đơn đang chờ duyệt." };
        }

        // Xóa đơn xin nghỉ
        const { error: deleteErr } = await adminSupabase
            .from("absence_requests")
            .delete()
            .eq("id", requestId);

        if (deleteErr) throw deleteErr;

        // Gửi thông báo cho giáo viên
        const classObj = Array.isArray(request.class) ? request.class[0] : request.class;
        if (classObj?.teacher_id) {
            await adminSupabase.from("notifications").insert({
                user_id: classObj.teacher_id,
                title: "Đơn xin nghỉ đã bị thu hồi",
                message: `Phụ huynh đã thu hồi đơn xin nghỉ ngày ${request.absence_date} của lớp ${classObj.name}.`,
                type: "absence_request",
                link: "/teacher/absence-requests"
            });
        }

        revalidatePath("/parent/absence-request");
        revalidatePath("/parent");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi withdrawAbsenceRequest:", error);
        return { success: false, error: error.message };
    }
}

/** Phụ huynh thu hồi đơn xin nghỉ theo thông tin buổi học (class_id + absence_date + student_id) */
export async function withdrawAbsenceRequestBySession(classId: string, absenceDate: string, studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Tìm đơn xin nghỉ phù hợp
        const { data: request, error: fetchErr } = await adminSupabase
            .from("absence_requests")
            .select("id, status")
            .eq("parent_id", user.id)
            .eq("class_id", classId)
            .eq("absence_date", absenceDate)
            .eq("student_id", studentId)
            .eq("status", "pending")
            .maybeSingle();

        if (fetchErr || !request) {
            return { success: false, error: "Không tìm thấy đơn xin nghỉ đang chờ duyệt." };
        }

        return withdrawAbsenceRequest(request.id);
    } catch (error: any) {
        console.error("Lỗi withdrawAbsenceRequestBySession:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// TREND DATA — Biểu đồ xu hướng cho Admin
// ==========================================

/** Lấy dữ liệu xu hướng điểm danh theo thời gian (cho LineChart) */
export async function getAttendanceTrendData(
    period: string = "3_months",
    classId?: string,
    currentMonth?: number,
    currentYear?: number
) {
    try {
        const adminSupabase = createAdminClient();

        let startStr: string;
        let endStr: string;
        const now = new Date();

        if (period === "this_month" && currentMonth && currentYear) {
            startStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
            const endMonth = currentMonth === 12 ? 1 : currentMonth + 1;
            const endYear = currentMonth === 12 ? currentYear + 1 : currentYear;
            endStr = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
        } else {
            let monthsToLookBack = 3;
            if (period === "6_months") monthsToLookBack = 6;
            if (period === "12_months") monthsToLookBack = 12;

            const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToLookBack + 1, 1);
            startStr = startDate.toISOString().split("T")[0];
            endStr = now.toISOString().split("T")[0];
        }

        // 1. Lấy sessions trong khoảng thời gian
        let sessQuery = adminSupabase
            .from("attendance_sessions")
            .select("id, class_id, session_date")
            .gte("session_date", startStr)
            .lt(period === "this_month" ? "session_date" : "session_date", period === "this_month" ? endStr : endStr + "T23:59:59") // If this_month, strictly less than next month. If X_months, lte today.
            .order("session_date", { ascending: true });
        
        if (period !== "this_month") {
            sessQuery = adminSupabase
                .from("attendance_sessions")
                .select("id, class_id, session_date")
                .gte("session_date", startStr)
                .lte("session_date", endStr)
                .order("session_date", { ascending: true });
        }

        if (classId) sessQuery = sessQuery.eq("class_id", classId);

        const { data: sessions, error: sessErr } = await sessQuery;
        if (sessErr) throw sessErr;
        if (!sessions || sessions.length === 0) return { data: [], error: null };

        const sessionIds = sessions.map((s: any) => s.id);

        // 2. Lấy records
        const { data: records, error: recErr } = await adminSupabase
            .from("attendance_records")
            .select("session_id, status")
            .in("session_id", sessionIds);

        if (recErr) throw recErr;
        const allRecords = records || [];

        // Filter sessions that have at least one record (actually marked)
        const recordsBySession = new Map<string, typeof allRecords>();
        for (const record of allRecords) {
            const group = recordsBySession.get(record.session_id) || [];
            group.push(record);
            recordsBySession.set(record.session_id, group);
        }
        const validSessionIds = new Set(recordsBySession.keys());
        const validSessions = sessions.filter((s: any) => validSessionIds.has(s.id));

        // 3. Group sessions
        const weekMap: Record<string, {
            present: number; absent: number; late: number; excused: number; total: number;
        }> = {};
        const sessionsPerPeriod: Record<string, number> = {};

        for (const sess of validSessions) {
            const d = new Date(sess.session_date + "T00:00:00");
            const monthNum = d.getMonth() + 1;
            
            // Tính tuần trong tháng (1-5)
            const weekInMonth = Math.ceil(d.getDate() / 7);
            
            let key = "";
            if (period === "this_month") {
                key = `Tuần ${weekInMonth}`;
            } else if (period === "12_months") {
                key = `Tháng ${monthNum}/${d.getFullYear().toString().slice(2)}`;
            } else {
                key = `Tuần ${weekInMonth} (Th 0${monthNum})`.replace("010", "10").replace("011", "11").replace("012", "12");
            }

            if (!weekMap[key]) {
                weekMap[key] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            }
            sessionsPerPeriod[key] = (sessionsPerPeriod[key] || 0) + 1;

            const sessRecords = recordsBySession.get(sess.id) || [];
            for (const r of sessRecords) {
                weekMap[key].total++;
                if (r.status === "present") weekMap[key].present++;
                else if (r.status === "absent") weekMap[key].absent++;
                else if (r.status === "late") weekMap[key].late++;
                else if (r.status === "excused") weekMap[key].excused++;
            }
        }

        // 4. Chuyển thành mảng sorted cho chart
        const trendData = Object.entries(weekMap).map(([periodKey, counts]) => {
            const relevantTotal = counts.present + counts.absent + counts.excused;
            return {
                period: periodKey,
                presentRate: relevantTotal > 0 ? Math.round((counts.present / relevantTotal) * 100) : 0,
                absentRate: relevantTotal > 0 ? Math.round((counts.absent / relevantTotal) * 100) : 0,
                lateRate: counts.total > 0 ? Math.round((counts.late / counts.total) * 100) : 0,
                excusedRate: relevantTotal > 0 ? Math.round((counts.excused / relevantTotal) * 100) : 0,
                total: counts.total,
                totalPresent: counts.present,
                totalSessions: sessionsPerPeriod[periodKey] || 0,
            };
        });

        // Ensure consecutive weeks/months sorting isn't scrambled for "this_month"
        if (period === "this_month") {
            trendData.sort((a, b) => {
                const wa = parseInt(a.period.replace("Tuần ", ""));
                const wb = parseInt(b.period.replace("Tuần ", ""));
                return wa - wb;
            });
        }

        return { data: trendData, error: null };
    } catch (error: any) {
        console.error("Lỗi getAttendanceTrendData:", error);
        return { data: [], error: error.message };
    }
}

/** Lấy danh sách tất cả lớp (cho filter dropdown của Admin) */
export async function getAllClassesForAdmin() {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("classes")
            .select("id, name, teacher_id, teacher:users!teacher_id(full_name)")
            .order("name", { ascending: true });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Lỗi getAllClassesForAdmin:", error);
        return { data: [], error: error.message };
    }
}

// ==========================================
// TEACHER ATTENDANCE STATS — Thống kê Giáo viên cho Admin
// ==========================================

/** Thống kê điểm danh theo từng giáo viên */
export async function getTeacherAttendanceStats(month: number, year: number, cycle: "month" | "year" | "since_start" = "month") {
    try {
        const adminSupabase = createAdminClient();

        let startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        let endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        if (cycle === "year") {
            startDate = `${year}-01-01`;
            endDate = `${year + 1}-01-01`;
        } else if (cycle === "since_start") {
            startDate = "1970-01-01";
            endDate = "9999-12-31";
        }

        const today = new Date().toISOString().split("T")[0];

        // 1. Lấy tất cả classes (có teacher) — 1 query
        const { data: classes, error: classErr } = await adminSupabase
            .from("classes")
            .select(`
                id, name, teacher_id, status,
                teacher:users!teacher_id(id, full_name, email, avatar_url)
            `)
            .not("teacher_id", "is", null);

        if (classErr) throw classErr;
        if (!classes || classes.length === 0) return { data: [], error: null };

        // 2. Lấy tất cả attendance_sessions trong tháng — 1 query
        const allClassIds = classes.map((c: any) => c.id);
        const { data: sessions } = await adminSupabase
            .from("attendance_sessions")
            .select("id, class_id, teacher_id, session_date, status")
            .in("class_id", allClassIds)
            .gte("session_date", startDate)
            .lt("session_date", endDate);

        const allSessions = sessions || [];

        // 3. Lấy tất cả records cho tính tỷ lệ — 1 query
        const sessionIds = allSessions.map((s: any) => s.id);
        let allRecords: any[] = [];
        if (sessionIds.length > 0) {
            const { data: records } = await adminSupabase
                .from("attendance_records")
                .select("session_id, status")
                .in("session_id", sessionIds);
            allRecords = records || [];
        }

        // Keep only sessions that have records
        const validSessionIds = new Set(allRecords.map(r => r.session_id));
        const validSessions = allSessions.filter(s => validSessionIds.has(s.id));

        // 4. Lấy sessions hôm nay (để check GV chưa điểm danh)
        const { data: todaySessions } = await adminSupabase
            .from("attendance_sessions")
            .select("id, class_id, teacher_id, status")
            .in("class_id", allClassIds)
            .eq("session_date", today);

        const todaySess = todaySessions || [];

        // 5. Lấy class_sessions (lịch dạy) trong tháng — thêm teaching_status & taught_at
        const { data: scheduledSessions } = await adminSupabase
            .from("class_sessions")
            .select("id, class_id, session_date, status, teaching_status, taught_at, actual_teacher_id")
            .in("class_id", allClassIds)
            .gte("session_date", startDate)
            .lt("session_date", endDate);

        const allScheduled = scheduledSessions || [];

        // 5b. Lấy teacher_leave_requests trong tháng
        const { data: leaveRequests } = await adminSupabase
            .from("teacher_leave_requests")
            .select("id, teacher_id, class_id, leave_date, status, admin_action")
            .gte("leave_date", startDate)
            .lt("leave_date", endDate);

        // 6. Aggregate theo teacher
        const teacherMap: Record<string, any> = {};

        for (const cls of classes) {
            const tid = cls.teacher_id;
            if (!tid) continue;

            const teacherObj = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher;

            if (!teacherMap[tid]) {
                teacherMap[tid] = {
                    teacherId: tid,
                    teacherName: teacherObj?.full_name || "Không rõ",
                    teacherEmail: teacherObj?.email || "",
                    avatarUrl: teacherObj?.avatar_url || null,
                    classes: [],
                    totalClasses: 0,
                    totalSessionsConducted: 0,
                    totalSessionsExpected: 0,
                    conductRate: 0,
                    todayPending: false,
                    todayClasses: [] as string[],
                    leaveCount: 0,
                    taughtSessions: [] as { date: string; taughtAt: string; className: string }[],
                };
            }

            // Sessions thực tế của lớp này trong tháng
            const classSessions = validSessions.filter((s: any) => s.class_id === cls.id);
            const classScheduled = allScheduled.filter((s: any) => s.class_id === cls.id);

            // Records cho lớp này
            const classSessionIds = classSessions.map((s: any) => s.id);
            const classRecords = allRecords.filter((r: any) => classSessionIds.includes(r.session_id));
            const presentCount = classRecords.filter((r: any) => r.status === "present").length;
            const absentCount = classRecords.filter((r: any) => r.status === "absent").length;
            const excusedCount = classRecords.filter((r: any) => r.status === "excused").length;
            const relevantTotal = presentCount + absentCount + excusedCount;
            const avgRate = relevantTotal > 0 ? Math.round((presentCount / relevantTotal) * 100) : 0;

            teacherMap[tid].classes.push({
                classId: cls.id,
                className: cls.name,
                classStatus: cls.status,
                totalSessions: classSessions.length,
                expectedSessions: Math.max(classScheduled.length, classSessions.length),
                avgAttendanceRate: avgRate,
                presentCount,
                totalRecords: classRecords.length,
            });

            teacherMap[tid].totalSessionsConducted += classSessions.length;
            teacherMap[tid].totalSessionsExpected += Math.max(classScheduled.length, classSessions.length);

            // Lấy leave requests đã approved cho GV này + lớp này
            const teacherLeaves = (leaveRequests || []).filter((lr: any) =>
                lr.teacher_id === tid && lr.class_id === cls.id && lr.status === "approved"
            );
            teacherMap[tid].leaveCount += teacherLeaves.length;

            // Lấy danh sách buổi đã dạy (có taught_at) để admin xem thời gian
            const taughtScheduled = classScheduled.filter((s: any) =>
                s.teaching_status === "taught" || s.teaching_status === "substitute"
            );
            for (const ts of taughtScheduled) {
                teacherMap[tid].taughtSessions.push({
                    date: ts.session_date,
                    taughtAt: ts.taught_at,
                    className: cls.name,
                    teachingStatus: ts.teaching_status,
                });
            }

            // Check today
            const todayClassSess = todaySess.filter((s: any) => s.class_id === cls.id);
            if (todayClassSess.length === 0) {
                // Kiểm tra xem lớp có lịch hôm nay không
                const todayScheduled = allScheduled.filter((s: any) =>
                    s.class_id === cls.id && s.session_date === today
                );
                if (todayScheduled.length > 0) {
                    teacherMap[tid].todayPending = true;
                    teacherMap[tid].todayClasses.push(cls.name);
                }
            }
        }

        // Tính conduct rate
        const result = Object.values(teacherMap).map((t: any) => {
            t.totalClasses = t.classes.length;
            t.conductRate = t.totalSessionsExpected > 0
                ? Math.round((t.totalSessionsConducted / t.totalSessionsExpected) * 100)
                : 0;
            return t;
        });

        // Sort: GV chưa ĐD hôm nay lên trước, rồi theo tên
        result.sort((a: any, b: any) => {
            if (a.todayPending && !b.todayPending) return -1;
            if (!a.todayPending && b.todayPending) return 1;
            return a.teacherName.localeCompare(b.teacherName);
        });

        return { data: result, error: null };
    } catch (error: any) {
        console.error("Lỗi getTeacherAttendanceStats:", error);
        return { data: [], error: error.message };
    }
}

// ==========================================
// STUDENT CROSS-CLASS ATTENDANCE — Thống kê HS qua tất cả lớp
// ==========================================

/** Thống kê điểm danh xuyên lớp cho từng học sinh */
export async function getStudentCrossClassAttendance(month: number, year: number, cycle: "month" | "year" | "since_start" = "month") {
    try {
        const adminSupabase = createAdminClient();

        let startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        let endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        if (cycle === "year") {
            startDate = `${year}-01-01`;
            endDate = `${year + 1}-01-01`;
        } else if (cycle === "since_start") {
            startDate = "1970-01-01";
            endDate = "9999-12-31";
        }

        // 1. Lấy tất cả enrollments active + student info — 1 query
        const { data: enrollments, error: enrErr } = await adminSupabase
            .from("enrollments")
            .select(`
                student_id, class_id, status,
                student:users!student_id(id, full_name, email, avatar_url),
                class:classes!class_id(id, name)
            `)
            .eq("status", "active");

        if (enrErr) throw enrErr;
        if (!enrollments || enrollments.length === 0) return { data: [], error: null };

        // 2. Lấy tất cả sessions trong tháng — 1 query
        const allClassIds = [...new Set(enrollments.map((e: any) => e.class_id))];
        const { data: sessions } = await adminSupabase
            .from("attendance_sessions")
            .select("id, class_id, session_date")
            .in("class_id", allClassIds)
            .gte("session_date", startDate)
            .lt("session_date", endDate);

        const allSessions = sessions || [];
        if (allSessions.length === 0) return { data: [], error: null };

        // 3. Lấy tất cả records — 1 query
        const sessionIds = allSessions.map((s: any) => s.id);
        const { data: records } = await adminSupabase
            .from("attendance_records")
            .select("session_id, student_id, status, note, marked_at")
            .in("session_id", sessionIds);

        const allRecords = records || [];

        // Keep only sessions that have records
        const validSessionIds = new Set(allRecords.map(r => r.session_id));
        const validSessions = allSessions.filter(s => validSessionIds.has(s.id));

        // 4. Lấy parent link — 1 query
        const allStudentIds = [...new Set(enrollments.map((e: any) => e.student_id))];
        const { data: parentLinks } = await adminSupabase
            .from("parent_students")
            .select("student_id, parent_id, parent:users!parent_id(id, full_name)")
            .in("student_id", allStudentIds);

        const parentMap: Record<string, { parentId: string; parentName: string }> = {};
        for (const pl of (parentLinks || [])) {
            const parentObj = Array.isArray(pl.parent) ? pl.parent[0] : pl.parent;
            parentMap[pl.student_id] = {
                parentId: pl.parent_id,
                parentName: parentObj?.full_name || "Không rõ",
            };
        }

        // 5. Aggregate theo student
        const studentMap: Record<string, any> = {};

        for (const enr of enrollments) {
            const sid = enr.student_id;
            const studentObj = Array.isArray(enr.student) ? enr.student[0] : enr.student;
            const classObj = Array.isArray(enr.class) ? enr.class[0] : enr.class;

            if (!studentMap[sid]) {
                const parent = parentMap[sid];
                studentMap[sid] = {
                    studentId: sid,
                    studentName: studentObj?.full_name || "Không rõ",
                    studentEmail: studentObj?.email || "",
                    avatarUrl: studentObj?.avatar_url || null,
                    parentLinked: !!parent,
                    parentName: parent?.parentName || null,
                    parentId: parent?.parentId || null,
                    classes: [],
                    overall: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
                    alert: "normal" as "normal" | "warning" | "danger",
                    consecutiveAbsent: 0,
                };
            }

            // Tìm sessions cho lớp này
            const classSessions = validSessions.filter((s: any) => s.class_id === enr.class_id);
            const classSessionIds = classSessions.map((s: any) => s.id);

            // Records cho student trong class
            const studentClassRecords = allRecords.filter(
                (r: any) => classSessionIds.includes(r.session_id) && r.student_id === sid
            );

            const present = studentClassRecords.filter((r: any) => r.status === "present").length;
            const absent = studentClassRecords.filter((r: any) => r.status === "absent").length;
            const late = studentClassRecords.filter((r: any) => r.status === "late").length;
            const excused = studentClassRecords.filter((r: any) => r.status === "excused").length;
            const total = studentClassRecords.length;
            // Tỷ lệ chỉ dựa trên Đi học vs Vắng (có phép + không phép), không tính đi muộn
            const relevantTotal = present + absent + excused;
            const rate = relevantTotal > 0 ? Math.round((present / relevantTotal) * 100) : 0;

            studentMap[sid].classes.push({
                classId: enr.class_id,
                className: classObj?.name || "—",
                present, absent, late, excused, total, rate,
            });

            // Cộng dồn overall
            studentMap[sid].overall.present += present;
            studentMap[sid].overall.absent += absent;
            studentMap[sid].overall.late += late;
            studentMap[sid].overall.excused += excused;
            studentMap[sid].overall.total += total;
        }

        // Tính overall rate + alert level + consecutive absent
        const result = Object.values(studentMap).map((s: any) => {
            const o = s.overall;
            // Tỷ lệ chỉ dựa trên Đi học vs Vắng (có phép + không phép), không tính đi muộn
            const relevantTotal = o.present + o.absent + o.excused;
            o.rate = relevantTotal > 0 ? Math.round((o.present / relevantTotal) * 100) : 0;

            const absentRate = o.total > 0 ? (o.absent / o.total) * 100 : 0;
            s.alert = absentRate >= 30 ? "danger" : absentRate >= 20 ? "warning" : "normal";

            // Tính chuỗi vắng liên tiếp gần nhất
            const studentRecords = allRecords
                .filter((r: any) => r.student_id === s.studentId)
                .sort((a: any, b: any) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime());

            let streak = 0;
            for (const r of studentRecords) {
                if (r.status === "absent") streak++;
                else break;
            }
            s.consecutiveAbsent = streak;

            return s;
        });

        // Sort: danger trước, rồi warning, rồi normal, rồi theo tên
        result.sort((a: any, b: any) => {
            const alertOrder = { danger: 0, warning: 1, normal: 2 };
            const diff = (alertOrder[a.alert as keyof typeof alertOrder] || 2) - (alertOrder[b.alert as keyof typeof alertOrder] || 2);
            if (diff !== 0) return diff;
            return a.studentName.localeCompare(b.studentName);
        });

        return { data: result, error: null };
    } catch (error: any) {
        console.error("Lỗi getStudentCrossClassAttendance:", error);
        return { data: [], error: error.message };
    }
}

/** Gửi báo cáo điểm danh tới phụ huynh (tạo notification) */
export async function sendAttendanceReportToParent(data: {
    studentId: string;
    parentId: string;
    studentName: string;
    month: number;
    year: number;
    summary: {
        present: number;
        absent: number;
        late: number;
        excused: number;
        total: number;
        rate: number;
    };
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const s = data.summary;

        const message = `Báo cáo điểm danh tháng ${data.month}/${data.year} của ${data.studentName}:\n` +
            `• Có mặt: ${s.present}/${s.total} buổi\n` +
            `• Vắng: ${s.absent} buổi | Trễ: ${s.late} buổi | Có phép: ${s.excused} buổi\n` +
            `• Tỷ lệ chuyên cần: ${s.rate}%`;

        const { error } = await adminSupabase.from("notifications").insert({
            user_id: data.parentId,
            title: `📋 Báo cáo điểm danh — ${data.studentName}`,
            message,
            type: "attendance_report",
            metadata: {
                studentId: data.studentId,
                month: data.month,
                year: data.year,
                summary: data.summary,
                sentBy: user.id,
            },
        });

        if (error) throw error;
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi sendAttendanceReportToParent:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// DAILY ATTENDANCE OVERVIEW (Theo Ngày)
// ==========================================

/** Lấy tổng quan điểm danh theo 1 ngày cụ thể */
export async function getDailyAttendanceOverview(date: string) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Xác định ngày trong tuần (0 = CN, 1 = T2, ..., 6 = T7)
        const dateObj = new Date(date + "T00:00:00");
        const dayOfWeek = dateObj.getDay(); // JS: 0=Sun, 1=Mon...

        // Lịch cố định và các phiên điểm danh độc lập, tải cùng lúc.
        const schedulesQuery = adminSupabase
            .from("class_schedules")
            .select(`
                id, day_of_week, start_time, end_time,
                room:rooms(name),
                class:classes(
                    id, name, status,
                    teacher:users!classes_teacher_id_fkey(id, full_name)
                )
            `)
            .eq("day_of_week", dayOfWeek)
            .order("start_time");

        const sessionsQuery = adminSupabase
            .from("attendance_sessions")
            .select(`
                id, class_id, session_date, status, start_time, end_time,
                teacher:users!teacher_id(full_name),
                class:classes!class_id(name)
            `)
            .eq("session_date", date);

        const [
            { data: schedules, error: schedErr },
            { data: sessions, error: sessErr },
        ] = await Promise.all([schedulesQuery, sessionsQuery]);
        if (schedErr) throw schedErr;
        if (sessErr) throw sessErr;

        // Exclude inactive classes
        const activeSchedules = (schedules || []).filter((s: any) => {
            const cls = Array.isArray(s.class) ? s.class[0] : s.class;
            return cls && cls.status === "active";
        });

        // 4. Lấy records cho các session trong ngày
        const sessionIds = (sessions || []).map(s => s.id);
        const recordsMap: Record<string, { present: number; absent: number; late: number; excused: number; total: number }> = {};

        if (sessionIds.length > 0) {
            const { data: records, error: recordsErr } = await adminSupabase
                .from("attendance_records")
                .select("session_id, status")
                .in("session_id", sessionIds);
            if (recordsErr) throw recordsErr;

            // Group by session
            for (const r of (records || [])) {
                if (!recordsMap[r.session_id]) {
                    recordsMap[r.session_id] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
                }
                recordsMap[r.session_id].total++;
                if (r.status === "present") recordsMap[r.session_id].present++;
                else if (r.status === "absent") recordsMap[r.session_id].absent++;
                else if (r.status === "late") recordsMap[r.session_id].late++;
                else if (r.status === "excused") recordsMap[r.session_id].excused++;
            }
        }

        // 5. Map sessions by class_id để tra cứu nhanh
        const sessionByClassId: Record<string, any> = {};
        for (const sess of (sessions || [])) {
            sessionByClassId[sess.class_id] = sess;
        }

        // 6. Tạo danh sách kết quả: merge schedule + session
        const classesForDay: any[] = [];
        const processedClassIds = new Set<string>();

        // 6a. Từ lịch cố định
        for (const sched of activeSchedules) {
            const cls = Array.isArray(sched.class) ? sched.class[0] : sched.class;
            if (!cls) continue;
            processedClassIds.add(cls.id);

            const teacher = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher;
            const room = Array.isArray(sched.room) ? sched.room[0] : sched.room;
            const session = sessionByClassId[cls.id];
            const stats = session ? recordsMap[session.id] : null;

            classesForDay.push({
                classId: cls.id,
                className: cls.name,
                teacherName: teacher?.full_name || "—",
                roomName: room?.name || "—",
                startTime: sched.start_time?.slice(0, 5) || "—",
                endTime: sched.end_time?.slice(0, 5) || "—",
                hasSession: !!session,
                sessionId: session?.id || null,
                sessionStatus: session?.status || null,
                attendanceStats: stats || null,
                source: "schedule" as const,
            });
        }

        // 6b. Sessions ngoài lịch (phụ đạo / bù)
        for (const sess of (sessions || [])) {
            if (!processedClassIds.has(sess.class_id)) {
                const teacherObj = Array.isArray(sess.teacher) ? sess.teacher[0] : sess.teacher;
                const stats = recordsMap[sess.id] || null;

                const clsInfo = Array.isArray(sess.class) ? sess.class[0] : sess.class;

                classesForDay.push({
                    classId: sess.class_id,
                    className: clsInfo?.name || sess.class_id.slice(0, 8),
                    teacherName: teacherObj?.full_name || "—",
                    roomName: "—",
                    startTime: sess.start_time?.slice(0, 5) || "—",
                    endTime: sess.end_time?.slice(0, 5) || "—",
                    hasSession: true,
                    sessionId: sess.id,
                    sessionStatus: sess.status,
                    attendanceStats: stats,
                    source: "extra" as const,
                });
            }
        }

        // 7. Sort theo giờ bắt đầu
        classesForDay.sort((a, b) => a.startTime.localeCompare(b.startTime));

        // 8. Tính summary
        const totalClasses = classesForDay.length;
        const completedCount = classesForDay.filter(c => c.hasSession && c.attendanceStats).length;
        const pendingCount = totalClasses - completedCount;

        return {
            data: {
                date,
                dayOfWeek,
                totalClasses,
                completedCount,
                pendingCount,
                classes: classesForDay,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Lỗi getDailyAttendanceOverview:", error);
        return { data: null, error: error.message };
    }
}

// ==========================================
// ADMIN RESET ATTENDANCE DATA
// ==========================================

/** Admin reset toàn bộ ĐD của 1 lớp trong 1 tháng */
export async function resetClassAttendanceData(classId: string, month: number, year: number, cycle: "month" | "year" | "since_start" = "month") {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized", deletedSessions: 0, deletedRecords: 0 };

        // Kiểm tra quyền admin
        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase.from("users").select("role").eq("id", user.id).single();
        if (userData?.role !== "admin") {
            return { success: false, error: "Chỉ Admin mới có quyền reset", deletedSessions: 0, deletedRecords: 0 };
        }

        // Tính khoảng ngày
        let startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        let endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        if (cycle === "year") {
            startDate = `${year}-01-01`;
            endDate = `${year + 1}-01-01`;
        } else if (cycle === "since_start") {
            startDate = "1970-01-01";
            endDate = "9999-12-31";
        }

        // 1. Lấy attendance_sessions của lớp trong tháng
        const { data: sessions } = await adminSupabase
            .from("attendance_sessions")
            .select("id, session_date")
            .eq("class_id", classId)
            .gte("session_date", startDate)
            .lt("session_date", endDate);

        if (!sessions || sessions.length === 0) {
            return { success: true, deletedSessions: 0, deletedRecords: 0, error: null };
        }

        const sessionIds = sessions.map(s => s.id);
        const sessionDates = sessions.map(s => s.session_date);

        // 2. Xoá attendance_records
        const { count: recordCount } = await adminSupabase
            .from("attendance_records")
            .delete({ count: "exact" })
            .in("session_id", sessionIds);

        // 3. Xoá attendance_sessions
        const { count: sessionCount } = await adminSupabase
            .from("attendance_sessions")
            .delete({ count: "exact" })
            .in("id", sessionIds);

        // 4. Revert teaching_status trên class_sessions
        for (const date of sessionDates) {
            await adminSupabase
                .from("class_sessions")
                .update({
                    teaching_status: "pending",
                    actual_teacher_id: null,
                    taught_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("class_id", classId)
                .eq("session_date", date);
        }

        // 5. Xoá attendance_points liên quan
        await adminSupabase
            .from("attendance_points")
            .delete()
            .eq("class_id", classId)
            .in("session_id", sessionIds);

        revalidatePath("/admin/attendance");
        return {
            success: true,
            deletedSessions: sessionCount || 0,
            deletedRecords: recordCount || 0,
            error: null,
        };
    } catch (error: any) {
        console.error("Lỗi resetClassAttendanceData:", error);
        return { success: false, error: error.message, deletedSessions: 0, deletedRecords: 0 };
    }
}

/** Admin reset ĐD của 1 buổi cụ thể */
export async function resetSessionAttendanceData(sessionId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase.from("users").select("role").eq("id", user.id).single();
        if (userData?.role !== "admin") {
            return { success: false, error: "Chỉ Admin mới có quyền reset" };
        }

        // Lấy session info
        const { data: session } = await adminSupabase
            .from("attendance_sessions")
            .select("class_id, session_date")
            .eq("id", sessionId)
            .single();

        if (!session) return { success: false, error: "Không tìm thấy buổi điểm danh" };

        // Xoá records
        await adminSupabase
            .from("attendance_records")
            .delete()
            .eq("session_id", sessionId);

        // Xoá session
        await adminSupabase
            .from("attendance_sessions")
            .delete()
            .eq("id", sessionId);

        // Revert teaching_status
        await adminSupabase
            .from("class_sessions")
            .update({
                teaching_status: "pending",
                actual_teacher_id: null,
                taught_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq("class_id", session.class_id)
            .eq("session_date", session.session_date);

        // Xoá attendance_points
        await adminSupabase
            .from("attendance_points")
            .delete()
            .eq("class_id", session.class_id)
            .eq("session_id", sessionId);

        revalidatePath("/admin/attendance");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi resetSessionAttendanceData:", error);
        return { success: false, error: error.message };
    }
}
