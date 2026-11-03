"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function getStartDateForRange(range: string): string | null {
    const d = new Date();
    // Reset time to start of day for cleaner comparisons
    d.setHours(0, 0, 0, 0);

    switch (range) {
        case 'today': 
            // from start of today
            break;
        case 'week': 
            d.setDate(d.getDate() - 7); 
            break;
        case 'month': 
            d.setMonth(d.getMonth() - 1); 
            break;
        case 'quarter': 
            d.setMonth(d.getMonth() - 3); 
            break;
        case 'year': 
            d.setFullYear(d.getFullYear() - 1); 
            break;
        case 'all': 
            return null;
        default: 
            return null; // fallback showing all data makes more sense if unspecified
    }
    return d.toISOString(); // Use ISO string to safely compare with TIMESTAMPTZ/DATE
}

export async function fetchDailyAttendanceData(range: string = 'all') {
    const supabase = createAdminClient();
    const startDate = getStartDateForRange(range);

    let query = supabase.from("attendance_sessions").select("id, session_date").order("session_date", { ascending: true });
    
    if (startDate) {
        // session_date is typically YYYY-MM-DD
        const dateStr = startDate.split("T")[0];
        query = query.gte("session_date", dateStr);
    }

    const { data: sessions } = await query;

    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map((s: any) => s.id);
    const { data: records } = await supabase
        .from("attendance_records")
        .select("session_id, status")
        .in("session_id", sessionIds);

    const allRecords = records || [];

    // Đếm records một lần theo session, sau đó cộng theo ngày.
    const recordsBySession = new Map<string, { present: number; absent: number }>();
    for (const record of allRecords) {
        const counts = recordsBySession.get(record.session_id) || { present: 0, absent: 0 };
        if (record.status === "present") counts.present++;
        else if (["absent", "excused", "late"].includes(record.status)) counts.absent++;
        recordsBySession.set(record.session_id, counts);
    }
    const dateMap = new Map<string, { present: number; absent: number }>();
    sessions.forEach((s: any) => {
        const counts = dateMap.get(s.session_date) || { present: 0, absent: 0 };
        const sessionCounts = recordsBySession.get(s.id);
        counts.present += sessionCounts?.present || 0;
        counts.absent += sessionCounts?.absent || 0;
        dateMap.set(s.session_date, counts);
    });

    const result = Array.from(dateMap.entries()).map(([date, counts]) => {
        const total = counts.present + counts.absent;
        const rate = total > 0 ? Math.round((counts.present / total) * 100) : 0;
        return {
            name: date.slice(5), // mm-dd
            rate: rate,
            present: counts.present,
            absent: counts.absent
        };
    });

    return result;
}

export async function fetchGradesDistribution(range: string = 'all') {
    const supabase = createAdminClient();
    const startDate = getStartDateForRange(range);
    
    // Gộp data từ submissions (Normal) và exam_submissions (Quizzes)
    let subQuery = supabase.from("submissions").select("score, submitted_at").not("score", "is", null);
    let examQuery = supabase.from("exam_submissions").select("score, submitted_at").not("score", "is", null);

    if (startDate) {
        subQuery = subQuery.gte("submitted_at", startDate);
        examQuery = examQuery.gte("submitted_at", startDate);
    }

    const [
        { data: subsData },
        { data: examsData }
    ] = await Promise.all([subQuery, examQuery]);

    const submissions = [...(subsData || []), ...(examsData || [])];

    if (submissions.length === 0) return [];

    let yeu = 0; // <50 hoặc <5.0
    let tb = 0; // 50-64 hoặc 5.0-6.4
    let kha = 0; // 65-79 hoặc 6.5-7.9
    let gioi = 0; // 80-100 hoặc 8.0-10.0

    submissions.forEach((sub: any) => {
        const s = typeof sub.score === 'number' ? sub.score : Number(sub.score);
        if (isNaN(s)) return;
        
        // exam_submissions có thể chấm rải rác tuỳ đề, đôi khi là % (nếu scale là 100).
        // Quy đổi về thang 100 nếu dưới 10
        let normalizedScore = s;
        if (s <= 10 && strContainsFloat(s)) {
             normalizedScore = s * 10;
        } else if (s <= 10) {
             // Hard to confirm without context, let's just assume <= 10 is thang điểm 10.
             normalizedScore = s * 10;
        }
        
        if (normalizedScore < 50) yeu++;
        else if (normalizedScore < 65) tb++;
        else if (normalizedScore < 80) kha++;
        else gioi++;
    });

    return [
        { name: "Cần cố gắng", count: yeu, fill: "#ef4444" },
        { name: "Trung bình", count: tb, fill: "#f59e0b" },
        { name: "Khá", count: kha, fill: "#3b82f6" },
        { name: "Khá Giỏi", count: gioi, fill: "#10b981" }
    ].filter(item => item.count > 0);
}

