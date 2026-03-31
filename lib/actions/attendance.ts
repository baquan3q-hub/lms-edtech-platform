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

/** Lấy dữ liệu xu hướng điểm danh theo tuần (cho LineChart) */
export async function getAttendanceTrendData(
    months: number = 3,
    classId?: string
) {
    try {
        const adminSupabase = createAdminClient();

        // Tính khoảng thời gian: N tháng gần nhất
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        const startStr = startDate.toISOString().split("T")[0];
        const endStr = now.toISOString().split("T")[0];

        // 1. Lấy sessions trong khoảng thời gian
        let sessQuery = adminSupabase
            .from("attendance_sessions")
            .select("id, class_id, session_date")
            .gte("session_date", startStr)
            .lte("session_date", endStr)
            .order("session_date", { ascending: true });

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

        // 3. Group sessions theo tuần
        const weekMap: Record<string, {
            present: number; absent: number; late: number; excused: number; total: number;
        }> = {};

        for (const sess of sessions) {
            const d = new Date(sess.session_date + "T00:00:00");
            const monthNum = d.getMonth() + 1;
            // Tính tuần trong tháng (1-5)
            const weekInMonth = Math.ceil(d.getDate() / 7);
            const key = `T${monthNum}/W${weekInMonth}`;

            if (!weekMap[key]) {
                weekMap[key] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            }

            const sessRecords = allRecords.filter((r: any) => r.session_id === sess.id);
            for (const r of sessRecords) {
                weekMap[key].total++;
                if (r.status === "present") weekMap[key].present++;
                else if (r.status === "absent") weekMap[key].absent++;
                else if (r.status === "late") weekMap[key].late++;
                else if (r.status === "excused") weekMap[key].excused++;
            }
        }

        // 4. Chuyển thành mảng sorted cho chart
        const trendData = Object.entries(weekMap).map(([period, counts]) => ({
            period,
            presentRate: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
            absentRate: counts.total > 0 ? Math.round((counts.absent / counts.total) * 100) : 0,
            lateRate: counts.total > 0 ? Math.round((counts.late / counts.total) * 100) : 0,
            excusedRate: counts.total > 0 ? Math.round((counts.excused / counts.total) * 100) : 0,
            total: counts.total,
        }));

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
export async function getTeacherAttendanceStats(month: number, year: number) {
    try {
        const adminSupabase = createAdminClient();

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

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

        // 4. Lấy sessions hôm nay (để check GV chưa điểm danh)
        const { data: todaySessions } = await adminSupabase
            .from("attendance_sessions")
            .select("id, class_id, teacher_id, status")
            .in("class_id", allClassIds)
            .eq("session_date", today);

        const todaySess = todaySessions || [];

        // 5. Lấy class_sessions (lịch dạy) trong tháng để biết "expected sessions"
        const { data: scheduledSessions } = await adminSupabase
            .from("class_sessions")
            .select("id, class_id, session_date, status")
            .in("class_id", allClassIds)
            .gte("session_date", startDate)
            .lt("session_date", endDate);

        const allScheduled = scheduledSessions || [];

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
                };
            }

            // Sessions thực tế của lớp này trong tháng
            const classSessions = allSessions.filter((s: any) => s.class_id === cls.id);
            const classScheduled = allScheduled.filter((s: any) => s.class_id === cls.id);

            // Records cho lớp này
            const classSessionIds = classSessions.map((s: any) => s.id);
            const classRecords = allRecords.filter((r: any) => classSessionIds.includes(r.session_id));
            const presentCount = classRecords.filter((r: any) => r.status === "present").length;
            const totalRecords = classRecords.length;
            const avgRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

            teacherMap[tid].classes.push({
                classId: cls.id,
                className: cls.name,
                classStatus: cls.status,
                totalSessions: classSessions.length,
                expectedSessions: Math.max(classScheduled.length, classSessions.length),
                avgAttendanceRate: avgRate,
                presentCount,
                totalRecords,
            });

            teacherMap[tid].totalSessionsConducted += classSessions.length;
            teacherMap[tid].totalSessionsExpected += Math.max(classScheduled.length, classSessions.length);

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
export async function getStudentCrossClassAttendance(month: number, year: number) {
    try {
        const adminSupabase = createAdminClient();

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

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
            const classSessions = allSessions.filter((s: any) => s.class_id === enr.class_id);
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
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

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
            o.rate = o.total > 0 ? Math.round((o.present / o.total) * 100) : 0;

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
