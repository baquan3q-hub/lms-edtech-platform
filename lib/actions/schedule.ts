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

