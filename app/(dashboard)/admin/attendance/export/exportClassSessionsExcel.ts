import * as XLSX from "xlsx";

interface ExportClassData {
    className: string;
    month: number;
    year: number;
    sessions: any[];
}

export function exportClassSessionsExcel({ className, month, year, sessions }: ExportClassData) {
    const wb = XLSX.utils.book_new();

    // Lọc ra các buổi đã điểm danh
    const attendedSessions = sessions.filter(s => s.source === "attended" && s.students);

    // Lấy danh sách học sinh duy nhất (từ tất cả các buổi)
    const studentMap = new Map<string, any>();
    
    attendedSessions.forEach(sess => {
        if (!sess.students) return;
        sess.students.forEach((st: any) => {
            if (!studentMap.has(st.student_id)) {
                studentMap.set(st.student_id, {
                    student_id: st.student_id,
                    studentName: st.studentName || st.student_id.slice(0, 8),
                    present: 0,
                    absent: 0,
                    late: 0,
                    excused: 0,
                    total: 0,
                });
            }
            // Cộng dồn thống kê cá nhân
            const record = studentMap.get(st.student_id);
            record.total += 1;
            if (st.status === "present") record.present += 1;
            else if (st.status === "absent") record.absent += 1;
            else if (st.status === "late") record.late += 1;
            else if (st.status === "excused") record.excused += 1;
        });
    });

    const studentList = Array.from(studentMap.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));

    if (studentList.length === 0) {
        // Nếu không có học sinh nào, tạo sheet trống
        const ws = XLSX.utils.json_to_sheet([{ "Thông báo": "Chưa có dữ liệu điểm danh nào trong tháng này." }]);
        XLSX.utils.book_append_sheet(wb, ws, "Chi tiết điểm danh");
        XLSX.writeFile(wb, `Diemdanh_${className}_T${month}_${year}.xlsx`);
        return;
    }

    // ====== Biến đổi data thành dạng Bảng 2 chiều ======
    // Cột: STT | Họ tên | Ngày 1 | Ngày 2 | ... | Tổng có mặt | % Chuyên cần
    const statusText: any = {
        present: "x",
        absent: "v",
        late: "m",
        excused: "p"
    };

    const sheetRows = studentList.map((st, idx) => {
        const row: any = {
            "STT": idx + 1,
            "Tên học sinh": st.studentName,
        };

        // Duyệt qua từng buổi học để check trạng thái
        attendedSessions.sort((a, b) => a.session_date.localeCompare(b.session_date)).forEach(sess => {
            const dateStr = new Date(sess.session_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
            const studentRecord = sess.students?.find((r: any) => r.student_id === st.student_id);
            
            row[dateStr] = studentRecord ? statusText[studentRecord.status] || "" : "";
        });

        // Tổng kết
        row["Tổng Số Buổi"] = st.total;
        row["Có Mặt"] = st.present;
        row["Vắng"] = st.absent;
        row["Trễ"] = st.late;
        row["Có Phép"] = st.excused;
        row["% Có mặt"] = st.total > 0 ? `${Math.round((st.present / st.total) * 100)}%` : "0%";

        return row;
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);

    // Customize width: STT (5), Name (25), Dates (6), Stats (10)
    const cols = [
        { wch: 5 },
        { wch: 25 },
        ...attendedSessions.map(() => ({ wch: 6 })),
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
    ];
    ws["!cols"] = cols;

    XLSX.utils.book_append_sheet(wb, ws, "Chi tiết điểm danh");

    // ===== Sheet 2: Ghi chú ký hiệu =====
    const legendRows = [
        { "Ký hiệu": "x", "Ý nghĩa": "Có mặt" },
        { "Ký hiệu": "v", "Ý nghĩa": "Vắng không phép" },
        { "Ký hiệu": "m", "Ý nghĩa": "Đi trễ" },
        { "Ký hiệu": "p", "Ý nghĩa": "Vắng có phép" },
    ];
    const wsLegend = XLSX.utils.json_to_sheet(legendRows);
    XLSX.utils.book_append_sheet(wb, wsLegend, "Ghi chú ký hiệu");

    XLSX.writeFile(wb, `Diemdanh_${className}_T${month}_${year}.xlsx`);
}
