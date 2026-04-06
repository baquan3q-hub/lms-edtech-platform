"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getRooms() {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("rooms")
            .select("*")
            .order("name");

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách phòng:", error);
        return { data: null, error: error.message };
    }
}

export async function getAvailableRooms(dayOfWeek: number, startTime: string, endTime: string, currentScheduleId?: string) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Get all rooms
        const { data: allRooms, error: roomsError } = await adminSupabase
            .from("rooms")
            .select("*");

        if (roomsError) throw roomsError;

        // 2. Get overlapping schedules
        // Logic: Overlaps if (new_start < exist_end) AND (new_end > exist_start)
        let query = adminSupabase
            .from("class_schedules")
            .select("room_id")
            .eq("day_of_week", dayOfWeek)
            .lt("start_time", endTime)
            .gt("end_time", startTime);

        if (currentScheduleId) {
            query = query.neq("id", currentScheduleId); // Ignore the current schedule being edited
        }

        const { data: conflictingSchedules, error: conflictsError } = await query;

        if (conflictsError) throw conflictsError;

        const conflictingRoomIds = new Set(conflictingSchedules.map(cs => cs.room_id).filter(Boolean));

        // 3. Filter available rooms
        const availableRooms = allRooms.filter(room => !conflictingRoomIds.has(room.id));

        return { data: availableRooms, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách phòng trống:", error);
        return { data: null, error: error.message };
    }
}

export async function getClassSchedules(classId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("class_schedules")
            .select(`
                *,
                room:rooms(name, capacity)
            `)
            .eq("class_id", classId)
            .order("day_of_week")
            .order("start_time");

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy lịch học của lớp:", error);
        return { data: null, error: error.message };
    }
}

export async function upsertClassSchedule(scheduleData: {
    id?: string;
    class_id: string;
    room_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    note?: string;
    start_date?: string;
    end_date?: string;
}) {
    try {
        const adminSupabase = createAdminClient();

        // Double check availability to prevent concurrency issues
        const { data: availableRooms, error: availError } = await getAvailableRooms(
            scheduleData.day_of_week,
            scheduleData.start_time,
            scheduleData.end_time,
            scheduleData.id
        );

        if (availError) throw new Error("Không thể kiểm tra phòng trống: " + availError);

        const isStillAvailable = availableRooms?.some(r => r.id === scheduleData.room_id);
        if (!isStillAvailable) {
            throw new Error("Phòng học này vừa có người xếp lịch trùng giờ. Vui lòng chọn phòng khác.");
        }

        // Upsert
        const { data, error } = await adminSupabase
            .from("class_schedules")
            .upsert(scheduleData)
            .select(`*, room:rooms(name)`)
            .single();

        if (error) throw error;

        // Tùy chọn: Sync lại chuỗi 'schedule' dạng text vào bảng `classes` để UI cũ vẫn đọc được
        // Lấy tất cả lịch của lớp này để tạo chuỗi gộp
        const { data: allSchedules } = await adminSupabase
            .from("class_schedules")
            .select("day_of_week, start_time, end_time, room:rooms(name)")
            .eq("class_id", scheduleData.class_id)
            .order("day_of_week");

        if (allSchedules) {
            const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            const scheduleStrings = allSchedules.map(s => {
                const start = s.start_time.substring(0, 5);
                const end = s.end_time.substring(0, 5);
                const roomName = (s.room as any)?.name || "";
                return `${days[s.day_of_week]} ${start}-${end} (${roomName})`;
            });
            const fullScheduleText = scheduleStrings.join(", ");

            await adminSupabase
                .from("classes")
                .update({ schedule: fullScheduleText })
                .eq("id", scheduleData.class_id);
        }

        // Auto-generate class_sessions nếu có start_date + end_date
        if (scheduleData.start_date && scheduleData.end_date) {
            await generateClassSessions(
                scheduleData.class_id,
                scheduleData.day_of_week,
                scheduleData.start_time,
                scheduleData.end_time,
                scheduleData.start_date,
                scheduleData.end_date
            );
            await reindexClassSessions(scheduleData.class_id);
        }

        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lưu lịch học:", error);
        return { data: null, error: error.message };
    }
}

