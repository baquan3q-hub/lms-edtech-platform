"use server";

import { requireActor, requireSelfOrRoles } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================
// HELPER: Sinh mã liên kết 6 ký tự (chữ hoa + số)
// ============================================================
function generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Bỏ I,O,0,1 dễ nhầm
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================================
// GUARD: Kiểm tra phụ huynh có quyền xem học sinh không
// ============================================================
export async function canParentViewStudent(parentId: string, studentId: string): Promise<boolean> {
    await requireSelfOrRoles(parentId, ["admin"]);
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("parent_students")
        .select("id")
        .eq("parent_id", parentId)
        .eq("student_id", studentId)
        .single();
    return !!data;
}

// ============================================================
// ADMIN: Lấy danh sách học sinh kèm số PH đã liên kết
// ============================================================
export async function fetchStudentsForLinking() {
    try {
        await requireActor(["admin"]);
        const supabase = createAdminClient();

        // Lấy tất cả students
        const { data: students, error } = await supabase
            .from("users")
            .select("id, full_name, email, avatar_url, invite_code, invite_code_expires_at")
            .eq("role", "student")
            .order("full_name", { ascending: true });

        if (error) throw error;

        // Lấy tất cả liên kết parent-student
        const { data: links } = await supabase
            .from("parent_students")
            .select("student_id, parent_id, relationship, is_primary");

        // Lấy enrollments để biết lớp
        const studentIds = (students || []).map(s => s.id);
        const enrollmentMap: Record<string, string[]> = {};
        if (studentIds.length > 0) {
            const { data: enrollments } = await supabase
                .from("enrollments")
                .select("student_id, class:classes(name)")
                .in("student_id", studentIds);

            if (enrollments) {
                enrollments.forEach((e: any) => {
                    if (!enrollmentMap[e.student_id]) enrollmentMap[e.student_id] = [];
                    if (e.class?.name) enrollmentMap[e.student_id].push(e.class.name);
                });
            }
        }

        // Merge data
        const enriched = (students || []).map(s => ({
            ...s,
            classes: enrollmentMap[s.id] || [],
            parentCount: (links || []).filter(l => l.student_id === s.id).length,
            parents: (links || []).filter(l => l.student_id === s.id),
        }));

        return { data: enriched, error: null };
    } catch (error: any) {
        console.error("Error fetching students for linking:", error);
        return { data: [], error: error.message };
    }
}

// ============================================================
// ADMIN: Lấy chi tiết phụ huynh đã liên kết với 1 học sinh
// ============================================================
export async function fetchLinkedParents(studentId: string) {
    try {
        await requireActor(["admin"]);
        const supabase = createAdminClient();

        const { data: links, error } = await supabase
            .from("parent_students")
            .select("id, parent_id, relationship, is_primary, created_at")
            .eq("student_id", studentId);

        if (error) throw error;

        // Lấy thông tin PH
        const parentIds = (links || []).map(l => l.parent_id);
        let parents: any[] = [];
        if (parentIds.length > 0) {
            const { data } = await supabase
                .from("users")
                .select("id, full_name, email, phone, avatar_url")
                .in("id", parentIds);
            parents = data || [];
        }

        const enriched = (links || []).map(link => ({
            ...link,
            parent: parents.find(p => p.id === link.parent_id) || null,
        }));

        return { data: enriched, error: null };
    } catch (error: any) {
        console.error("Error fetching linked parents:", error);
        return { data: [], error: error.message };
    }
}

// ============================================================
// ADMIN: Tìm kiếm user có role parent
// ============================================================
export async function searchParents(query: string) {
    try {
        await requireActor(["admin"]);
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("users")
            .select("id, full_name, email, phone, avatar_url")
            .eq("role", "parent")
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        return { data: [], error: error.message };
    }
}

// ============================================================
// ADMIN: Liên kết phụ huynh với học sinh
// ============================================================
export async function linkParentToStudent(
    parentId: string,
    studentId: string,
    relationship: string = "Phụ huynh",
    isPrimary: boolean = true
) {
    try {
        await requireActor(["admin"]);
        const supabase = createAdminClient();

        const { error } = await supabase
            .from("parent_students")
            .insert({
                parent_id: parentId,
                student_id: studentId,
                relationship,
                is_primary: isPrimary,
            });

        if (error) {
            if (error.code === '23505') {
                return { error: "Phụ huynh này đã được liên kết với học sinh." };
            }
            throw error;
        }

        revalidatePath("/admin/students/link-parent");
        revalidatePath("/parent");
        return { error: null };
    } catch (error: any) {
        console.error("Error linking parent:", error);
        return { error: error.message };
    }
}