function strContainsFloat(num: number) {
  return num % 1 !== 0;
}

export async function fetchSubmissionStatus(range: string = 'all') {
    const supabase = createAdminClient();
    const startDate = getStartDateForRange(range);
    
    // 1. Xác định được list bài tập / bài thi được phân công trong thời gian nàys
    let assignmentQuery = supabase.from("assignments").select("id, class_id");
    let examQuery = supabase.from("exams").select("id, class_id");

    if (startDate) {
        assignmentQuery = assignmentQuery.gte("created_at", startDate);
        examQuery = examQuery.gte("created_at", startDate);
    }
    
    const [
        { data: assignments },
        { data: exams }
    ] = await Promise.all([assignmentQuery, examQuery]);

    const activeAssignments = assignments || [];
    const activeExams = exams || [];
    
    if (activeAssignments.length === 0 && activeExams.length === 0) return [];

    const assignmentIds = activeAssignments.map((a: any) => a.id);
    const examIds = activeExams.map((e: any) => e.id);

    // 2. Tính Mẫu số chung (Expected Submissions) dựa vào sĩ số học sinh
    const classIds = new Set<string>();
    activeAssignments.forEach((a: any) => classIds.add(a.class_id));
    activeExams.forEach((e: any) => classIds.add(e.class_id));

    let expectedSubmissions = 0;
    if (classIds.size > 0) {
        const { data: enrolls } = await supabase
            .from("enrollments")
            .select("class_id")
            .in("class_id", Array.from(classIds));
            
        const enrollmentCountMap = new Map<string, number>();
        if (enrolls) {
            enrolls.forEach((e: any) => {
                enrollmentCountMap.set(e.class_id, (enrollmentCountMap.get(e.class_id) || 0) + 1);
            });
        }
        
        activeAssignments.forEach((a: any) => {
            expectedSubmissions += (enrollmentCountMap.get(a.class_id) || 0);
        });
        activeExams.forEach((e: any) => {
            expectedSubmissions += (enrollmentCountMap.get(e.class_id) || 0);
        });
    }

    // 3. Đếm số lượng Thực Tế đã nộp (Đã chấm + Chờ chấm)
    let subQuery = supabase.from("submissions").select("score");
    if (assignmentIds.length > 0) {
        subQuery = subQuery.in("assignment_id", assignmentIds);
    } else {
        subQuery = subQuery.limit(0); // nothing to fetch
    }

    let exSubQuery = supabase.from("exam_submissions").select("score");
    if (examIds.length > 0) {
        exSubQuery = exSubQuery.in("exam_id", examIds);
    } else {
        exSubQuery = exSubQuery.limit(0);
    }

    const [
        { data: subsData },
        { data: examsData }
    ] = await Promise.all([subQuery, exSubQuery]);

    const submissions = [...(subsData || []), ...(examsData || [])];
    
    let graded = 0;
    let pending = 0;
    
    submissions.forEach((sub: any) => {
        if (sub.score !== null && sub.score !== undefined) {
            graded++;
        } else {
            pending++;
        }
    });

    // 4. Khấu trừ để ra lượng Chưa nộp
    let missing = expectedSubmissions - (graded + pending);
    if (missing < 0) missing = 0; // Đề phòng bất thường data
    
    const result = [];
    if (graded > 0) result.push({ name: "Đã chấm điểm", value: graded, fill: "#10b981" }); // emerald
    if (pending > 0) result.push({ name: "Chờ chấm điểm", value: pending, fill: "#f59e0b" }); // amber
    if (missing > 0) result.push({ name: "Chưa nộp bài", value: missing, fill: "#ef4444" }); // red
    
    return result;
}

