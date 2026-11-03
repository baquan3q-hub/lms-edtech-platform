import { fetchClasses, fetchDropdownData } from "./actions";
import { School, Search } from "lucide-react";
import AddClassDialog from "@/components/admin/classes/AddClassDialog";
import AddGradeDialog from "@/components/admin/classes/AddGradeDialog";
import ClassesTableClient from "./ClassesTableClient";

export default async function ClassesPage() {
    const { data: classes, error } = await fetchClasses();
    const { data: dropdownData } = await fetchDropdownData();

    const courses = dropdownData?.courses || [];
    const teachers = dropdownData?.teachers || [];

    return (
        <div className="space-y-6">
            {/* Header chuyên nghiệp */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 shrink-0">
                        <School className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý Khối & Lớp học</h2>
                        <p className="text-sm text-slate-500">Tổ chức phân cấp khối học, mở lớp và phân công giáo viên chủ nhiệm / phụ trách</p>
                    </div>
                </div>

                {/* 2 nút thao tác chính: Thêm Khối học & Mở Lớp mới */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <AddGradeDialog />
                    <AddClassDialog
                        courses={courses}
                        teachers={teachers}
                    />
                </div>
            </div>

            {/* Khối dữ liệu bảng/nhóm */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                {error ? (
                    <div className="p-8 text-center"><p className="text-rose-500 font-medium">Lỗi tải dữ liệu: {error}</p></div>
                ) : (!classes || classes.length === 0) && courses.length === 0 ? (
                    <div className="p-12 text-center">
                        <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-700 font-semibold text-base">Chưa có Khối học hoặc Lớp học nào</p>
                        <p className="text-sm text-slate-500 mt-1 mb-4">Bắt đầu bằng việc tạo Khối học đầu tiên (Khối 1, Khối 2, Khối 10...) rồi mở các lớp tương ứng.</p>
                        <div className="inline-flex items-center gap-2">
                            <AddGradeDialog />
                        </div>
                    </div>
                ) : (
                    <ClassesTableClient
                        classes={classes || []}
                        courses={courses}
                        teachers={teachers}
                    />
                )}
            </div>
        </div>
    );
}
