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

        // 3. Lấy dữ liệu điểm để tính trung bình và đếm
        // a. Quizzes (lấy score cao nhất cho mỗi item_id)
        const { data: quizAttempts } = await adminSupabase
            .from("quiz_attempts")
            .select('item_id, score')
            .eq("student_id", user.id)
            .not('score', 'is', null);

        // b. Exams (1 học sinh/1 exam = 1 row)
        const { data: examSubmissions } = await adminSupabase
            .from("exam_submissions")
            .select('exam_id, score, total_points')
            .eq("student_id", user.id)
            .not('score', 'is', null);

        // c. Homework (1 học sinh/1 homework = 1 row, có thể nộp nhiều lần nhưng điểm lưu ở row là mới nhất/cao nhất)
        const { data: homeworkSubmissions } = await adminSupabase
            .from("homework_submissions")
            .select('homework_id, score')
            .eq("student_id", user.id)
            .not('score', 'is', null);

        let totalScores = 0;
        let assignmentCount = 0;

        // Xử lý Quizzes: Group by item_id, lấy max
        const quizScores = new Map<string, number>();
        if (quizAttempts) {
            for (const attempt of quizAttempts) {
                const current = quizScores.get(attempt.item_id) || 0;
                const score = Number(attempt.score) || 0;
                if (score > current) {
                    quizScores.set(attempt.item_id, score);
                }
            }
        }
        for (const score of quizScores.values()) {
            totalScores += score;
            assignmentCount++;
        }

        // Xử lý Exams
        if (examSubmissions) {
            for (const sub of examSubmissions) {
                // Để công bằng, điểm exam nên quy đổi ra hệ quy chiếu nào đó nếu khác thang điểm (hiện tại cộng dồn)
                // Tuy nhiên theo logic cũ: sum(score) / count
                totalScores += Number(sub.score) || 0;
                assignmentCount++;
            }
        }

        // Xử lý Homeworks
        if (homeworkSubmissions) {
            for (const sub of homeworkSubmissions) {
                totalScores += Number(sub.score) || 0;
                assignmentCount++;
            }
        }

        let averageScore = 0;
        if (assignmentCount > 0) {
            averageScore = totalScores / assignmentCount;
        }

        return {
            data: {
                enrolledCount: enrolledCount || 0,
                completedCount: completedCount || 0,
                assignmentsCount: assignmentCount,
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

        // 1. Lấy danh sách lớp đang học
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, class:classes(name, course:courses(name))")
            .eq("student_id", user.id)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) {
            return { data: [], error: null };
        }

        const classIds = enrollments.map(e => e.class_id);
        const classInfoMap = new Map(enrollments.map(e => [e.class_id, e.class as any]));

        // 2. Lấy TẤT CẢ submissions của student (không cần filter theo ID)
        const [examSubsRes, hwSubsRes, quizAttemptsRes] = await Promise.all([
            adminSupabase.from("exam_submissions").select("exam_id, score, total_points, created_at").eq("student_id", user.id),
            adminSupabase.from("homework_submissions").select("homework_id, score, status, submitted_at, attempts").eq("student_id", user.id),
            adminSupabase.from("quiz_attempts").select("item_id, score, submitted_at").eq("student_id", user.id),
        ]);

        // Build submission Maps
        const examSubMap = new Map<string, any>();
        (examSubsRes.data || []).forEach((s: any) => examSubMap.set(s.exam_id, s));

        const hwSubMap = new Map<string, any>();
        (hwSubsRes.data || []).forEach((s: any) => hwSubMap.set(s.homework_id, s));

        const quizSubMap = new Map<string, any>();
        (quizAttemptsRes.data || []).forEach((s: any) => {
            // Lưu điểm cao nhất
            const existing = quizSubMap.get(s.item_id);
            if (!existing || (s.score || 0) > (existing.score || 0)) {
                quizSubMap.set(s.item_id, s);
            }
        });

        // 3. Lấy danh sách Exams
        const { data: exams } = await adminSupabase
            .from("exams")
            .select("id, class_id, title, due_date, duration_minutes, total_points")
            .in("class_id", classIds)
            .eq("is_published", true);

        // 4. Lấy danh sách Homework
        const { data: homeworks } = await adminSupabase
            .from("homework")
            .select("id, class_id, title, due_date, total_points")
            .in("class_id", classIds)
            .eq("is_published", true);

        // 5. Lấy course_items (quiz/assignment)
        const { data: courseItems } = await adminSupabase
            .from("course_items")
            .select("id, class_id, title, type, contents:item_contents(deadline, max_attempts)")
            .in("class_id", classIds)
            .in("type", ["quiz", "assignment"]);

        // 6. Trộn tất cả thành 1 danh sách
        const result: any[] = [];

        // -- Exams --
        (exams || []).forEach((exam: any) => {
            const cls = classInfoMap.get(exam.class_id);
            const sub = examSubMap.get(exam.id);
            result.push({
                id: exam.id,
                class_id: exam.class_id,
                title: exam.title,
                type: "exam",
                className: cls?.name || "Lớp học",
                courseName: cls?.course?.name || "Khóa học",
                deadline: exam.due_date,
                isDone: !!sub, // ĐÃ CÓ SUBMISSION = ĐÃ LÀM
                progress: sub ? {
                    status: "completed",
                    score: sub.score,
                    total_points: sub.total_points || exam.total_points,
                    completed_at: sub.created_at,
                } : null,
            });
        });

        // -- Homework --
        (homeworks || []).forEach((hw: any) => {
            const cls = classInfoMap.get(hw.class_id);
            const sub = hwSubMap.get(hw.id);
            result.push({
                id: hw.id,
                class_id: hw.class_id,
                title: hw.title,
                type: "homework",
                className: cls?.name || "Lớp học",
                courseName: cls?.course?.name || "Khóa học",
                deadline: hw.due_date,
                isDone: !!sub, // ĐÃ CÓ SUBMISSION = ĐÃ LÀM
                progress: sub ? {
                    status: sub.status === 'graded' ? 'completed' : 'submitted',
                    score: sub.score,
                    total_points: hw.total_points,
                    completed_at: sub.submitted_at,
                    attempts: sub.attempts,
                } : null,
            });
        });

        // -- Quizzes / Assignments (course_items) --
        (courseItems || []).forEach((item: any) => {
            const cls = classInfoMap.get(item.class_id);
            const sub = quizSubMap.get(item.id);
            const content = Array.isArray(item.contents) ? item.contents[0] : item.contents;
            result.push({
                id: item.id,
                class_id: item.class_id,
                title: item.title,
                type: item.type,
                className: cls?.name || "Lớp học",
                courseName: cls?.course?.name || "Khóa học",
                deadline: content?.deadline,
                maxAttempts: content?.max_attempts,
                isDone: !!sub, // ĐÃ CÓ ATTEMPT = ĐÃ LÀM
                progress: sub ? {
                    status: "completed",
                    score: sub.score,
                    completed_at: sub.submitted_at,
                } : null,
            });
        });

        // Sắp xếp: hạn gần nhất trước
        result.sort((a, b) => {
            if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        });

        console.log(`[fetchStudentAssignments] Total: ${result.length}, Done: ${result.filter(r => r.isDone).length}, Pending: ${result.filter(r => !r.isDone).length}`);

        return { data: result, error: null };
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

        // 1. Lấy quiz_attempts (có thể bảng chưa tồn tại → bỏ qua)
        let formattedAttempts: any[] = [];
        try {
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

            if (!attemptsError && attempts) {
                formattedAttempts = attempts.map(record => {
                    const clsInfo = Array.isArray(record.item) ? record.item[0]?.class : (record.item as any)?.class;
                    const itemInfo = Array.isArray(record.item) ? record.item[0] : record.item;
                    return {
                        id: record.id,
                        itemId: record.item_id,
                        title: itemInfo?.title || "Bài tập trắc nghiệm",
                        type: "quiz",
                        className: clsInfo?.name || "Lớp học chưa rõ",
                        courseName: clsInfo?.course?.name || "Khóa học",
                        score: record.score,
                        totalPoints: 100, // Quizzes typically default to 100% scale
                        passed: record.passed,
                        submittedAt: record.submitted_at
                    };
                });
            }
        } catch (e) {
            console.warn("quiz_attempts query skipped:", e);
        }

        // 2. Lấy exam_submissions
        let formattedExams: any[] = [];
        try {
            const { data: examSubmissions, error: examsError } = await adminSupabase
                .from("exam_submissions")
                .select(`
                    id, exam_id, score, total_points, time_taken_seconds, created_at,
                    exam:exams(
                        title, class_id,
                        class:classes(name, course:courses(name))
                    )
                `)
                .eq("student_id", user.id)
                .order("created_at", { ascending: false });

            if (!examsError && examSubmissions) {
                formattedExams = examSubmissions.map(record => {
                    const examInfo = Array.isArray(record.exam) ? record.exam[0] : record.exam;
                    const clsInfo = Array.isArray(examInfo?.class) ? examInfo?.class[0] : examInfo?.class;
                    const courseInfo = Array.isArray(clsInfo?.course) ? clsInfo?.course[0] : clsInfo?.course;

                    const percent = Number(record.total_points) > 0 ? (Number(record.score) / Number(record.total_points)) * 100 : 0;
                    const passed = percent >= 50;

                    return {
                        id: record.id,
                        itemId: record.exam_id,
                        title: examInfo?.title || "Bài kiểm tra độc lập",
                        type: "exam",
                        className: clsInfo?.name || "Lớp học chưa rõ",
                        courseName: courseInfo?.name || "Khóa học",
                        score: record.score,
                        totalPoints: record.total_points || 100,
                        passed: passed,
                        submittedAt: record.created_at
                    };
                });
            }
        } catch (e) {
            console.warn("exam_submissions query skipped:", e);
        }

        // 3. Lấy homework_submissions
        let formattedHomework: any[] = [];
        try {
            const { data: hwSubmissions, error: hwError } = await adminSupabase
                .from("homework_submissions")
                .select(`
                    id, homework_id, score, status, submitted_at,
                    homework(
                        title, class_id, total_points,
                        class:classes(name, course:courses(name))
                    )
                `)
                .eq("student_id", user.id)
                .order("submitted_at", { ascending: false });

            if (!hwError && hwSubmissions) {
                formattedHomework = hwSubmissions.map(record => {
                    const hwInfo = Array.isArray(record.homework) ? record.homework[0] : record.homework;
                    const clsInfo = Array.isArray(hwInfo?.class) ? hwInfo?.class[0] : hwInfo?.class;
                    const courseInfo = Array.isArray(clsInfo?.course) ? clsInfo?.course[0] : clsInfo?.course;
                    
                    const scoreNum = Number(record.score) || 0;
                    const totalPointsNum = Number(hwInfo?.total_points) || 100;
                    const percent = totalPointsNum > 0 ? (scoreNum / totalPointsNum) * 100 : 0;
                    const passed = record.status === 'graded' ? percent >= 50 : false;

                    return {
                        id: record.id,
                        itemId: record.homework_id,
                        title: hwInfo?.title || "Bài tập về nhà",
                        type: "homework",
                        className: clsInfo?.name || "Lớp học chưa rõ",
                        courseName: courseInfo?.name || "Khóa học",
                        score: record.score,
                        totalPoints: totalPointsNum,
                        passed: passed,
                        submittedAt: record.submitted_at
                    };
                });
            }
        } catch (e) {
            console.warn("homework_submissions query skipped:", e);
        }

        const formattedGrades = [...formattedAttempts, ...formattedExams, ...formattedHomework].sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

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
                    type: "lesson", // label as lesson
                    totalItems,
                    completedItems: completedInClass,
                    progressPercent: totalItems > 0 ? Math.round((completedInClass / totalItems) * 100) : 0
                });
            }
        }

        // 5. Thêm phần gợi ý Bài tập về nhà (Homework) chưa làm
        const { data: homeworks } = await adminSupabase
            .from("homework")
            .select("id, class_id, title, due_date, total_points")
            .in("class_id", classIds);

        const { data: homeworkSubmissions } = await adminSupabase
            .from("homework_submissions")
            .select("homework_id, status")
            .eq("student_id", user.id);

        const hwSubmittedIds = new Set(homeworkSubmissions?.map(s => s.homework_id) || []);

        if (homeworks) {
            for (const hw of homeworks) {
                // Chỉ gợi ý nếu chưa nộp
                if (!hwSubmittedIds.has(hw.id)) {
                    const enrollment = enrollments.find(e => e.class_id === hw.class_id);
                    if (enrollment) {
                        const classInfo = enrollment.class as any;
                        suggestions.push({
                            classId: hw.class_id,
                            className: classInfo?.name || "Lớp học",
                            courseName: classInfo?.course?.name || "Khóa học",
                            nextItem: { id: hw.id, title: hw.title, type: "homework" },
                            type: "homework",
                            dueDate: hw.due_date,
                            progressPercent: 0 // Placeholder
                        });
                    }
                }
            }
        }

        // 6. Thêm bài kiểm tra (Exams) chưa làm
        const { data: exams } = await adminSupabase
            .from("exams")
            .select("id, class_id, title, due_date")
            .in("class_id", classIds)
            .eq("is_published", true);

        const { data: examSubmissions } = await adminSupabase
            .from("exam_submissions")
            .select("exam_id")
            .eq("student_id", user.id);

        const examSubmittedIds = new Set(examSubmissions?.map(s => s.exam_id) || []);

        if (exams) {
            for (const ex of exams) {
                // Chỉ gợi ý nếu chưa làm
                if (!examSubmittedIds.has(ex.id)) {
                    const enrollment = enrollments.find(e => e.class_id === ex.class_id);
                    if (enrollment) {
                        const classInfo = enrollment.class as any;
                        suggestions.push({
                            classId: ex.class_id,
                            className: classInfo?.name || "Lớp học",
                            courseName: classInfo?.course?.name || "Khóa học",
                            nextItem: { id: ex.id, title: ex.title, type: "quiz" }, // Dùng "quiz" để có màu purple
                            type: "exam",
                            dueDate: ex.due_date || null,
                            progressPercent: 0
                        });
                    }
                }
            }
        }

        // Ưu tiên sắp xếp: 1. Có hạn chót (gần nhất lên trước), 2. Homework/Exams không có hạn chót, 3. Bài học lộ trình
        suggestions.sort((a, b) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            // Cả hai đều không có hạn chót
            const isTaskA = a.type === 'homework' || a.type === 'exam';
            const isTaskB = b.type === 'homework' || b.type === 'exam';
            if (isTaskA && !isTaskB) return -1;
            if (!isTaskA && isTaskB) return 1;
            return 0;
        });

        return { data: suggestions, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy bài học gợi ý:", error);
        return { data: [], error: error.message };
    }
}

