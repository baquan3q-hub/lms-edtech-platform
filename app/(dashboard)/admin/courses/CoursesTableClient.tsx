"use client";

import { useState } from "react";
import { Monitor, Building2, Filter } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import CourseActions from "@/components/admin/courses/CourseActions";

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CoursesTableClient({ courses }: { courses: any[] }) {
    const [modeFilter, setModeFilter] = useState<"all" | "online" | "offline">("all");

    const filtered = courses.filter(c => {
        if (modeFilter === "all") return true;
        return c.mode === modeFilter;
    });

    return (
        <div>
            {/* Filter Bar */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                    <Filter className="w-4 h-4" />
                    Lọc:
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setModeFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${modeFilter === "all"
                                ? "bg-gray-900 text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                            }`}
                    >
                        Tất cả ({courses.length})
                    </button>
                    <button
                        onClick={() => setModeFilter("offline")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${modeFilter === "offline"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
                            }`}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        Offline ({courses.filter(c => c.mode !== "online").length})
                    </button>
                    <button
                        onClick={() => setModeFilter("online")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${modeFilter === "online"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
                            }`}
                    >
                        <Monitor className="w-3.5 h-3.5" />
                        Online ({courses.filter(c => c.mode === "online").length})
                    </button>
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                    Không có khóa học nào phù hợp với bộ lọc.
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/50">
                            <TableHead className="text-gray-500 font-medium w-[25%]">Tên khóa học</TableHead>
                            <TableHead className="text-gray-500 font-medium w-[20%]">Mô tả</TableHead>
                            <TableHead className="text-gray-500 font-medium w-[12%]">Hình thức</TableHead>
                            <TableHead className="text-gray-500 font-medium w-[20%]">Lớp học</TableHead>
                            <TableHead className="text-gray-500 font-medium">Ngày tạo</TableHead>
                            <TableHead className="text-gray-500 font-medium text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((course: any) => (
                            <TableRow key={course.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                                <TableCell className="font-semibold text-gray-900">{course.name}</TableCell>
                                <TableCell className="text-gray-600">
                                    <span className="line-clamp-2">{course.description || "—"}</span>
                                </TableCell>
                                <TableCell>
                                    {course.mode === "online" ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                            <Monitor className="w-3 h-3" /> Online
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                            <Building2 className="w-3 h-3" /> Offline
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {course.classes && course.classes.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {course.classes.map((cls: any) => (
                                                <div key={cls.id} className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded inline-block w-fit">
                                                    <span className="font-semibold">{cls.name || "Chưa đặt tên"}</span> | GV: {cls.teacher?.full_name || "Trống"}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">Chưa có lớp</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-gray-500">{formatDate(course.created_at)}</TableCell>
                                <TableCell className="text-right">
                                    <CourseActions course={course} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