export async function deleteClassSchedule(scheduleId: string, classId: string) {
    try {
        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from("class_schedules")
            .delete()
            .eq("id", scheduleId);

        if (error) throw error;

        // Sync text string again
        const { data: allSchedules } = await adminSupabase
            .from("class_schedules")
            .select("day_of_week, start_time, end_time, room:rooms(name)")
            .eq("class_id", classId)
            .order("day_of_week");

        const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        let fullScheduleText = "";

        if (allSchedules && allSchedules.length > 0) {
            const scheduleStrings = allSchedules.map(s => {
                const start = s.start_time.substring(0, 5);
                const end = s.end_time.substring(0, 5);
                const roomName = (s.room as any)?.name || "";
                return `${days[s.day_of_week]} ${start}-${end} (${roomName})`;
            });
            fullScheduleText = scheduleStrings.join(", ");
        }

        await adminSupabase
            .from("classes")
            .update({ schedule: fullScheduleText || "Chưa có lịch" })
            .eq("id", classId);

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi xóa lịch học:", error);
        return { success: false, error: error.message };
    }
}

// ================= SESSION GENERATION =================

/**
 * Auto-generate class_sessions từ lịch cố định.
 * Duyệt từ start_date → end_date, mỗi ngày khớp day_of_week → INSERT.
 * Skip ngày đã có session (tránh duplicate).
 */
export async function generateClassSessions(
    classId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    startDate: string,
    endDate: string
) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Lấy sessions đã tồn tại để tránh duplicate
        const { data: existingSessions } = await adminSupabase
            .from("class_sessions")
            .select("session_date")
            .eq("class_id", classId);

        const existingDates = new Set(
            (existingSessions || []).map((s: any) => s.session_date)
        );

        // 2. Generate danh sách ngày cần tạo
        const sessionsToInsert: any[] = [];
        const current = new Date(startDate + "T12:00:00"); // Use noon to avoid timezone issues
        const end = new Date(endDate + "T12:00:00");
        let sessionNum = existingSessions?.length || 0;

        // Helper to format date as YYYY-MM-DD without timezone shift
        const formatLocalDate = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        while (current <= end) {
            if (current.getDay() === dayOfWeek) {
                const dateStr = formatLocalDate(current);
                if (!existingDates.has(dateStr)) {
                    sessionNum++;
                    sessionsToInsert.push({
                        class_id: classId,
                        session_date: dateStr,
                        start_time: startTime,
                        end_time: endTime,
                        status: "scheduled",
                        teaching_status: "pending",
                        session_number: sessionNum,
                    });
                }
            }
            current.setDate(current.getDate() + 1);
        }

        // 3. Batch insert
        if (sessionsToInsert.length > 0) {
            const { error } = await adminSupabase
                .from("class_sessions")
                .insert(sessionsToInsert);
            if (error) {
                console.error("[generateClassSessions] INSERT ERROR:", error);
                throw error;
            }
        }

        return { count: sessionsToInsert.length, error: null };
    } catch (error: any) {
        console.error("Lỗi generateClassSessions:", error);
        return { count: 0, error: error.message };
    }
}

/**
 * Reset class_sessions cho 1 lớp.
 * Chỉ xóa sessions CHƯA có attendance_records (bảo toàn dữ liệu ĐD).
 * Sau đó regenerate từ tất cả schedules hiện tại.
 */
