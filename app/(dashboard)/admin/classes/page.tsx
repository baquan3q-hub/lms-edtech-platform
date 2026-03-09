import { fetchClasses, fetchDropdownData } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { School, Search } from "lucide-react";
import AddClassDialog from "@/components/admin/classes/AddClassDialog";
import ClassesTableClient from "./ClassesTableClient";

export default async function ClassesPage() {
    const { data: classes, error } = await fetchClasses();
    const { data: dropdownData } = await fetchDropdownData();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
                        <School className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Quản lý Lớp học</h2>
                        <p className="text-sm text-gray-500">Mở lớp và phân công Giáo viên giảng dạy</p>
                    </div>
                </div>
                <AddClassDialog
                    courses={dropdownData?.courses || []}
                    teachers={dropdownData?.teachers || []}
                />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {error ? (
                    <div className="p-8 text-center"><p className="text-red-500">Lỗi tải dữ liệu: {error}</p></div>
                ) : !classes || classes.length === 0 ? (
                    <div className="p-12 text-center">
                        <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Chưa có lớp học nào</p>
                        <p className="text-sm text-gray-400 mt-1">Bấm &quot;Mở Lớp mới&quot; để tạo lớp học đầu tiên (Cần có Môn học và Giáo viên trước).</p>
                    </div>
                ) : (
                    <ClassesTableClient
                        classes={classes}
                        courses={dropdownData?.courses || []}
                        teachers={dropdownData?.teachers || []}
                    />
                )}
            </div>
        </div>
    );
}