// ============================================================
// ADMIN/PARENT: Xóa liên kết
// ============================================================
export async function unlinkParent(linkId: string) {
    try {
        await requireActor(["admin"]);
        const supabase = createAdminClient();

        const { error } = await supabase
            .from("parent_students")
            .delete()
            .eq("id", linkId);

        if (error) throw error;

        revalidatePath("/admin/students/link-parent");
        revalidatePath("/parent");
        return { error: null };
    } catch (error: any) {
        console.error("Error unlinking parent:", error);
        return { error: error.message };
    }
}

// ============================================================
// ADMIN: Tạo mã liên kết cho học sinh (6 ký tự, hết hạn 7 ngày)
// ============================================================
export async function generateInviteCode(studentId: string) {
    try {
        await requireActor(["admin"]);
        const supabase = createAdminClient();
        const code = generateCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error } = await supabase
            .from("users")
            .update({
                invite_code: code,
                invite_code_expires_at: expiresAt.toISOString(),
            })
            .eq("id", studentId);

        if (error) throw error;

        revalidatePath("/admin/students/link-parent");
        return { code, expiresAt: expiresAt.toISOString(), error: null };
    } catch (error: any) {
        console.error("Error generating invite code:", error);
        return { code: null, expiresAt: null, error: error.message };
    }
}

// ============================================================
// PARENT: Lấy danh sách con em đã liên kết
// ============================================================
export async function fetchMyLinkedStudents() {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { data: [], error: "Chưa đăng nhập" };

        const supabase = createAdminClient();

        const { data: links, error } = await supabase
            .from("parent_students")
            .select("id, student_id, relationship, is_primary, created_at")
            .eq("parent_id", user.id);

        if (error) throw error;

        const studentIds = (links || []).map(l => l.student_id);
        let students: any[] = [];
        if (studentIds.length > 0) {
            const { data } = await supabase
                .from("users")
                .select("id, full_name, email, avatar_url")
                .in("id", studentIds);
            students = data || [];

            // Lấy enrollments
            const { data: enrollments } = await supabase
                .from("enrollments")
                .select("student_id, class:classes(name)")
                .in("student_id", studentIds);

            if (enrollments) {
                students = students.map(s => ({
                    ...s,
                    classes: enrollments
                        .filter((e: any) => e.student_id === s.id)
                        .map((e: any) => e.class?.name)
                        .filter(Boolean),
                }));
            }
        }

        const enriched = (links || []).map(link => ({
            ...link,
            student: students.find(s => s.id === link.student_id) || null,
        }));

        return { data: enriched, error: null };
    } catch (error: any) {
        console.error("Error fetching linked students:", error);
        return { data: [], error: error.message };
    }
}