export async function resetClassSessions(classId: string) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Lấy danh sách session_ids đã có attendance_records
        const { data: attendedSessions } = await adminSupabase
            .from("attendance_sessions")
            .select("session_date")
            .eq("class_id", classId);

        const attendedDates = new Set(
            (attendedSessions || []).map((s: any) => s.session_date)
        );

        // 2. Lấy tất cả class_sessions của lớp
        const { data: allSessions } = await adminSupabase
            .from("class_sessions")
            .select("id, session_date, lesson_title")
            .eq("class_id", classId);

        // 3. Xóa chỉ sessions chưa có ĐD VÀ chưa có giáo án để bảo toàn dữ liệu
        const idsToDelete = (allSessions || [])
            .filter((s: any) => !attendedDates.has(s.session_date) && !s.lesson_title)
            .map((s: any) => s.id);

        if (idsToDelete.length > 0) {
            const { error } = await adminSupabase
                .from("class_sessions")
                .delete()
                .in("id", idsToDelete);
            if (error) throw error;
        }

        // 4. Lấy tất cả schedules của lớp và regenerate
        const { data: schedules } = await adminSupabase
            .from("class_schedules")
            .select("*")
            .eq("class_id", classId);

        let totalGenerated = 0;
        for (const sched of (schedules || [])) {
            if (sched.start_date && sched.end_date) {
                const { count } = await generateClassSessions(
                    classId,
                    sched.day_of_week,
                    sched.start_time?.substring(0, 5) || "08:00",
                    sched.end_time?.substring(0, 5) || "10:00",
                    sched.start_date,
                    sched.end_date
                );
                totalGenerated += count;
            }
        }

        // Đánh số lại toàn bộ sau khi generate xong để đảm bảo thứ tự Buổi 1, 2, 3... chuẩn thời gian
        await reindexClassSessions(classId);

        revalidatePath(`/admin/classes/${classId}`);

        return {
            deleted: idsToDelete.length,
            generated: totalGenerated,
            preserved: (allSessions || []).length - idsToDelete.length,
            error: null,
        };
    } catch (error: any) {
        console.error("Lỗi resetClassSessions:", error);
        return { deleted: 0, generated: 0, preserved: 0, error: error.message };
    }
}

/**
 * Gán GV dạy thay cho 1 buổi học cụ thể
 */
export async function assignSubstituteTeacher(
    sessionId: string,
    substituteTeacherId: string | null
) {
    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("class_sessions")
            .update({ substitute_teacher_id: substituteTeacherId })
            .eq("id", sessionId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi assignSubstituteTeacher:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Lấy danh sách class_sessions đã generate cho 1 lớp
 */
export async function getGeneratedSessions(classId: string) {
    try {
        const adminSupabase = createAdminClient();
        
        // First try with substitute join
        let data: any[] = [];
        const { data: sessions, error } = await adminSupabase
            .from("class_sessions")
            .select("*")
            .eq("class_id", classId)
            .order("session_date", { ascending: true });

        if (error) throw error;
        data = sessions || [];

        // Separately get substitute teacher names if any have substitute_teacher_id
        const subIds = data
            .filter((s: any) => s.substitute_teacher_id)
            .map((s: any) => s.substitute_teacher_id);

        if (subIds.length > 0) {
            const { data: teachers } = await adminSupabase
                .from("users")
                .select("id, full_name")
                .in("id", subIds);

            const teacherMap = new Map((teachers || []).map((t: any) => [t.id, t]));
            data = data.map((s: any) => ({
                ...s,
                substitute: s.substitute_teacher_id ? teacherMap.get(s.substitute_teacher_id) || null : null,
            }));
        }

        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi getGeneratedSessions:", error);
        return { data: [], error: error.message };
    }
}

// ================= ROOM CRUD =================

export async function createRoom(roomData: { name: string, capacity: number }) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("rooms")
            .insert(roomData)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/rooms");

        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi tạo phòng:", error);
        return { data: null, error: error.message };
    }
}

export async function updateRoom(roomId: string, roomData: { name: string, capacity: number }) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("rooms")
            .update(roomData)
            .eq("id", roomId)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/rooms");

        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi cập nhật phòng:", error);
        return { data: null, error: error.message };
    }
}

export async function deleteRoom(roomId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("rooms")
            .delete()
            .eq("id", roomId);

        if (error) throw error;

        revalidatePath("/admin/rooms");

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi xóa phòng:", error);
        return { success: false, error: error.message };
    }
}

export async function getRoomsWithSchedules() {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("rooms")
            .select(`
                *,
                class_schedules (
                    *,
                    class:classes (
                        name,
                        teacher:users!classes_teacher_id_fkey (
                            full_name
                        )
                    )
                )
            `)
            .order("name");

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách phòng kèm lịch:", error);
        return { data: null, error: error.message };
    }
}

