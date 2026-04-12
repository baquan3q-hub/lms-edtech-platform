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

    // Group by date
    const dateMap = new Map();
    sessions.forEach((s: any) => {
        if (!dateMap.has(s.session_date)) {
            dateMap.set(s.session_date, { present: 0, absent: 0 });
        }
        const counts = dateMap.get(s.session_date);
        const sessRecords = allRecords.filter((r: any) => r.session_id === s.id);
        
        counts.present += sessRecords.filter((r: any) => r.status === "present").length;
        counts.absent += sessRecords.filter((r: any) => r.status === "absent" || r.status === "excused" || r.status === "late").length;
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

    // 2. Tính Mẫu số chung (Expected Submissions) dựa vào sĩ số học viên
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
    // Lấy tối đa auth users (giới hạn của limit mặc định là vài chục đến 1000 page size)
    // Tối ưu nhất là gọi api auth admin.listUsers
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    
    if (error || !users) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeUsersToday = users.filter(user => {
        if (!user.last_sign_in_at) return false;
        const signInDate = new Date(user.last_sign_in_at);
        return signInDate >= today;
    });
    
    return activeUsersToday.length;
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
