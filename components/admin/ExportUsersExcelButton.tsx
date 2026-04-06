"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type UserObject = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone: string | null;
    created_at: string;
};

type LinkData = {
    id: string;
    parent_id: string;
    student_id: string;
    relationship: string;
};

export default function ExportUsersExcelButton({ users, links }: { users: UserObject[], links: LinkData[] }) {
    const handleExport = () => {
        try {
            const wb = XLSX.utils.book_new();

            // Sửa tên role cho đẹp
            const roleLabels: any = {
                admin: "Admin",
                teacher: "Giáo viên",
                student: "Học sinh",
                parent: "Phụ huynh"
            };

            // ===== Sheet 1: Tất cả Người Dùng =====
            const usersRows = users.map((u, idx) => ({
                "STT": idx + 1,
                "Họ và tên": u.full_name,
                "Email": u.email,
                "Vai trò": roleLabels[u.role] || u.role,
                "Số điện thoại": u.phone || "",
                "Ngày tạo": new Date(u.created_at).toLocaleDateString("vi-VN")
            }));
            const ws1 = XLSX.utils.json_to_sheet(usersRows);
            ws1["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, ws1, "Nguoi dung");

            // ===== Sheet 2: Liên kết Phụ Huynh - Học Sinh =====
            const linkRows = links.map((l, idx) => {
                const parent = users.find(u => u.id === l.parent_id);
                const student = users.find(u => u.id === l.student_id);
                return {
                    "STT": idx + 1,
                    "Tên Phụ Huynh": parent?.full_name || "Lỗi ID",
                    "Email Phụ Huynh": parent?.email || "",
                    "Mối quan hệ": l.relationship,
                    "Tên Học Sinh": student?.full_name || "Lỗi ID",
                    "Email Học Sinh": student?.email || ""
                };
            });
            const ws2 = XLSX.utils.json_to_sheet(linkRows);
            ws2["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, ws2, "Lien ket PH-HS");

            // Xuất file
            XLSX.writeFile(wb, `DanhSach_NguoiDung_LienKet.xlsx`);
            toast.success("Xuất file Excel thành công!");
        } catch (error) {
            console.error(error);
            toast.error("Lỗi xuất file Excel");
        }
    };

    return (
        <Button onClick={handleExport} variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-10 w-full sm:w-auto px-4 flex justify-start sm:justify-center items-center">
            <Download className="w-4 h-4 mr-2" /> 
            Xuất Excel
        </Button>
    );
}
