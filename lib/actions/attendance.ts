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

        // 2. Xóa session (do DB có on delete cascade nên records cũng thường bị xóa theo, nhưng ta cứ xóa cả 2 cho an toàn)
        // Lưu ý: nên check foreign key `on delete cascade` trong schema table, nếu đã có thì chỉ cần xoá session.
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

        const adminSupabase = createAdminClient();
        const now = new Date().toISOString();

        const recordsToUpsert = records.map((r) => ({
            session_id: sessionId,
            student_id: r.student_id,
            status: r.status,
            note: r.note || null,
            marked_by: user.id,
            marked_at: now,
            updated_by: user.id,
            updated_at: now,
        }));

        const { error } = await adminSupabase
            .from("attendance_records")
            .upsert(recordsToUpsert, { onConflict: "session_id,student_id" });

        if (error) throw error;

        // --- Add Notifications ---
        // 1. Notify students & parents who are absent/late
        for (const r of records) {
            if (r.status === "absent" || r.status === "late") {
                const statusVn = r.status === "absent" ? "vắng mặt" : "đi trễ";
                const message = `Bạn được đánh dấu ${statusVn} trong buổi học ngày hôm nay.`;

                await adminSupabase.from("notifications").insert({
                    user_id: r.student_id,
                    title: `Thông báo điểm danh: ${statusVn}`,
                    message: message,
                    type: "attendance",
                    link: "/student/attendance"
                });

                const { data: parents } = await adminSupabase
                    .from("parent_students")
                    .select("parent_id")
                    .eq("student_id", r.student_id);

                if (parents) {
                    for (const p of parents) {
                        await adminSupabase.from("notifications").insert({
                            user_id: p.parent_id,
                            title: `Thông báo điểm danh con: ${statusVn}`,
                            message: `Con bạn được đánh dấu ${statusVn} trong buổi học hôm nay.`,
                            type: "attendance",
                            link: "/parent"
                        });
                    }
                }
            }
        }

        // 2. Tính toán tổng kết và gửi notification cho Admin
        const presentCount = records.filter(r => r.status === "present").length;
        const absentCount = records.filter(r => r.status === "absent").length;
        const lateCount = records.filter(r => r.status === "late").length;
        const excusedCount = records.filter(r => r.status === "excused").length;
        const totalStudents = records.length;
        const attendanceRate = calcAttendanceRateFormatted(presentCount, lateCount, excusedCount, absentCount);

        // Lấy thông tin lớp và giáo viên
        const { data: classInfo } = await adminSupabase
            .from("classes")
            .select("name, teacher_id, teacher:users!teacher_id(full_name)")
            .eq("id", classId)
            .single();

        const teacherName = classInfo
            ? (Array.isArray(classInfo.teacher) ? classInfo.teacher[0]?.full_name : (classInfo.teacher as any)?.full_name) || "Giáo viên"
            : "Giáo viên";

        const summary = {
            sessionId,
            classId,
            className: classInfo?.name || classId,
            teacherName,
            totalStudents,
            presentCount,
            absentCount,
            lateCount,
            excusedCount,
            attendanceRate,
        };

        // Gửi notification cho tất cả Admin
        const { data: admins } = await adminSupabase
            .from("users")
            .select("id")
            .eq("role", "admin");

        if (admins && admins.length > 0) {
            const adminNotifications = admins.map(admin => ({
                user_id: admin.id,
                title: `Điểm danh hoàn tất — ${summary.className}`,
                message: `GV ${teacherName} vừa điểm danh. Có mặt: ${presentCount}/${totalStudents} (${attendanceRate}%)`,
                type: "attendance_completed",
                metadata: summary,
            }));
            await adminSupabase.from("notifications").insert(adminNotifications);
        }

        // 3. Tính điểm chuyên cần (Gamification)
        const POINTS_RULES: Record<string, number> = {
            present: 10,
            late: 5,
            excused: 8,
            absent: 0,
        };

        const pointsToInsert = records
            .filter(r => POINTS_RULES[r.status] > 0)
            .map(r => ({
                student_id: r.student_id,
                class_id: classId,
                session_id: sessionId,
                points_earned: POINTS_RULES[r.status] || 0,
                reason: r.status,
            }));

        if (pointsToInsert.length > 0) {
            await adminSupabase.from("attendance_points").insert(pointsToInsert);
        }

        // 4. Kiểm tra streak và cấp thành tựu
        for (const r of records) {
            if (r.status === "present") {
                // Đếm chuỗi "present" liên tiếp gần nhất
                const { data: recentRecords } = await adminSupabase
                    .from("attendance_records")
                    .select("status, session:attendance_sessions!session_id(session_date)")
                    .eq("student_id", r.student_id)
                    .order("marked_at", { ascending: false })
                    .limit(10);

                let streak = 0;
                for (const rec of (recentRecords || [])) {
                    if (rec.status === "present") {
                        streak++;
                    } else {
                        break;
                    }
                }

                const streakAchievements = [
                    { min: 10, type: "streak_10", bonus: 80 },
                    { min: 5, type: "streak_5", bonus: 30 },
                    { min: 3, type: "streak_3", bonus: 15 },
                ];

                for (const sa of streakAchievements) {
                    if (streak >= sa.min) {
                        // Upsert achievement (UNIQUE constraint sẽ tự xử lý duplicate)
                        await adminSupabase
                            .from("student_achievements")
                            .upsert({
                                student_id: r.student_id,
                                class_id: classId,
                                achievement_type: sa.type,
                            }, { onConflict: "student_id,class_id,achievement_type" });

                        // Bonus points (chỉ cộng lần đầu tiên đạt streak)
                        const { data: existingBonus } = await adminSupabase
                            .from("attendance_points")
                            .select("id")
                            .eq("student_id", r.student_id)
                            .eq("class_id", classId)
                            .eq("reason", sa.type)
                            .maybeSingle();

                        if (!existingBonus) {
                            await adminSupabase.from("attendance_points").insert({
                                student_id: r.student_id,
                                class_id: classId,
                                session_id: sessionId,
                                points_earned: sa.bonus,
                                reason: sa.type,
                            });
                        }
                    }
                }
            }
        }
        // -------------------------

        revalidatePath(`/teacher/classes/${classId}`);
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
export async function getAttendanceOverview(month: number, year: number, classId?: string) {
    try {
        const adminSupabase = createAdminClient();

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        // Lấy sessions
        let sessionQuery = adminSupabase
            .from("attendance_sessions")
            .select(`
                *,
                class:classes!class_id(id, name, teacher_id,
                    teacher:users!teacher_id(id, full_name)
                )
            `)
            .gte("session_date", startDate)
            .lt("session_date", endDate)
            .order("session_date", { ascending: true });

        if (classId) sessionQuery = sessionQuery.eq("class_id", classId);

        const { data: sessions, error: sessErr } = await sessionQuery;
        if (sessErr) throw sessErr;

        if (!sessions || sessions.length === 0) {
            return {
                data: {
                    totalSessions: 0,
                    avgAttendanceRate: 0,
                    studentsHighAbsence: [],
                    pendingRequests: 0,
                    classSummaries: [],
                },
                error: null,
            };
        }

        const sessionIds = sessions.map((s: any) => s.id);

        // Lấy records
        const { data: records } = await adminSupabase
            .from("attendance_records")
            .select("*")
            .in("session_id", sessionIds);

        const allRecords = records || [];

        // Tính thống kê
        const totalRecords = allRecords.length;
        const presentCount = allRecords.filter((r: any) => r.status === "present").length;
        const avgRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

        // Tính theo lớp
        const classMap: Record<string, any> = {};
        for (const sess of sessions) {
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
                    totalRecords: 0,
                };
            }
            classMap[cid].totalSessions++;

            const sessRecords = allRecords.filter((r: any) => r.session_id === sess.id);
            classMap[cid].totalRecords += sessRecords.length;
            classMap[cid].totalPresent += sessRecords.filter((r: any) => r.status === "present").length;
            classMap[cid].totalAbsent += sessRecords.filter((r: any) => r.status === "absent").length;
        }

        const classSummaries = Object.values(classMap).map((c: any) => ({
            ...c,
            attendanceRate: (() => {
                const lateCount = (allRecords as any[]).filter((r: any) => r.session_id && sessions.find((s: any) => s.id === r.session_id && s.class_id === c.classId) && r.status === 'late').length || 0;
                const excusedCount = (allRecords as any[]).filter((r: any) => r.session_id && sessions.find((s: any) => s.id === r.session_id && s.class_id === c.classId) && r.status === 'excused').length || 0;
                return calcAttendanceRate(c.totalPresent, lateCount, excusedCount, c.totalAbsent);
            })(),
        }));

        // Học sinh vắng nhiều
        const studentAbsences: Record<string, number> = {};
        const studentTotal: Record<string, number> = {};
        for (const r of allRecords) {
            const sid = (r as any).student_id;
            studentTotal[sid] = (studentTotal[sid] || 0) + 1;
            if ((r as any).status === "absent") {
                studentAbsences[sid] = (studentAbsences[sid] || 0) + 1;
            }
        }

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

        // Đơn chờ duyệt
        let pendingQuery = adminSupabase
            .from("absence_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");

        const { count: pendingRequests } = await pendingQuery;

        return {
            data: {
                totalSessions: sessions.length,
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
