import { BookOpen, Search } from "lucide-react";
import { fetchCourses } from "./actions";
import AddCourseDialog from "@/components/admin/courses/AddCourseDialog";
import CoursesTableClient from "./CoursesTableClient";

export default async function CoursesPage() {
    const { data: courses, error } = await fetchCourses();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Quản lý Khóa học</h2>
                        <p className="text-sm text-gray-500">Danh sách các môn học nền tảng trên hệ thống</p>
                    </div>
                </div>
                <AddCourseDialog />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {error ? (
                    <div className="p-8 text-center"><p className="text-red-500">Lỗi tải dữ liệu: {error}</p></div>
                ) : !courses || courses.length === 0 ? (
                    <div className="p-12 text-center">
                        <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Chưa có khóa học nào</p>
                        <p className="text-sm text-gray-400 mt-1">Bấm &quot;Thêm Khóa học&quot; để tạo môn học đầu tiên.</p>
                    </div>
                ) : (
                    <CoursesTableClient courses={courses} />
                )}
            </div>
        </div>
    );
}