// ================= STUDENT & PARENT WEEKLY SCHEDULE =================
export async function getStudentWeeklySchedule() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy danh sách lớp học sinh đang học
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select("class_id")
            .eq("student_id", user.id)
            .eq("status", "active");

        if (enrollError || !enrollments || enrollments.length === 0) {
            return { data: [], error: null };
        }

        const classIds = enrollments.map(e => e.class_id);

        // Lấy lịch cố định của các lớp này
        const { data, error } = await adminSupabase
            .from("class_schedules")
            .select(`
                *,
                room:rooms(name),
                class:classes(
                    name, 
                    course:courses(name),
                    teacher:users!classes_teacher_id_fkey(full_name)
                )
            `)
            .in("class_id", classIds)
            .order("day_of_week")
            .order("start_time");

        if (error) throw error;
        return { data, error: null };

    } catch (error: any) {
        console.error("Lỗi lấy lịch học hàng tuần cho học sinh:", error);
        return { data: null, error: error.message };
    }
}

export async function getStudentWeeklyScheduleById(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Kiểm tra quyền của phụ huynh với sinh viên này
        const { data: link, error: linkError } = await adminSupabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        // Nếu admin thì cho phép bỏ qua check này (tuỳ chọn), ở đây cứ chặt chẽ yêu cầu có link trừ khi là admin.
        // Thực tế route phụ huynh đã check quyền gọi rồi, ta check lại an toàn.
        if (linkError || !link) {
            // Check nếu là admin
            const { data: userData } = await adminSupabase.from("users").select("role").eq("id", user.id).single();
            if (userData?.role !== "admin") {
                return { data: [], error: "Bạn không có quyền xem thông tin học sinh này" };
            }
        }

        // 2. Lấy danh sách lớp
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select("class_id")
            .eq("student_id", studentId)
            .eq("status", "active");

        if (enrollError || !enrollments || enrollments.length === 0) {
            return { data: [], error: null };
        }

        const classIds = enrollments.map(e => e.class_id);

        // 3. Lấy lịch cố định của các lớp này
        const { data, error } = await adminSupabase
            .from("class_schedules")
            .select(`
                *,
                room:rooms(name),
                class:classes(
                    name, 
                    course:courses(name),
                    teacher:users!classes_teacher_id_fkey(full_name)
                )
            `)
            .in("class_id", classIds)
            .order("day_of_week")
            .order("start_time");

        if (error) throw error;
        return { data, error: null };

    } catch (error: any) {
        console.error("Lỗi lấy lịch học hàng tuần theo studentId:", error);
        return { data: null, error: error.message };
    }
}

export async function getOwnStudentSchedule() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Lấy lớp học sinh đang tham gia
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select("class_id, classes(name, course_id, courses(name, mode))")
            .eq("student_id", user.id)
            .eq("status", "active");

        if (enrollError || !enrollments || enrollments.length === 0) {
            return { data: [], error: null };
        }

        const classIds = enrollments.map(e => e.class_id);

        // 2. Lấy các buổi học của các lớp
        const { data: sessions, error: sessionError } = await adminSupabase
            .from("class_sessions")
            .select("*")
            .in("class_id", classIds)
            .order("session_date", { ascending: true })
            .order("start_time", { ascending: true });

        if (sessionError) throw sessionError;

        // 3. Lấy dữ liệu điểm danh
        const { data: attendanceRecords } = await adminSupabase
            .from("attendance_records")
            .select(`
                status,
                notes,
                session:attendance_sessions!inner(class_id, session_date)
            `)
            .eq("student_id", user.id)
            .in("session.class_id", classIds);

        // 4. Map data điểm danh vào
        const mappedSessions = (sessions || []).map(session => {
            const enrollment = enrollments.find(e => e.class_id === session.class_id);
            const classInfo = Array.isArray(enrollment?.classes) ? enrollment.classes[0] : enrollment?.classes;
            const courseInfo = Array.isArray(classInfo?.courses) ? classInfo.courses[0] : classInfo?.courses;

            const attendance = attendanceRecords?.find(att =>
                att.session &&
                    Array.isArray(att.session) ? att.session[0].class_id === session.class_id && att.session[0].session_date === session.session_date :
                    (att.session as any).class_id === session.class_id && (att.session as any).session_date === session.session_date
            );

            return {
                ...session,
                class_name: classInfo?.name,
                course_name: courseInfo?.name,
                attendance_status: attendance?.status || null,
                attendance_notes: attendance?.notes || null
            };
        });

        mappedSessions.sort((a, b) => {
            if (a.session_date !== b.session_date) return a.session_date.localeCompare(b.session_date);
            return a.start_time.localeCompare(b.start_time);
        });

        return { data: mappedSessions, error: null };
    } catch (error: any) {
        console.error("Lỗi getOwnStudentSchedule:", error);
        return { data: [], error: error.message };
    }
}