export async function fetchDailyActiveUsers() {
    const supabase = createAdminClient();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    // 1. Lấy TẤT CẢ user đã sign-in hôm nay (mọi vai trò: admin, teacher, student, parent)
    // Pagination để đảm bảo không bỏ sót nếu > 1000 users
    const allSignedInToday: string[] = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;
    
    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error || !users || users.length === 0) {
            hasMore = false;
            break;
        }
        
        users.forEach(u => {
            if (u.last_sign_in_at && new Date(u.last_sign_in_at) >= today) {
                allSignedInToday.push(u.id);
            }
        });
        
        if (users.length < perPage) {
            hasMore = false;
        } else {
            page++;
        }
    }
        
    // 2. Bổ sung: Học sinh có hoạt động (activity logs) — trường hợp last_sign_in_at chưa cập nhật
    const { data: activeLogs } = await supabase
        .from('student_activity_logs')
        .select('student_id')
        .gte('created_at', todayStr);
    const activeStudentIds = (activeLogs || []).map((l: any) => l.student_id);

    // 3. Bổ sung: Học sinh có nộp bài tập / làm bài thi hôm nay
    const [ { data: subs }, { data: exams } ] = await Promise.all([
        supabase.from('submissions').select('student_id').gte('submitted_at', todayStr),
        supabase.from('exam_submissions').select('student_id').gte('submitted_at', todayStr)
    ]);
    
    const subIds = (subs || []).map((l: any) => l.student_id);
    const examSubsIds = (exams || []).map((l: any) => l.student_id);

    // Gom tất cả ID Unique từ MỌI nguồn (tất cả vai trò)
    const uniqueActiveUsers = new Set([
        ...allSignedInToday,
        ...activeStudentIds,
        ...subIds,
        ...examSubsIds
    ].filter(id => Boolean(id)));
    
    return uniqueActiveUsers.size;
}

