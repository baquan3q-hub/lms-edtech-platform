"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lấy danh sách Lớp học mà học sinh đang ghi danh
export async function fetchStudentEnrolledClasses() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from("enrollments")
            .select(`
                id, class_id, status, enrolled_at,
                class:classes (
                    id, name,
                    course:courses (name, description),
                    teacher:users!classes_teacher_id_fkey (full_name),
                    class_schedules (id, day_of_week, start_time, end_time, room:rooms(name))
                )
            `)
            .eq("student_id", user.id)
            .eq("status", "active")
            .order("enrolled_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách lớp của học sinh:", error);
        return { data: null, error: error.message };
    }
}

// Lấy danh sách Bài giảng (Modules) trong một Lớp học
export async function fetchStudentLessons(classId: string) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("lessons")
            .select("id, title, \"order\", published_at, created_at")
            .eq("class_id", classId)
            // .not("published_at", "is", null) // Uncomment if only showing published
            .order("order", { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách bài giảng cho học sinh:", error);
        return { data: null, error: error.message };
    }
}

// Lấy chi tiết MỘT Bài giảng (E-learning Module) kèm Bài tập (Assignments)
export async function fetchStudentLessonDetails(lessonId: string) {
    try {
        const supabase = await createClient();

        // Lấy chi tiết bài giảng
        const { data: lesson, error: lessonError } = await supabase
            .from("lessons")
            .select("*, class:classes(name, course:courses(name))")
            .eq("id", lessonId)
            .single();

        if (lessonError) throw lessonError;

        // Lấy bài tập kèm theo bài giảng
        const { data: assignments, error: assignmentError } = await supabase
            .from("assignments")
            .select("id, title, type, deadline, max_score, status")
            .eq("lesson_id", lessonId)
            .neq("status", "draft")
            .order("created_at", { ascending: false });

        if (assignmentError) throw assignmentError;

        return { data: { lesson, assignments }, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy chi tiết bài giảng:", error);
        return { data: null, error: error.message };
    }
}

// Lấy thống kê tổng quan cho Dashboard học sinh
export async function fetchStudentDashboardStats() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Khóa học đang học
        const { count: enrolledCount } = await adminSupabase
            .from("enrollments")
            .select('*', { count: 'exact', head: true })
            .eq("student_id", user.id)
            .eq("status", "active");

        // 2. Số bài đã hoàn thành
        const { count: completedCount } = await adminSupabase
            .from("student_progress")
            .select('*', { count: 'exact', head: true })
            .eq("student_id", user.id)
            .eq("status", "completed");

        // 3. Bài tập / Trắc nghiệm đã làm
        const { count: assignmentsCount } = await adminSupabase
            .from("quiz_attempts")
            .select('*', { count: 'exact', head: true })
            .eq("student_id", user.id);

        // 4. Điểm trung bình (Dựa trên quiz_attempts có score)
        const { data: attempts } = await adminSupabase
            .from("quiz_attempts")
            .select('score')
            .eq("student_id", user.id)
            .not('score', 'is', null);

        let averageScore = 0;
        if (attempts && attempts.length > 0) {
            const sum = attempts.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
            averageScore = sum / attempts.length;
        }

        return {
            data: {
                enrolledCount: enrolledCount || 0,
                completedCount: completedCount || 0,
                assignmentsCount: assignmentsCount || 0,
                averageScore: averageScore.toFixed(1)
            },
            error: null
        };
    } catch (error: any) {
        console.error("Lỗi lấy thống kê học tập:", error);
        return { data: null, error: error.message };
    }
}