/**
 * Lấy thông báo gần đây từ tất cả lớp học sinh đang ghi danh
 */
export async function fetchStudentAnnouncements() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy class IDs từ enrollments
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id")
            .eq("student_id", user.id)
            .eq("status", "active");

        const classIds = (enrollments || []).map((e: any) => e.class_id);
        if (classIds.length === 0) return { data: [], error: null };

        let query = adminSupabase
            .from("announcements")
            .select("id, title, content, resource_type, class_id, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

        if (classIds.length > 0) {
            query = query.or(`class_id.in.(${classIds.join(',')}),scope.eq.system`);
        } else {
            query = query.eq("scope", "system");
        }

        const { data, error } = await query;

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("fetchStudentAnnouncements error:", error);
        return { data: [], error: error.message };
    }
}

/**
 * Lấy Bảng xếp hạng Điểm Học Lực của Lớp
 */
export async function getClassScoreLeaderboard(classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Fetch all enrolled students in the class
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select("student_id, users:users!student_id(id, full_name, email, avatar_url)")
            .eq("class_id", classId)
            .eq("status", "active");

        if (enrollError) throw enrollError;
        if (!enrollments || enrollments.length === 0) return { data: [], error: null };

        const studentIds = enrollments.map(e => e.student_id);

        // 2. Fetch all assignments, exams, homeworks for the class
        const { data: assignments } = await adminSupabase.from("course_items").select("id").eq("class_id", classId).in("type", ["quiz", "assignment"]);
        const { data: exams } = await adminSupabase.from("exams").select("id").eq("class_id", classId);
        const { data: homeworks } = await adminSupabase.from("homework").select("id").eq("class_id", classId);

        const quizIds = assignments?.map(a => a.id) || [];
        const examIds = exams?.map(e => e.id) || [];
        const hwIds = homeworks?.map(h => h.id) || [];

        // 3. Fetch submissions for these students and items
        const { data: quizAttempts } = await adminSupabase.from("quiz_attempts").select("student_id, item_id, score").in("student_id", studentIds).in("item_id", quizIds).not('score', 'is', null);
        const { data: examSubmissions } = await adminSupabase.from("exam_submissions").select("student_id, exam_id, score").in("student_id", studentIds).in("exam_id", examIds).not('score', 'is', null);
        const { data: hwSubmissions } = await adminSupabase.from("homework_submissions").select("student_id, homework_id, score").in("student_id", studentIds).in("homework_id", hwIds).not('score', 'is', null);

        // 4. Aggregate scores per student (using average)
        const studentScoresMap: Record<string, { total: number, count: number }> = {};
        studentIds.forEach(id => studentScoresMap[id] = { total: 0, count: 0 });

        // Handle Quizzes (max score per item)
        const quizMaxMap: Record<string, Record<string, number>> = {}; // student_id -> item_id -> max_score
        (quizAttempts || []).forEach(attempt => {
            if (!quizMaxMap[attempt.student_id]) quizMaxMap[attempt.student_id] = {};
            const current = quizMaxMap[attempt.student_id][attempt.item_id] || 0;
            const score = Number(attempt.score) || 0;
            quizMaxMap[attempt.student_id][attempt.item_id] = Math.max(current, score);
        });

        // Add quizzes to students
        for (const [sId, items] of Object.entries(quizMaxMap)) {
            for (const score of Object.values(items)) {
                if (studentScoresMap[sId]) {
                    studentScoresMap[sId].total += score;
                    studentScoresMap[sId].count++;
                }
            }
        }

        // Add exams
        (examSubmissions || []).forEach(sub => {
            if (studentScoresMap[sub.student_id]) {
                studentScoresMap[sub.student_id].total += Number(sub.score) || 0;
                studentScoresMap[sub.student_id].count++;
            }
        });

        // Add homework
        (hwSubmissions || []).forEach(sub => {
            if (studentScoresMap[sub.student_id]) {
                studentScoresMap[sub.student_id].total += Number(sub.score) || 0;
                studentScoresMap[sub.student_id].count++;
            }
        });

        // 5. Combine and sort
        const leaderboard = enrollments.map((en: any) => {
            const studentUser = Array.isArray(en.users) ? en.users[0] : en.users;
            const stats = studentScoresMap[en.student_id];
            let avgScore = 0;
            if (stats && stats.count > 0) {
                avgScore = stats.total / stats.count;
            }

            return {
                student_id: en.student_id,
                full_name: studentUser?.full_name || "Unknown Student",
                email: studentUser?.email || "",
                avatar_url: studentUser?.avatar_url || null,
                avg_score: Number(avgScore.toFixed(1)),
                total_submissions: stats?.count || 0
            };
        });

        leaderboard.sort((a, b) => b.avg_score - a.avg_score);

        return { data: leaderboard, error: null };
    } catch (error: any) {
        console.error("Error fetching class score leaderboard:", error);
        return { data: [], error: error.message };
    }
}