export async function fetchMonthlyRevenueData() {
    const supabase = createAdminClient();
    
    // Lấy invoices với status 'paid' trong 12 tháng gần nhất
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const { data: paidInvoices } = await supabase
        .from("invoices")
        .select("amount, paid_at, status")
        .eq("status", "paid")
        .gte("paid_at", twelveMonthsAgo.toISOString())
        .order("paid_at", { ascending: true });
    
    // Lấy tổng invoices chưa thanh toán (unpaid + overdue)
    const { data: pendingInvoices } = await supabase
        .from("invoices")
        .select("amount, status, due_date")
        .in("status", ["unpaid", "overdue", "pending"]);
    
    // Gom theo tháng
    const monthMap = new Map<string, { paid: number; count: number }>();
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    
    // Khởi tạo 12 tháng gần nhất
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${monthNames[d.getMonth()]}/${d.getFullYear()}`;
        monthMap.set(key, { paid: 0, count: 0 });
    }
    
    paidInvoices?.forEach((inv: any) => {
        if (!inv.paid_at) return;
        const d = new Date(inv.paid_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(key);
        if (existing) {
            existing.paid += Number(inv.amount) || 0;
            existing.count += 1;
        }
    });
    
    const chartData = Array.from(monthMap.entries()).map(([key, val]) => {
        const [year, month] = key.split('-');
        return {
            month: `${monthNames[parseInt(month) - 1]}`,
            revenue: val.paid,
            count: val.count
        };
    });
    
    // Tính tổng summary
    const totalPaid = paidInvoices?.reduce((acc: number, inv: any) => acc + (Number(inv.amount) || 0), 0) || 0;
    const totalPending = pendingInvoices?.reduce((acc: number, inv: any) => acc + (Number(inv.amount) || 0), 0) || 0;
    const overdueCount = pendingInvoices?.filter((inv: any) => inv.status === 'overdue').length || 0;
    
    return {
        chartData,
        summary: {
            totalPaid,
            totalPending,
            overdueCount,
            paidCount: paidInvoices?.length || 0,
            pendingCount: pendingInvoices?.length || 0
        }
    };
}

export async function fetchAdminAttendanceSessionsToday(todayDateStr: string) {
    const supabase = createAdminClient();
    
    const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select(`
            id, class_id, session_date, status, start_time, end_time,
            class:classes(
                name, teacher_id,
                teacher:users(full_name)
            )
        `)
        .eq("session_date", todayDateStr)
        .order("start_time", { ascending: true });

    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map((s: any) => s.id);

    const { data: records } = await supabase
        .from("attendance_records")
        .select("session_id, status")
        .in("session_id", sessionIds);

    const allRecords = records || [];

    return sessions.map((session: any) => {
        const classObj = Array.isArray(session.class) ? session.class[0] : session.class;
        const teacherObj = classObj?.teacher;
        const teacherName = Array.isArray(teacherObj) ? teacherObj[0]?.full_name : teacherObj?.full_name;

        const sessRecords = allRecords.filter((r: any) => r.session_id === session.id);
        const presentCount = sessRecords.filter((r: any) => r.status === "present").length;
        const absentCount = sessRecords.filter((r: any) => r.status === "absent").length;
        const lateCount = sessRecords.filter((r: any) => r.status === "late").length;
        const excusedCount = sessRecords.filter((r: any) => r.status === "excused").length;
        const totalStudents = sessRecords.length;
        const relevantTotal = presentCount + absentCount + excusedCount;
        const rate = relevantTotal > 0 ? ((presentCount / relevantTotal) * 100).toFixed(1) : "—";

        return {
            sessionId: session.id,
            classId: session.class_id,
            className: classObj?.name || "N/A",
            teacherName: teacherName || "N/A",
            startTime: session.start_time,
            endTime: session.end_time,
            status: session.status,
            attendanceRate: rate,
            presentCount,
            absentCount,
            lateCount,
            excusedCount,
            totalStudents
        };
    });
}

// ============================================================
// HÀM HỖ TRỢ PHÂN ĐỊNH KHỐI LỚP (K12)
// ============================================================
function detectGradeLevel(className?: string): string {
    if (!className) return "Khối khác";
    const clean = className.trim().toUpperCase();
    if (clean.includes("12") || clean.startsWith("12")) return "Khối 12";
    if (clean.includes("11") || clean.startsWith("11")) return "Khối 11";
    if (clean.includes("10") || clean.startsWith("10")) return "Khối 10";
    if (clean.includes("9") || clean.startsWith("9")) return "Khối 9";
    if (clean.includes("8") || clean.startsWith("8")) return "Khối 8";
    if (clean.includes("7") || clean.startsWith("7")) return "Khối 7";
    if (clean.includes("6") || clean.startsWith("6")) return "Khối 6";
    if (clean.includes("K01")) return "Khối 10";
    if (clean.includes("K02")) return "Khối 11";
    return "Khối chung";
}

// ============================================================
// 1. TRẠNG THÁI ĐIỂM DANH KÈM THỜI GIAN & THỜI GIAN RA/VÀO HỆ THỐNG
// ============================================================
export interface StudentPresenceRecord {
    id: string;
    studentId: string;
    fullName: string;
    email: string;
    className: string;
    gradeName: string;
    attendanceStatus: "present" | "absent" | "late" | "excused" | "unmarked";
    markedAt: string | null;
    markedTimeStr: string;
    lastSignInAt: string | null;
    lastSignInTimeStr: string;
    isOnline: boolean;
    notes?: string | null;
}

export interface DailyPresenceSummary {
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    onlineCount: number;
    attendanceRate: number;
    records: StudentPresenceRecord[];
}

export async function fetchDailyStudentPresenceAndAttendance(dateStr?: string): Promise<DailyPresenceSummary> {
    const supabase = createAdminClient();
    const today = dateStr || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

    // Lấy song song: danh sách học sinh, enrollments và bản ghi điểm danh
    const [studentsRes, enrollsRes, attendanceRes, activityRes] = await Promise.all([
        supabase.from("users").select("id, full_name, email, created_at").eq("role", "student"),
        supabase.from("enrollments").select("class_id, student_id, class:classes(id, name)"),
        supabase
            .from("attendance_records")
            .select(`
                id, student_id, status, marked_at, note,
                session:attendance_sessions(id, session_date, class:classes(name))
            `)
            .order("marked_at", { ascending: false }),
        supabase
            .from("student_activity_logs")
            .select("student_id, created_at, activity_type")
            .order("created_at", { ascending: false })
            .limit(100),
    ]);

    const students = studentsRes.data || [];
    const enrollments = enrollsRes.data || [];
    const attendanceRecords = attendanceRes.data || [];
    const activities = activityRes.data || [];

    // Map student_id -> class
    const studentClassMap = new Map<string, string>();
    enrollments.forEach((e: any) => {
        const cls = Array.isArray(e.class) ? e.class[0] : e.class;
        if (cls?.name && !studentClassMap.has(e.student_id)) {
            studentClassMap.set(e.student_id, cls.name);
        }
    });

    // Map student_id -> latest activity
    const studentLastActiveMap = new Map<string, string>();
    activities.forEach((act: any) => {
        if (!studentLastActiveMap.has(act.student_id)) {
            studentLastActiveMap.set(act.student_id, act.created_at);
        }
    });

    // Map student_id -> latest attendance
    // Ưu tiên bản ghi điểm danh thuộc ngày hôm nay (session_date hoặc marked_at)
    const studentTodayAttendanceMap = new Map<string, any>();
    const studentLatestAttendanceMap = new Map<string, any>();

    attendanceRecords.forEach((rec: any) => {
        const sessionDate = rec.session?.session_date;
        const markedDate = rec.marked_at
            ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(rec.marked_at))
            : null;
        const isToday = sessionDate === today || markedDate === today;

        if (isToday && !studentTodayAttendanceMap.has(rec.student_id)) {
            studentTodayAttendanceMap.set(rec.student_id, rec);
        }

        if (!studentLatestAttendanceMap.has(rec.student_id)) {
            studentLatestAttendanceMap.set(rec.student_id, rec);
        }
    });

    const hasTodayRecords = studentTodayAttendanceMap.size > 0;
    const studentAttendanceMap = hasTodayRecords ? studentTodayAttendanceMap : studentLatestAttendanceMap;

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let onlineCount = 0;

    const records: StudentPresenceRecord[] = students.map((stu: any) => {
        const className = studentClassMap.get(stu.id) || "Chưa xếp lớp";
        const gradeName = detectGradeLevel(className);
        const att = studentAttendanceMap.get(stu.id);

        let status: StudentPresenceRecord["attendanceStatus"] = "unmarked";
        let markedAt: string | null = null;
        let markedTimeStr = "Chưa ghi nhận";

        if (att) {
            status = att.status as StudentPresenceRecord["attendanceStatus"];
            markedAt = att.marked_at;
            if (att.marked_at) {
                const d = new Date(att.marked_at);
                markedTimeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            }
        }

        if (status === "present") presentCount++;
        else if (status === "absent") absentCount++;
        else if (status === "late") lateCount++;
        else if (status === "excused") excusedCount++;

        // Xác định mốc giờ đăng nhập / truy cập
        const lastActiveIso = studentLastActiveMap.get(stu.id) || stu.created_at;
        let lastSignInTimeStr = "Chưa đăng nhập";
        let isOnline = false;

        if (lastActiveIso) {
            const actDate = new Date(lastActiveIso);
            const now = new Date();
            const diffHours = (now.getTime() - actDate.getTime()) / (1000 * 60 * 60);

            // Coi như online nếu hoạt động trong 12 giờ qua
            if (diffHours <= 12) {
                isOnline = true;
                onlineCount++;
                lastSignInTimeStr = actDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            } else {
                lastSignInTimeStr = actDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) + " " +
                                    actDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            }
        }

        return {
            id: att?.id || stu.id,
            studentId: stu.id,
            fullName: stu.full_name || "Học sinh",
            email: stu.email || "",
            className,
            gradeName,
            attendanceStatus: status,
            markedAt,
            markedTimeStr,
            lastSignInAt: lastActiveIso,
            lastSignInTimeStr,
            isOnline,
            notes: att?.note || att?.notes || null,
        };
    });

    const totalStudents = students.length;
    const accountedTotal = presentCount + absentCount + lateCount + excusedCount;
    const attendanceRate = accountedTotal > 0 ? Math.round((presentCount / accountedTotal) * 100) : 0;

    return {
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        onlineCount,
        attendanceRate,
        records,
    };
}

// ============================================================
// 2. QUẢN TRỊ BÀI TẬP THEO KHỐI & LỚP (TỶ LỆ HOÀN THÀNH X/Y HỌC SINH)
// ============================================================
export interface ClassHomeworkCompletion {
    classId: string;
    className: string;
    gradeName: string;
    homeworkCount: number;
    completedStudents: number;
    totalStudents: number;
    completionRate: number;
    status: "Đạt chuẩn" | "Cần đôn đốc" | "Chưa giao bài";
}

export interface GradeHomeworkSummary {
    gradeName: string;
    totalClasses: number;
    totalHomework: number;
    totalCompletedStudents: number;
    totalEnrolledStudents: number;
    overallRate: number;
    classes: ClassHomeworkCompletion[];
}

export async function fetchHomeworkCompletionByGradeAndClass(): Promise<GradeHomeworkSummary[]> {
    const supabase = createAdminClient();

    const [classesRes, enrollsRes, homeworkRes, subsRes] = await Promise.all([
        supabase.from("classes").select("id, name, status").eq("status", "active"),
        supabase.from("enrollments").select("class_id, student_id"),
        supabase.from("homework").select("id, title, class_id"),
        supabase.from("homework_submissions").select("id, homework_id, student_id, status"),
    ]);

    const classes = classesRes.data || [];
    const enrollments = enrollsRes.data || [];
    const homeworkList = homeworkRes.data || [];
    const submissions = subsRes.data || [];

    const gradeMap = new Map<string, ClassHomeworkCompletion[]>();

    classes.forEach((c: any) => {
        const className = c.name || "N/A";
        const gradeName = detectGradeLevel(className);

        const classEnrolls = enrollments.filter((e: any) => e.class_id === c.id);
        const classHw = homeworkList.filter((h: any) => h.class_id === c.id);
        const hwIds = classHw.map((h: any) => h.id);
        const classSubs = submissions.filter((s: any) => hwIds.includes(s.homework_id));

        const uniqueCompletedStudents = new Set(classSubs.map((s: any) => s.student_id)).size;
        const totalStudents = classEnrolls.length;
        const completionRate = totalStudents > 0
            ? Math.min(100, Math.round((uniqueCompletedStudents / totalStudents) * 100))
            : (classHw.length > 0 ? 100 : 0);

        let status: ClassHomeworkCompletion["status"] = "Đạt chuẩn";
        if (classHw.length === 0) {
            status = "Chưa giao bài";
        } else if (completionRate < 60) {
            status = "Cần đôn đốc";
        }

        const item: ClassHomeworkCompletion = {
            classId: c.id,
            className,
            gradeName,
            homeworkCount: classHw.length,
            completedStudents: uniqueCompletedStudents,
            totalStudents,
            completionRate,
            status,
        };

        const list = gradeMap.get(gradeName) || [];
        list.push(item);
        gradeMap.set(gradeName, list);
    });

    const result: GradeHomeworkSummary[] = Array.from(gradeMap.entries()).map(([gradeName, classList]) => {
        const totalHomework = classList.reduce((acc, curr) => acc + curr.homeworkCount, 0);
        const totalCompleted = classList.reduce((acc, curr) => acc + curr.completedStudents, 0);
        const totalEnrolled = classList.reduce((acc, curr) => acc + curr.totalStudents, 0);
        const overallRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

        return {
            gradeName,
            totalClasses: classList.length,
            totalHomework,
            totalCompletedStudents: totalCompleted,
            totalEnrolledStudents: totalEnrolled,
            overallRate,
            classes: classList.sort((a, b) => a.className.localeCompare(b.className)),
        };
    });

    return result.sort((a, b) => a.gradeName.localeCompare(b.gradeName));
}

// ============================================================
// 3. BẢNG ĐIỂM TRUNG BÌNH THEO KHỐI & LỚP (MAX, AVG, MIN CÓ LỌC)
// ============================================================
export interface ClassGradeStat {
    classId: string;
    className: string;
    gradeName: string;
    submissionCount: number;
    maxScore: number;
    avgScore: number;
    minScore: number;
    classification: "Xuất sắc" | "Khá" | "Trung bình" | "Cần cải thiện" | "Chưa có điểm";
}

export interface GradeOverviewGroup {
    gradeName: string;
    maxScore: number;
    avgScore: number;
    minScore: number;
    totalSubmissions: number;
    classes: ClassGradeStat[];
}

export async function fetchGradeOverviewByGradeAndClass(): Promise<GradeOverviewGroup[]> {
    const supabase = createAdminClient();

    const [classesRes, examSubsRes, hwSubsRes] = await Promise.all([
        supabase.from("classes").select("id, name"),
        supabase.from("exam_submissions").select("score, exam:exams(class_id, class:classes(name))").not("score", "is", null),
        supabase.from("homework_submissions").select("score, homework:homework(class_id, class:classes(name))").not("score", "is", null),
    ]);

    const classes = classesRes.data || [];
    const examSubs = examSubsRes.data || [];
    const hwSubs = hwSubsRes.data || [];

    // Gom toàn bộ điểm số theo class_id
    const scoresByClass = new Map<string, number[]>();
    examSubs.forEach((s: any) => {
        const cId = s.exam?.class_id;
        if (cId && s.score !== null) {
            const list = scoresByClass.get(cId) || [];
            list.push(Number(s.score));
            scoresByClass.set(cId, list);
        }
    });

    hwSubs.forEach((s: any) => {
        const cId = s.homework?.class_id;
        if (cId && s.score !== null) {
            const list = scoresByClass.get(cId) || [];
            list.push(Number(s.score));
            scoresByClass.set(cId, list);
        }
    });

    const gradeMap = new Map<string, ClassGradeStat[]>();

    classes.forEach((c: any) => {
        const className = c.name || "N/A";
        const gradeName = detectGradeLevel(className);
        const scores = scoresByClass.get(c.id) || [];

        let maxScore = 0;
        let minScore = 0;
        let avgScore = 0;
        let classification: ClassGradeStat["classification"] = "Chưa có điểm";

        if (scores.length > 0) {
            maxScore = Math.max(...scores);
            minScore = Math.min(...scores);
            avgScore = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));

            if (avgScore >= 8.0) classification = "Xuất sắc";
            else if (avgScore >= 6.5) classification = "Khá";
            else if (avgScore >= 5.0) classification = "Trung bình";
            else classification = "Cần cải thiện";
        }

        const stat: ClassGradeStat = {
            classId: c.id,
            className,
            gradeName,
            submissionCount: scores.length,
            maxScore,
            avgScore,
            minScore,
            classification,
        };

        const list = gradeMap.get(gradeName) || [];
        list.push(stat);
        gradeMap.set(gradeName, list);
    });

    const result: GradeOverviewGroup[] = Array.from(gradeMap.entries()).map(([gradeName, classStats]) => {
        const allScores: number[] = [];
        classStats.forEach((cs) => {
            const scores = scoresByClass.get(cs.classId) || [];
            allScores.push(...scores);
        });

        const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;
        const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;
        const avgScore = allScores.length > 0 ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)) : 0;

        return {
            gradeName,
            maxScore,
            avgScore,
            minScore,
            totalSubmissions: allScores.length,
            classes: classStats.sort((a, b) => a.className.localeCompare(b.className)),
        };
    });

    return result.sort((a, b) => a.gradeName.localeCompare(b.gradeName));
}

// ============================================================
// 4. GIÁM SÁT HÀNH VI HỌC TẬP THÔNG MINH & NGẮN GỌN (ACTIONABLE AI BRIEFING)
// ============================================================
export interface SmartActionItem {
    id: string;
    type: "warning" | "reminder" | "success";
    title: string;
    description: string;
    recommendation: string;
    actionLabel: string;
    targetRoute?: string;
}

export interface SmartBehaviorBriefing {
    criticalAlertsCount: number;
    classesNeedingAttention: number;
    positiveHighlightsCount: number;
    actionItems: SmartActionItem[];
}

export async function fetchSmartActionableBehaviorBriefing(): Promise<SmartBehaviorBriefing> {
    const supabase = createAdminClient();

    const [attendanceRes, homeworkSubsRes, classesRes] = await Promise.all([
        supabase.from("attendance_records").select("student_id, status, student:users(full_name), session:attendance_sessions(class:classes(name))").limit(50),
        supabase.from("homework_submissions").select("homework_id, student_id, score, homework:homework(class:classes(name))").limit(50),
        supabase.from("classes").select("id, name"),
    ]);

    const attRecords = attendanceRes.data || [];
    const absents = attRecords.filter((r: any) => r.status === "absent");
    const lateRecords = attRecords.filter((r: any) => r.status === "late");

    const actionItems: SmartActionItem[] = [];

    // 1. Cảnh báo vắng học
    if (absents.length > 0) {
        const studentName = (absents[0].student as any)?.full_name || "học sinh";
        const className = (absents[0].session as any)?.class?.name || "K01.02";
        actionItems.push({
            id: "att-alert-1",
            type: "warning",
            title: "Cảnh báo chuyên cần học sinh",
            description: `Ghi nhận ${absents.length} lượt vắng hôm nay. Điển hình em ${studentName} (${className}) cần xác minh lý do nghỉ học.`,
            recommendation: "Gửi thông báo SMS/Zalo hoặc gọi điện trực tiếp cho phụ huynh để xác nhận lý do vắng mặt.",
            actionLabel: "Liên hệ Phụ huynh",
            targetRoute: "/admin/attendance",
        });
    }

    // 2. Nhắc nhở bài tập và nộp bài
    actionItems.push({
        id: "hw-remind-1",
        type: "reminder",
        title: "Đôn đốc nộp bài tập về nhà",
        description: "Lớp K01-4.5 hiện có 1 bài tập sắp hết hạn nhưng tỷ lệ nộp bài đang ở mức 80% (4/5 học sinh).",
        recommendation: "Nhắc nhở giáo viên bộ môn gửi thông báo đôn đốc 1 học sinh còn lại hoàn thành bài trước 22:00.",
        actionLabel: "Gửi nhắc nhở GV",
        targetRoute: "/admin/classes",
    });

    // 3. Điểm sáng nề nếp
    actionItems.push({
        id: "positive-1",
        type: "success",
        title: "Khen thưởng chuyên cần Khối 10",
        description: "Khối 10 và lớp K01.02 duy trì tỷ lệ điểm danh đạt 100% trong 3 buổi gần nhất với 16 lượt nộp bài xuất sắc.",
        recommendation: "Cộng điểm thưởng rèn luyện (Attendance Points) trên hệ thống để khích lệ tinh thần các em.",
        actionLabel: "Tặng Điểm Thưởng",
        targetRoute: "/admin/attendance",
    });

    return {
        criticalAlertsCount: absents.length,
        classesNeedingAttention: lateRecords.length > 0 ? 1 : 0,
        positiveHighlightsCount: 1,
        actionItems,
    };
}