// ============================================================
// PARENT: Tra cứu invite code
// ============================================================
export async function lookupInviteCode(code: string) {
    try {
        await requireActor(["parent"]);
        const supabase = createAdminClient();

        const { data: student, error } = await supabase
            .from("users")
            .select("id, full_name, email, avatar_url")
            .eq("invite_code", code.toUpperCase().trim())
            .eq("role", "student")
            .single();

        if (error || !student) {
            return { data: null, error: "Mã liên kết không hợp lệ hoặc không tồn tại." };
        }

        // Kiểm tra hết hạn
        const { data: fullUser } = await supabase
            .from("users")
            .select("invite_code_expires_at")
            .eq("id", student.id)
            .single();

        if (fullUser?.invite_code_expires_at) {
            const expiresAt = new Date(fullUser.invite_code_expires_at);
            if (expiresAt < new Date()) {
                return { data: null, error: "Mã liên kết đã hết hạn. Vui lòng liên hệ nhà trường để lấy mã mới." };
            }
        }

        // Lấy thêm lớp học
        const { data: enrollments } = await supabase
            .from("enrollments")
            .select("class:classes(name)")
            .eq("student_id", student.id);

        const classes = (enrollments || []).map((e: any) => e.class?.name).filter(Boolean);

        return { data: { ...student, classes }, error: null };
    } catch (error: any) {
        console.error("Error looking up invite code:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// PARENT: Xac nhan lien ket bang code
// ============================================================
export async function confirmLinkByCode(code: string, relationship: string = "Phụ huynh") {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        // Tìm học sinh bằng code
        const lookupResult = await lookupInviteCode(code);
        if (lookupResult.error || !lookupResult.data) {
            return { error: lookupResult.error || "Không tìm thấy học sinh." };
        }

        const studentId = lookupResult.data.id;

        // Kiểm tra đã liên kết chưa
        const supabase = createAdminClient();
        const { data: existing } = await supabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        if (existing) {
            return { error: "Bạn đã liên kết với học sinh này rồi." };
        }

        // Tạo liên kết
        const { error } = await supabase
            .from("parent_students")
            .insert({
                parent_id: user.id,
                student_id: studentId,
                relationship,
                is_primary: true,
            });

        if (error) throw error;

        revalidatePath("/parent");
        revalidatePath("/parent/link-student");
        return { error: null, studentName: lookupResult.data.full_name };
    } catch (error: any) {
        console.error("Error confirming link:", error);
        return { error: error.message };
    }
}

// ============================================================
// PARENT: Xóa liên kết con em
// ============================================================
export async function unlinkMyStudent(linkId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        // Chỉ xóa liên kết thuộc về parent hiện tại
        const { error } = await supabase
            .from("parent_students")
            .delete()
            .eq("id", linkId)
            .eq("parent_id", user.id);

        if (error) throw error;

        revalidatePath("/parent");
        revalidatePath("/parent/link-student");
        return { error: null };
    } catch (error: any) {
        console.error("Error unlinking student:", error);
        return { error: error.message };
    }
}

// ============================================================
// PARENT DASHBOARD: Lấy dữ liệu dashboard cho 1 học sinh
// ============================================================
// Truy vấn chạy theo đợt (Promise.all) xếp theo phụ thuộc, thay vì ~19 await nối tiếp:
//   Xác thực: user → canParentViewStudent (giữ nguyên, phải xong trước khi đọc bằng admin client)
//   Đợt 1: dữ liệu chỉ cần studentId/user.id
//   Đợt 2: dữ liệu cần classIds hoặc kết quả đợt 1
//   Đợt 3: announcement_reads (nối ngay sau truy vấn announcements, chạy song song phần còn lại của đợt 2)
// Shape trả về giữ nguyên như bản cũ.
export async function fetchParentDashboardData(studentId: string) {
    try {
        const user = await getCurrentUser();
        if (!user) return { data: null, error: "Chưa đăng nhập." };

        // Kiểm tra quyền
        const hasAccess = await canParentViewStudent(user.id, studentId);
        if (!hasAccess) return { data: null, error: "Bạn không có quyền xem thông tin học sinh này." };

        const supabase = createAdminClient();
        const empty = Promise.resolve({ data: null as any });

        // Mốc thời gian (tính trước để các truy vấn đợt 2 dùng được)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // Hàm helper tránh lỗi lệch múi giờ khi dùng toISOString() lúc 00:00
        const formatLocalDate = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };
        const todayStr = formatLocalDate(now);
        // Cần xem lùi lại 1 tuần để lấy các bài "Đã học" gần nhất
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        const lastWeekStr = formatLocalDate(lastWeek);

        // ---------- Đợt 1: chỉ phụ thuộc studentId / user.id ----------
        const [
            { data: student },
            { data: enrollments },
            { data: examSubs },
            { data: notifs },
            { data: quizAttempts },
            { data: examSubmissions },
            { data: homeworkSubmissions },
        ] = await Promise.all([
            // 1. Thông tin học sinh
            supabase
                .from("users")
                .select("id, full_name, email, avatar_url")
                .eq("id", studentId)
                .single(),
            // 2. Lớp học enrolled (kèm tên Course, tên GV)
            supabase
                .from("enrollments")
                .select("class_id, class:classes(id, name, course:courses(name), teacher:users!classes_teacher_id_fkey(full_name))")
                .eq("student_id", studentId)
                .eq("status", "active"),
            // 4. Bài kiểm tra gần đây
            supabase
                .from("exam_submissions")
                .select("id, exam_id, score, total_points, submitted_at, time_taken_seconds")
                .eq("student_id", studentId)
                .order("submitted_at", { ascending: false })
                .limit(10),
            // 5.1 Thông báo hệ thống/khảo sát cho parent
            supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(5),
            // 6. Điểm để tính trung bình
            supabase
                .from("quiz_attempts")
                .select('item_id, score')
                .eq("student_id", studentId)
                .not('score', 'is', null),
            supabase
                .from("exam_submissions")
                .select('exam_id, score, total_points')
                .eq("student_id", studentId)
                .not('score', 'is', null),
            supabase
                .from("homework_submissions")
                .select('homework_id, score')
                .eq("student_id", studentId)
                .not('score', 'is', null),
        ]);

        const classIds = (enrollments || []).map((e: any) => e.class_id);
        const hasClasses = classIds.length > 0;
        const examIds = (examSubs || []).map((s: any) => s.exam_id);
        const notificationAnnIds: string[] = (notifs || [])
            .filter((n: any) => n.metadata?.announcementId)
            .map((n: any) => n.metadata.announcementId);

        let queryStr = "scope.eq.system";
        if (hasClasses) {
            queryStr = `class_id.in.(${classIds.join(',')}),scope.eq.system`;
        }

        // Đợt 3 nối thẳng sau announcements: id cần kiểm đã đọc là tập cha của id cuối cùng
        // (announcement, notification, announcementId trong metadata); lọc chính xác ở dưới.
        const announcementsPromise = Promise.resolve(
            supabase
                .from("announcements")
                .select("id, title, content, created_at, class_id, file_url, video_url, link_url, quiz_data, quiz_id, attachments")
                .or(queryStr)
                .order("created_at", { ascending: false })
                .limit(5)
        );
        const readsPromise = announcementsPromise.then(({ data: anns }) => {
            const candidateIds = [...new Set([
                ...(anns || []).map((a: any) => a.id),
                ...(notifs || []).map((n: any) => n.id),
                ...notificationAnnIds,
            ].filter(Boolean))];
            if (candidateIds.length === 0) return { data: null as any };
            return supabase
                .from("announcement_reads")
                .select("announcement_id")
                .eq("user_id", user.id)
                .in("announcement_id", candidateIds)
                .not("confirmed_at", "is", null);
        });

        // ---------- Đợt 2: cần classIds hoặc kết quả đợt 1 ----------
        const [
            { data: monthAttendance },
            { data: allTimeData },
            { data: schedules },
            { data: realSessions },
            { data: windowAttendance },
            { data: windowAbsenceRequests },
            { data: exams },
            { data: annDetails },
            { data: announcementRows },
            { data: reads },
        ] = await Promise.all([
            // 3. Điểm danh tháng hiện tại
            hasClasses ? supabase
                .from("attendance_records")
                .select(`
                    id,
                    status,
                    note,
                    session:attendance_sessions!inner(session_date, class_id)
                `)
                .eq("student_id", studentId)
                .in("session.class_id", classIds)
                .gte("session.session_date", firstDay)
                .lte("session.session_date", lastDay)
                .order("session(session_date)", { ascending: true }) : empty,
            // 3a. Điểm danh toàn thời gian. KHÔNG giới hạn theo ngày: thẻ "Tổng buổi đã học"
            // là số toàn thời gian, giới hạn sẽ đổi nghĩa số liệu. Chỉ lấy 2 cột cần đếm.
            hasClasses ? supabase
                .from("attendance_records")
                .select(`
                    status,
                    session:attendance_sessions!inner(class_id)
                `)
                .eq("student_id", studentId)
                .in("session.class_id", classIds) : empty,
            // 3b. Lịch cố định hàng tuần (class_schedules)
            hasClasses ? supabase
                .from("class_schedules")
                .select("*, room:rooms(name), class:classes(name, course:courses(name), teacher:users!classes_teacher_id_fkey(full_name))")
                .in("class_id", classIds)
                .order("day_of_week", { ascending: true })
                .order("start_time", { ascending: true }) : empty,
            // 3c. Các buổi Admin đã tạo thực tế (kèm room info)
            hasClasses ? supabase
                .from("class_sessions")
                .select("id, class_id, session_number, session_date, start_time, end_time, topic, homework, lesson_title, lesson_content, attachments, status, room_id, class:classes!class_id(name, course:courses(name), teacher:users!classes_teacher_id_fkey(full_name))")
                .in("class_id", classIds)
                .gte("session_date", lastWeekStr)
                .order("session_date", { ascending: true }) : empty,
            // 3d. Điểm danh từ tuần trước trở đi. Mọi buổi hiển thị đều có ngày >= lastWeekStr,
            // nên đây là tập cha của truy vấn cũ (lọc theo đúng danh sách ngày); ghép theo (ngày, lớp).
            hasClasses ? supabase
                .from("attendance_records")
                .select("status, session:attendance_sessions!inner(session_date, class_id)")
                .eq("student_id", studentId)
                .in("session.class_id", classIds)
                .gte("session.session_date", lastWeekStr) : empty,
            // 3e. Đơn xin nghỉ từ tuần trước trở đi (cùng lý do như 3d)
            hasClasses ? supabase
                .from("absence_requests")
                .select("absence_date, class_id, status")
                .eq("student_id", studentId)
                .in("class_id", classIds)
                .gte("absence_date", lastWeekStr) : empty,
            // 4a. Tên bài kiểm tra cho các bài nộp gần đây
            examIds.length > 0 ? supabase
                .from("exams")
                .select("id, title, class_id")
                .in("id", examIds) : empty,
            // 5.2 Chi tiết announcement gắn với notification
            notificationAnnIds.length > 0 ? supabase
                .from("announcements")
                .select("id, attachments, file_url, video_url, link_url, content")
                .in("id", notificationAnnIds) : empty,
            // 5. Thông báo lớp/hệ thống
            announcementsPromise,
            // Đợt 3
            readsPromise,
        ]);

        // ---------- Xử lý trong bộ nhớ ----------
        // Flatten the nested structure to match previous expected format for frontend
        const attendance: any[] = (monthAttendance || []).map((r: any) => ({
            date: r.session?.session_date,
            status: r.status,
            notes: r.note,
            class_id: r.session?.class_id
        }));
        const allTimeAttendance: any[] = allTimeData || [];
        const upcomingSchedules: any[] = schedules || [];

        let upcomingSessions: any[] = [];
        if (hasClasses) {
            // Tạo bản đồ room_name từ schedules theo class_id
            const classRoomMap: Record<string, string> = {};
            for (const sch of upcomingSchedules) {
                if (sch.room?.name) {
                    classRoomMap[`${sch.class_id}-${sch.day_of_week}`] = sch.room.name;
                }
            }

            const mergedSessions: any[] = (realSessions || []).map((s: any) => {
                // Lấy room_name từ schedule map nếu session không có room riêng
                const dayOfWeek = new Date(s.session_date + 'T00:00:00').getDay();
                const roomKey = `${s.class_id}-${dayOfWeek}`;
                return {
                    ...s,
                    room_name: classRoomMap[roomKey] || null
                };
            });
            const realSessionKeys = new Set(mergedSessions.map(s => `${s.class_id}-${s.session_date}`));

            // Dự phóng lịch từ class_schedules (1 tuần trước + 4 tuần tới)
            for (const schedule of upcomingSchedules) {
                const d = new Date(lastWeek);
                d.setHours(0, 0, 0, 0);

                // Tìm ngày gần nhất khớp với day_of_week (0=CN, 1=T2, ..., 6=T7)
                while (d.getDay() !== schedule.day_of_week) {
                    d.setDate(d.getDate() + 1);
                }

                const roomName = schedule.room?.name || null;

                for (let w = 0; w < 5; w++) {
                    const sessionDate = new Date(d);
                    sessionDate.setDate(d.getDate() + w * 7);
                    const sessionDateStr = formatLocalDate(sessionDate);

                    const key = `${schedule.class_id}-${sessionDateStr}`;

                    // Chỉ thêm vào nếu Admin CHƯA tạo session thực tế cho ngày này
                    if (!realSessionKeys.has(key)) {
                        mergedSessions.push({
                            id: `virtual-${schedule.id}-${sessionDateStr}`,
                            class_id: schedule.class_id,
                            session_number: 0,
                            session_date: sessionDateStr,
                            start_time: schedule.start_time,
                            end_time: schedule.end_time,
                            topic: "Theo lộ trình khóa học",
                            homework: null,
                            status: sessionDateStr < todayStr ? "completed" : "scheduled",
                            class: schedule.class,
                            room_name: roomName,
                            isVirtual: true
                        });
                        realSessionKeys.add(key);
                    }
                }
            }

            // Sắp xếp lại danh sách trộn theo ngày và giờ
            mergedSessions.sort((a, b) => {
                if (a.session_date !== b.session_date) {
                    return a.session_date.localeCompare(b.session_date);
                }
                return a.start_time.localeCompare(b.start_time);
            });

            // Lấy tối đa 15 buổi sắp tới/gần nhất
            const recentAndUpcoming = mergedSessions.filter(s => s.session_date >= lastWeekStr).slice(0, 15);

            // Map (lớp|ngày) → trạng thái điểm danh; giữ bản ghi đầu tiên như .find cũ
            const attendanceByKey = new Map<string, string>();
            for (const a of windowAttendance || []) {
                const sessionData = Array.isArray(a.session) ? a.session[0] : a.session;
                const key = `${sessionData?.class_id}|${sessionData?.session_date}`;
                if (!attendanceByKey.has(key)) attendanceByKey.set(key, a.status);
            }
            const absenceByKey = new Map<string, any>();
            for (const r of windowAbsenceRequests || []) {
                const key = `${r.class_id}|${r.absence_date}`;
                if (!absenceByKey.has(key)) absenceByKey.set(key, r);
            }

            upcomingSessions = recentAndUpcoming.map((s: any) => {
                const key = `${s.class_id}|${s.session_date}`;
                // Nếu ngày đã qua mà không có điểm danh => "unrecorded"
                const isPast = s.session_date < todayStr;
                const session = {
                    ...s,
                    class_name: s.class?.name,
                    course_name: s.class?.course?.name,
                    attendance_status: attendanceByKey.has(key) ? attendanceByKey.get(key) : (isPast ? "unrecorded" : null)
                };
                // Đơn xin nghỉ ghi đè trạng thái điểm danh
                const req = absenceByKey.get(key);
                if (req) {
                    return {
                        ...session,
                        attendance_status: req.status === "approved" ? "excused" : "absence_requested",
                        absence_request_status: req.status
                    };
                }
                return session;
            });
        }

        // Bài kiểm tra gần đây
        let recentExams: any[] = [];
        if (examSubs && examSubs.length > 0) {
            const examMap = new Map((exams || []).map((e: any) => [e.id, e]));
            recentExams = examSubs.map((sub: any) => ({
                ...sub,
                exam: examMap.get(sub.exam_id),
            }));
        }

        // Gắn dữ liệu announcement vào notification
        const announcementMap = new Map<string, any>();
        (annDetails || []).forEach((a: any) => announcementMap.set(a.id, a));
        const recentNotifications: any[] = (notifs || []).map((n: any) => {
            if (n.metadata?.announcementId && announcementMap.has(n.metadata.announcementId)) {
                const ann = announcementMap.get(n.metadata.announcementId);
                return {
                    ...n,
                    message: ann.content || n.message, // Gắn full content
                    attachments: ann.attachments || [],
                    file_url: ann.file_url,
                    video_url: ann.video_url,
                    link_url: ann.link_url,
                    _announcementId: n.metadata.announcementId,
                };
            }
            return n;
        });

        // Loại bỏ announcement trùng
        const enrichedAnnIds = new Set(
            recentNotifications.filter((n: any) => n._announcementId).map((n: any) => n._announcementId)
        );
        const announcements: any[] = (announcementRows || []).filter(
            (a: any) => !enrichedAnnIds.has(a.id)
        );

        // Điểm trung bình: quiz lấy điểm cao nhất theo item_id, exam và homework cộng thẳng
        let totalScores = 0;
        let assignmentCount = 0;
        const quizScores = new Map<string, number>();
        for (const attempt of quizAttempts || []) {
            const current = quizScores.get(attempt.item_id) || 0;
            const score = Number(attempt.score) || 0;
            if (score > current) {
                quizScores.set(attempt.item_id, score);
            }
        }
        for (const score of quizScores.values()) {
            totalScores += score;
            assignmentCount++;
        }
        for (const sub of examSubmissions || []) {
            totalScores += Number(sub.score) || 0;
            assignmentCount++;
        }
        for (const sub of homeworkSubmissions || []) {
            totalScores += Number(sub.score) || 0;
            assignmentCount++;
        }
        const averageScore = assignmentCount > 0 ? totalScores / assignmentCount : 0;

        // Đã xác nhận đọc: chỉ giữ id thuộc danh sách hiển thị (giống bộ lọc .in() cũ)
        const allAnnIds = new Set([...announcements, ...recentNotifications]
            .filter((m: any) => m._announcementId || m.source === 'announcement' || m.id)
            .map((m: any) => m._announcementId || m.id));
        const confirmedAnnouncementIds: string[] = (reads || [])
            .map((r: any) => r.announcement_id)
            .filter((id: string) => allAnnIds.has(id));

        const countStatus = (rows: any[], status: string) => rows.filter((a: any) => a.status === status).length;

        return {
            data: {
                student,
                classes: (enrollments || []).map((e: any) => e.class),
                attendance,
                attendanceSummary: {
                    total: attendance.length,
                    present: countStatus(attendance, 'present'),
                    absent: countStatus(attendance, 'absent'),
                    late: countStatus(attendance, 'late'),
                    excused: countStatus(attendance, 'excused'),
                    allTime: {
                        total: allTimeAttendance.length,
                        present: countStatus(allTimeAttendance, 'present'),
                        absent: countStatus(allTimeAttendance, 'absent'),
                        late: countStatus(allTimeAttendance, 'late'),
                        excused: countStatus(allTimeAttendance, 'excused'),
                    }
                },
                recentExams,
                announcements,
                recentNotifications,
                confirmedAnnouncementIds,
                upcomingSessions,
                upcomingSchedules,
                stats: {
                    averageScore: averageScore.toFixed(1),
                    assignmentsCount: assignmentCount
                }
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetching parent dashboard data:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// PARENT: Fetch all notifications + announcements for parent
// ============================================================
export async function fetchParentNotifications(
    studentId: string,
    options: { limit?: number; offset?: number; filter?: 'all' | 'announcement' | 'system' | 'survey' } = {}
) {
    const { limit = 30, offset = 0, filter = 'all' } = options;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Verify parent-student relationship
        const { data: link } = await adminSupabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        if (!link) return { data: null, error: "Không có quyền xem" };

        // Get student's class IDs
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id")
            .eq("student_id", studentId)
            .eq("status", "active");
        const classIds = (enrollments || []).map((e: any) => e.class_id);

        let notifications: any[] = [];
        let announcements: any[] = [];

        // 1. System notifications for the parent
        if (filter === 'all' || filter === 'system' || filter === 'survey') {
            let nQuery = adminSupabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            
            if (filter === 'survey') {
                nQuery = nQuery.eq("type", "survey");
            }

            const { data: notifData } = await nQuery.range(offset, offset + limit - 1);
            notifications = (notifData || []).map((n: any) => ({
                ...n,
                source: 'notification' as const,
                sort_date: n.created_at,
            }));
        }

        // 2. Class & System announcements
        if ((filter === 'all' || filter === 'announcement' || filter === 'survey')) {
            let queryStr = "scope.eq.system";
            if (classIds.length > 0) {
                queryStr = `class_id.in.(${classIds.join(',')}),scope.eq.system`;
            }

            let aQuery = adminSupabase
                .from("announcements")
                .select("id, title, content, file_url, video_url, link_url, attachments, resource_type, created_at, class_id, scope, teacher:users!announcements_teacher_id_fkey(full_name)")
                .or(queryStr)
                .order("created_at", { ascending: false });

            if (filter === 'survey') {
                aQuery = aQuery.eq("resource_type", "survey");
            }

            const { data: annData } = await aQuery.range(offset, offset + limit - 1);

            // Get class names
            const { data: classes } = await adminSupabase
                .from("classes")
                .select("id, name")
                .in("id", classIds);
            const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));

            announcements = (annData || []).map((a: any) => ({
                ...a,
                source: 'announcement' as const,
                sort_date: a.created_at,
                class_name: classMap.get(a.class_id) || "Lớp học",
                teacher_name: Array.isArray(a.teacher) ? a.teacher[0]?.full_name : a.teacher?.full_name,
            }));
        }

        // Enrich system notifications that have metadata.announcementId
        // để hiển thị file đính kèm và link giống thông báo lớp học
        const announcementIds = notifications
            .filter((n: any) => n.metadata?.announcementId)
            .map((n: any) => n.metadata.announcementId);

        const announcementMap = new Map<string, any>();
        if (announcementIds.length > 0) {
            const { data: annDetails } = await adminSupabase
                .from("announcements")
                .select("id, attachments, file_url, video_url, link_url, content")
                .in("id", announcementIds);

            if (annDetails) {
                annDetails.forEach((a: any) => announcementMap.set(a.id, a));
            }
        }

        // Gắn dữ liệu announcement vào notification
        notifications = notifications.map((n: any) => {
            if (n.metadata?.announcementId && announcementMap.has(n.metadata.announcementId)) {
                const ann = announcementMap.get(n.metadata.announcementId);
                return {
                    ...n,
                    // Gắn full content nếu notification message bị cắt ngắn
                    message: ann.content || n.message,
                    // Gắn file đính kèm từ announcement
                    attachments: ann.attachments || [],
                    file_url: ann.file_url,
                    video_url: ann.video_url,
                    link_url: ann.link_url,
                    // Đánh dấu đây là notification có announcement gốc
                    _announcementId: n.metadata.announcementId,
                };
            }
            return n;
        });

        // Loại bỏ announcement trùng lặp — nếu notification đã link tới announcement đó
        const enrichedAnnIds = new Set(
            notifications.filter((n: any) => n._announcementId).map((n: any) => n._announcementId)
        );
        const dedupedAnnouncements = announcements.filter(
            (a: any) => !enrichedAnnIds.has(a.id)
        );

        // Merge and sort
        const merged = [...notifications, ...dedupedAnnouncements]
            .sort((a, b) => new Date(b.sort_date).getTime() - new Date(a.sort_date).getTime())
            .slice(0, limit);

        // Count unread notifications
        const { count: unreadCount } = await adminSupabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        // Lấy danh sách announcement đã xác nhận xem
        const allAnnIds = merged
            .filter((m: any) => m._announcementId || m.source === 'announcement')
            .map((m: any) => m._announcementId || m.id);

        let confirmedAnnouncementIds: string[] = [];
        if (allAnnIds.length > 0) {
            const { data: reads } = await adminSupabase
                .from("announcement_reads")
                .select("announcement_id")
                .eq("user_id", user.id)
                .in("announcement_id", allAnnIds)
                .not("confirmed_at", "is", null);

            confirmedAnnouncementIds = (reads || []).map((r: any) => r.announcement_id);
        }

        return {
            data: {
                items: merged,
                unreadCount: unreadCount || 0,
                classIds,
                confirmedAnnouncementIds,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetching parent notifications:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// ADMIN: Bulk import liên kết PH-HS từ Excel
// ============================================================
export async function bulkLinkParentStudents(
    rows: { parentEmail: string; studentEmail: string; relationship: string }[]
) {
    try {
        await requireActor(["admin"]);
        const supabase = createAdminClient();

        // Lấy tất cả emails unique
        const allEmails = [...new Set([
            ...rows.map(r => r.parentEmail.toLowerCase()),
            ...rows.map(r => r.studentEmail.toLowerCase()),
        ])];

        const { data: users } = await supabase
            .from("users")
            .select("id, email, role")
            .in("email", allEmails);

        const userMap = new Map((users || []).map(u => [u.email.toLowerCase(), u]));

        const results: { parentEmail: string; studentEmail: string; success: boolean; error?: string }[] = [];

        for (const row of rows) {
            const parent = userMap.get(row.parentEmail.toLowerCase());
            const student = userMap.get(row.studentEmail.toLowerCase());

            if (!parent) {
                results.push({ ...row, success: false, error: `Không tìm thấy PH: ${row.parentEmail}` });
                continue;
            }
            if (parent.role !== "parent") {
                results.push({ ...row, success: false, error: `${row.parentEmail} không phải role "parent"` });
                continue;
            }
            if (!student) {
                results.push({ ...row, success: false, error: `Không tìm thấy HS: ${row.studentEmail}` });
                continue;
            }
            if (student.role !== "student") {
                results.push({ ...row, success: false, error: `${row.studentEmail} không phải role "student"` });
                continue;
            }

            const { error } = await supabase
                .from("parent_students")
                .insert({
                    parent_id: parent.id,
                    student_id: student.id,
                    relationship: row.relationship || "Phụ huynh",
                    is_primary: true,
                });

            if (error) {
                if (error.code === '23505') {
                    results.push({ ...row, success: false, error: "Đã liên kết trước đó" });
                } else {
                    results.push({ ...row, success: false, error: error.message });
                }
            } else {
                results.push({ ...row, success: true });
            }
        }

        revalidatePath("/admin/students/link-parent");
        revalidatePath("/parent");
        return { results, error: null };
    } catch (error: any) {
        console.error("Error bulk linking:", error);
        return { results: [], error: error.message };
    }
}

// ============================================================
// PARENT: Fetch Student Feedback Analysis
// ============================================================
export async function fetchStudentFeedbackForParent(analysisId: string, studentId: string) {
    try {
        const supabaseServer = await createClient();
        const { data: { user } } = await supabaseServer.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Verify parent can view student
        const hasAccess = await canParentViewStudent(user.id, studentId);
        if (!hasAccess) return { data: null, error: "Access denied" };

        // 2. Fetch analysis
        const { data: analysis, error: analysisError } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("*, exam:exams!exam_id(title, class_id)")
            .eq("id", analysisId)
            .eq("student_id", studentId)
            .single();

        if (analysisError || !analysis) throw new Error("Feedback not found");

        // 3. Fetch progress
        const { data: progress } = await adminSupabase
            .from("improvement_progress")
            .select("*")
            .eq("analysis_id", analysisId)
            .eq("student_id", studentId)
            .order("task_index", { ascending: true });

        // 4. Fetch supplementary quizzes (if any exist)
        const { data: supQuizzes } = await adminSupabase
            .from("supplementary_quizzes")
            .select("*")
            .eq("analysis_id", analysisId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false });

        return { 
            data: { 
                ...analysis, 
                progress: progress || [],
                supQuizzes: supQuizzes || []
            }, 
            error: null 
        };
    } catch (error: any) {
        console.error("Error fetching feedback for parent:", error);
        return { data: null, error: error.message };
    }
}