// ================= SESSION CONTENT (Giáo án buổi học) =================

export async function updateSessionContent(
    sessionId: string,
    data: {
        lesson_title?: string | null;
        lesson_content?: string | null;
        attachments?: any[];
    }
) {
    try {
        const adminSupabase = createAdminClient();
        const { data: updatedSession, error } = await adminSupabase
            .from("class_sessions")
            .update({
                lesson_title: data.lesson_title,
                lesson_content: data.lesson_content,
                attachments: data.attachments || [],
                updated_at: new Date().toISOString(),
            })
            .eq("id", sessionId)
            .select()
            .single();

        if (error) throw error;
        
        // Cập nhật lại cache (nếu cần đổi path)
        // revalidatePath(`/teacher/classes/`); // Dựa vào param gọi vào
        return { data: updatedSession, error: null };
    } catch (error: any) {
        console.error("Lỗi updateSessionContent:", error);
        return { data: null, error: error.message };
    }
}

/**
 * Đánh số lại session_number cho toàn bộ buổi học của lớp theo đúng thứ tự thời gian
 */
export async function reindexClassSessions(classId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data: allSessions } = await adminSupabase
            .from("class_sessions")
            .select("id, session_date, start_time")
            .eq("class_id", classId);

        if (!allSessions || allSessions.length === 0) return { error: null };

        // Sắp xếp theo ngày tăng dần, giờ tăng dần
        allSessions.sort((a, b) => {
            if (a.session_date !== b.session_date) {
                return new Date(a.session_date).getTime() - new Date(b.session_date).getTime();
            }
            return (a.start_time || "").localeCompare(b.start_time || "");
        });

        // Batch update session_number
        const promises = allSessions.map((session, index) => 
            adminSupabase
                .from("class_sessions")
                .update({ session_number: index + 1 })
                .eq("id", session.id)
        );
        
        await Promise.all(promises);
        return { error: null };
    } catch (error: any) {
        console.error("Lỗi reindexClassSessions:", error);
        return { error: error.message };
    }
}

// ================= TEACHER SYNC SESSIONS =================

/**
 * Giáo viên tự sync sessions cho tất cả lớp mình phụ trách.
 * Quét class_schedules → generate sessions thiếu → reindex.
 */
export async function syncTeacherSessions(_teacherId?: string) {
    try {
        const adminSupabase = createAdminClient();

        // Auto-resolve teacherId from auth session
        let teacherId = _teacherId;
        if (!teacherId) {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { synced: [], totalGenerated: 0, error: "Unauthorized" };
            teacherId = user.id;
        }

        // 1. Lấy tất cả lớp active của GV
        const { data: classes } = await adminSupabase
            .from("classes")
            .select("id, name")
            .eq("teacher_id", teacherId)
            .eq("status", "active");

        if (!classes || classes.length === 0) {
            return { synced: [], totalGenerated: 0, error: null };
        }

        const classIds = classes.map(c => c.id);
        const synced: { className: string; generated: number }[] = [];
        let totalGenerated = 0;

        for (const cls of classes) {
            // Lấy schedules có date range
            const { data: schedules } = await adminSupabase
                .from("class_schedules")
                .select("*")
                .eq("class_id", cls.id)
                .not("start_date", "is", null)
                .not("end_date", "is", null);

            if (!schedules || schedules.length === 0) continue;

            let classGenerated = 0;
            for (const sch of schedules) {
                const { count } = await generateClassSessions(
                    cls.id,
                    sch.day_of_week,
                    sch.start_time?.substring(0, 5) || "08:00",
                    sch.end_time?.substring(0, 5) || "10:00",
                    sch.start_date,
                    sch.end_date
                );
                classGenerated += count;
            }

            // Reindex
            await reindexClassSessions(cls.id);

            if (classGenerated > 0) {
                synced.push({ className: cls.name, generated: classGenerated });
                totalGenerated += classGenerated;
            }
        }

        return { synced, totalGenerated, error: null };
    } catch (error: any) {
        console.error("Lỗi syncTeacherSessions:", error);
        return { synced: [], totalGenerated: 0, error: error.message };
    }
}

