import * as XLSX from "xlsx";

interface ClassSummary {
    classId: string;
    className: string;
    teacherName: string;
    totalSessions: number;
    totalPresent: number;
    totalAbsent: number;
    totalRecords: number;
    attendanceRate: number;
}

interface HighAbsenceStudent {
    studentId: string;
    studentName?: string;
    studentEmail?: string;
    absentCount: number;
    totalSessions: number;
    absentRate: number;
}

interface SessionDetail {
    date: string;
    className: string;
    teacherName: string;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    totalStudents: number;
    rate: string;
}

interface ExportData {
    month: number;
    year: number;
    classSummaries: ClassSummary[];
    studentsHighAbsence: HighAbsenceStudent[];
    sessionDetails?: SessionDetail[];
}

/**
 * Xuất file Excel 3 sheets: Tổng hợp, Chi tiết ngày, HS cần chú ý
 */
export function exportAttendanceExcel(data: ExportData) {
    const wb = XLSX.utils.book_new();

    // ===== Sheet 1: Tổng hợp theo lớp =====
    const sheet1Rows = data.classSummaries.map((c, idx) => ({
        "STT": idx + 1,
        "Tên lớp": c.className,
        "Giáo viên": c.teacherName,
        "Số buổi": c.totalSessions,
        "Tổng lượt có mặt": c.totalPresent,
        "Tổng lượt vắng": c.totalAbsent,
        "Tổng lượt điểm danh": c.totalRecords,
        "% Chuyên cần": `${c.attendanceRate}%`,
    }));

    const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
    // Đặt độ rộng cột
    ws1["!cols"] = [
        { wch: 5 },   // STT
        { wch: 25 },  // Tên lớp
        { wch: 20 },  // GV
        { wch: 10 },  // Số buổi
        { wch: 15 },  // Có mặt
        { wch: 15 },  // Vắng
        { wch: 18 },  // Tổng lượt
        { wch: 14 },  // %
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Tổng hợp");

    // ===== Sheet 2: Chi tiết theo ngày (nếu có data) =====
    if (data.sessionDetails && data.sessionDetails.length > 0) {
        const sheet2Rows = data.sessionDetails.map((s, idx) => ({
            "STT": idx + 1,
            "Ngày": s.date,
            "Lớp": s.className,
            "Giáo viên": s.teacherName,
            "Có mặt": s.presentCount,
            "Vắng": s.absentCount,
            "Trễ": s.lateCount,
            "Có phép": s.excusedCount,
            "Tổng HS": s.totalStudents,
            "% Đi học": s.rate,
        }));

        const ws2 = XLSX.utils.json_to_sheet(sheet2Rows);
        ws2["!cols"] = [
            { wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
            { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
            { wch: 10 }, { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(wb, ws2, "Chi tiết ngày");
    }

    // ===== Sheet 3: HS cần chú ý =====
    if (data.studentsHighAbsence.length > 0) {
        const sheet3Rows = data.studentsHighAbsence.map((s, idx) => ({
            "STT": idx + 1,
            "Tên học sinh": s.studentName || s.studentId.slice(0, 8) + "...",
            "Email": s.studentEmail || "—",
            "Số buổi vắng": s.absentCount,
            "Tổng buổi": s.totalSessions,
            "% Vắng": `${s.absentRate}%`,
            "Mức cảnh báo": s.absentRate >= 30 ? "🔴 Nghiêm trọng" : "🟡 Cần chú ý",
        }));

        const ws3 = XLSX.utils.json_to_sheet(sheet3Rows);
        ws3["!cols"] = [
            { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 14 },
            { wch: 12 }, { wch: 10 }, { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, ws3, "HS cần chú ý");
    }

    // Xuất file
    const fileName = `Diemdanh_ToanTruong_T${data.month}_${data.year}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return fileName;
}