// Lấy danh sách tất cả các bài tập/bài kiểm tra của học sinh trong các lớp đang học
export async function fetchStudentAssignments() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy danh sách class_ids mà học sinh đang học
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, class:classes(name, course:courses(name))")
            .eq("student_id", user.id)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) {
            return { data: [], error: null };
        }

        const classIds = enrollments.map(e => e.class_id);

        // Lấy các course_items là quiz hoặc assignment trong các lớp này
        const { data: assignments, error: itemsError } = await adminSupabase
            .from("course_items")
            .select(`
                id, class_id, title, type,
                contents:item_contents(deadline, max_attempts)
            `)
            .in("class_id", classIds)
            .in("type", ["quiz", "assignment"]);

        if (itemsError) throw itemsError;

        // Lấy tiến độ của học sinh cho các items này
        const itemIds = assignments?.map(a => a.id) || [];
        const { data: progress } = await adminSupabase
            .from("student_progress")
            .select("item_id, status, attempts, score, completed_at")
            .eq("student_id", user.id)
            .in("item_id", itemIds);

        // Trộn dữ liệu
        const enrichedAssignments = assignments?.map(assignment => {
            const classInfo = enrollments.find(e => e.class_id === assignment.class_id)?.class;
            const prog = progress?.find(p => p.item_id === assignment.id);
            const content = Array.isArray(assignment.contents) ? assignment.contents[0] : assignment.contents;

            return {
                ...assignment,
                className: (classInfo as any)?.name || "Lớp học chưa rõ",
                courseName: (classInfo as any)?.course?.name || "Khóa học",
                deadline: content?.deadline,
                maxAttempts: content?.max_attempts,
                progress: prog || null
            };
        });

        // Sắp xếp: Hạn chót gần nhất lên trước NULL (không có hạn)
        enrichedAssignments?.sort((a, b) => {
            if (a.deadline && b.deadline) {
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        });

        return { data: enrichedAssignments, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách bài tập:", error);
        return { data: null, error: error.message };
    }
}

// Lấy danh sách điểm số và lịch sử bài làm của học sinh
export async function fetchStudentGrades() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Lấy tất cả quiz_attempts của user
        const { data: attempts, error: attemptsError } = await adminSupabase
            .from("quiz_attempts")
            .select(`
                id, item_id, score, passed, submitted_at,
                item:course_items(
                    title, class_id,
                    class:classes(name, course:courses(name))
                )
            `)
            .eq("student_id", user.id)
            .order("submitted_at", { ascending: false });

        if (attemptsError) throw attemptsError;

        // Format data để frontend dễ dùng
        const formattedGrades = attempts?.map(record => {
            const clsInfo = Array.isArray(record.item) ? record.item[0]?.class : (record.item as any)?.class;
            const itemInfo = Array.isArray(record.item) ? record.item[0] : record.item;
            return {
                id: record.id,
                itemId: record.item_id,
                title: itemInfo?.title || "Bài kiểm tra",
                className: clsInfo?.name || "Lớp học",
                courseName: clsInfo?.course?.name || "Khóa học",
                score: record.score,
                passed: record.passed,
                submittedAt: record.submitted_at
            };
        });

        return { data: formattedGrades, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách điểm số:", error);
        return { data: null, error: error.message };
    }
}

// Lấy bài học gợi ý tiếp theo (chưa hoàn thành) cho mỗi lớp đang học
export async function fetchSuggestedLessons() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Lấy danh sách lớp đang học
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, class:classes(id, name, course:courses(name))")
            .eq("student_id", user.id)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) return { data: [], error: null };

        const classIds = enrollments.map(e => e.class_id);

        // 2. Lấy tất cả published course_items (không phải folder) trong các lớp
        const { data: allItems } = await adminSupabase
            .from("course_items")
            .select("id, class_id, title, type, order_index, parent_id")
            .in("class_id", classIds)
            .eq("is_published", true)
            .neq("type", "folder")
            .order("order_index", { ascending: true });

        if (!allItems || allItems.length === 0) return { data: [], error: null };

        // 3. Lấy progress của học sinh
        const itemIds = allItems.map(i => i.id);
        const { data: progress } = await adminSupabase
            .from("student_progress")
            .select("item_id, status")
            .eq("student_id", user.id)
            .in("item_id", itemIds);

        const completedIds = new Set(
            (progress || []).filter(p => p.status === 'completed').map(p => p.item_id)
        );

        // 4. Cho mỗi class, tìm bài đầu tiên chưa hoàn thành
        const suggestions: any[] = [];
        for (const enrollment of enrollments) {
            const classItems = allItems
                .filter(i => i.class_id === enrollment.class_id)
                .sort((a, b) => a.order_index - b.order_index);

            const nextItem = classItems.find(i => !completedIds.has(i.id));
            if (nextItem) {
                const classInfo = enrollment.class as any;
                const totalItems = classItems.length;
                const completedInClass = classItems.filter(i => completedIds.has(i.id)).length;

                suggestions.push({
                    classId: enrollment.class_id,
                    className: classInfo?.name || "Lớp học",
                    courseName: classInfo?.course?.name || "Khóa học",
                    nextItem: nextItem,
                    totalItems,
                    completedItems: completedInClass,
                    progressPercent: totalItems > 0 ? Math.round((completedInClass / totalItems) * 100) : 0
                });
            }
        }

        return { data: suggestions, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy bài học gợi ý:", error);
        return { data: [], error: error.message };
    }
}