// ================= TEACHER AGGREGATED SCHEDULE =================

/**
 * Lấy TẤT CẢ buổi học từ tất cả các lớp mà giáo viên được phân công.
 * Dùng cho trang /teacher/schedule — view tổng hợp.
 */
export async function fetchTeacherAllSessions(teacherId: string) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Lấy danh sách class_id mà GV này dạy
        const { data: classes, error: classError } = await adminSupabase
            .from("classes")
            .select("id, name, course_id, status, courses(name)")
            .eq("teacher_id", teacherId)
            .eq("status", "active");

        if (classError) throw classError;
        if (!classes || classes.length === 0) {
            return { data: [], classes: [], error: null };
        }

        const classIds = classes.map(c => c.id);

        // 2. Lấy tất cả sessions của các lớp này
        const { data: sessions, error: sessionsError } = await adminSupabase
            .from("class_sessions")
            .select("*")
            .in("class_id", classIds)
            .order("session_date", { ascending: true })
            .order("start_time", { ascending: true });

        if (sessionsError) throw sessionsError;

        // 3. Lấy class_schedules để biết phòng học
        const { data: schedules } = await adminSupabase
            .from("class_schedules")
            .select("class_id, day_of_week, start_time, end_time, room:rooms(name)")
            .in("class_id", classIds);

        // 4. Lấy leave requests của GV (defensive — bảng có thể chưa tồn tại)
        let leaveRequests: any[] = [];
        try {
            const { data: lr } = await adminSupabase
                .from("teacher_leave_requests")
                .select("session_id, leave_date, class_id, status")
                .eq("teacher_id", teacherId)
                .in("class_id", classIds)
                .neq("status", "rejected");
            leaveRequests = lr || [];
        } catch {
            // Bảng chưa tồn tại — bỏ qua
        }

        // 5. Map thông tin lớp + phòng vào sessions
        const classMap = new Map(classes.map(c => {
            const course = Array.isArray(c.courses) ? c.courses[0] : c.courses;
            return [c.id, { className: c.name, courseName: (course as any)?.name || "" }];
        }));

        const mappedSessions = (sessions || []).map(session => {
            const classInfo = classMap.get(session.class_id);

            // Tìm phòng từ class_schedules dựa trên day_of_week
            const sessionDate = new Date(session.session_date + "T12:00:00");
            const dayOfWeek = sessionDate.getDay(); // 0=CN, 1=T2...
            const matchingSchedule = (schedules || []).find(
                s => s.class_id === session.class_id && s.day_of_week === dayOfWeek
            );
            const roomName = matchingSchedule ? (matchingSchedule.room as any)?.name : null;

            // Check xin nghỉ
            const leaveReq = (leaveRequests || []).find(
                lr => lr.session_id === session.id || 
                      (lr.class_id === session.class_id && lr.leave_date === session.session_date)
            );

            return {
                ...session,
                class_name: classInfo?.className || "",
                course_name: classInfo?.courseName || "",
                room_name: roomName,
                leave_status: leaveReq?.status || null,
            };
        });

        // 6. Enrich schedules với tên lớp để UI hiển thị lịch cố định
        const enrichedSchedules = (schedules || []).map(sch => {
            const classInfo = classMap.get(sch.class_id);
            return {
                ...sch,
                class_name: classInfo?.className || "",
                course_name: classInfo?.courseName || "",
                room_name: (sch.room as any)?.name || null,
            };
        });

        return { data: mappedSessions, classes, schedules: enrichedSchedules, error: null };
    } catch (error: any) {
        console.error("Lỗi fetchTeacherAllSessions:", error);
        return { data: [], classes: [], schedules: [], error: error.message };
    }
}

