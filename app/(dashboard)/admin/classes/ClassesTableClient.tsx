"use client";

import { useState, useMemo } from "react";
import { Monitor, Building2, Filter, School } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ClassActions from "@/components/admin/classes/ClassActions";

export default function ClassesTableClient({
    classes,
    courses,
    teachers,
}: {
    classes: any[];
    courses: any[];
    teachers: any[];
}) {
    const [courseFilter, setCourseFilter] = useState<string>("all");
    const [modeFilter, setModeFilter] = useState<"all" | "online" | "offline">("all");

    // Get unique course names for filter
    const uniqueCourses = useMemo(() => {
        const map = new Map<string, { id: string; name: string; count: number }>();
        classes.forEach(cls => {
            if (cls.course?.name) {
                const key = cls.course_id || cls.course?.name;
                const existing = map.get(key);
                if (existing) {
                    existing.count++;
                } else {
                    map.set(key, { id: key, name: cls.course.name, count: 1 });
                }
            }
        });
        return Array.from(map.values());
    }, [classes]);

    const filtered = classes.filter(cls => {
        const matchCourse = courseFilter === "all" || (cls.course_id || cls.course?.name) === courseFilter;
        const matchMode = modeFilter === "all" || (cls.course?.mode || "offline") === modeFilter;
        return matchCourse && matchMode;
    });

    return (
        <div>
            {/* Filter Bar */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3">
                {/* Course Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium shrink-0">
                        <Filter className="w-4 h-4" />
                        Khóa học:
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setCourseFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${courseFilter === "all"
                                ? "bg-gray-900 text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            Tất cả ({classes.length})
                        </button>
                        {uniqueCourses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => setCourseFilter(course.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${courseFilter === course.id
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
                                    }`}
                            >
                                {course.name} ({course.count})
                            </button>
                        ))}
                    </div>
                </div>
                {/* Mode Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium shrink-0">
                        <Filter className="w-4 h-4" />
                        Hình thức:
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setModeFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${modeFilter === "all"
                                ? "bg-gray-900 text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setModeFilter("offline")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${modeFilter === "offline"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
                                }`}
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            Offline ({classes.filter(c => (c.course?.mode || "offline") !== "online").length})
                        </button>
                        <button
                            onClick={() => setModeFilter("online")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${modeFilter === "online"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
                                }`}
                        >
                            <Monitor className="w-3.5 h-3.5" />
                            Online ({classes.filter(c => c.course?.mode === "online").length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                    Không có lớp học nào phù hợp với bộ lọc.
                </div>
            ) : (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/50">
                                <TableHead className="text-gray-500 font-medium whitespace-nowrap">Lớp học</TableHead>
                                <TableHead className="text-gray-500 font-medium whitespace-nowrap">Thuộc Khóa học</TableHead>
                                <TableHead className="text-gray-500 font-medium whitespace-nowrap">Giáo viên phụ trách</TableHead>
                                <TableHead className="text-gray-500 font-medium whitespace-nowrap">Hình thức</TableHead>
                                <TableHead className="text-gray-500 font-medium whitespace-nowrap">Sĩ số (tối đa)</TableHead>
                                <TableHead className="text-gray-500 font-medium whitespace-nowrap">Trạng thái</TableHead>
                                <TableHead className="text-gray-500 font-medium text-right whitespace-nowrap">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((cls: any) => (
                                <TableRow key={cls.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                                    <TableCell className="font-semibold text-indigo-700 text-base">
                                        <Link href={`/admin/classes/${cls.id}`} className="hover:underline flex items-center min-h-[44px]">
                                            {cls.name || "Chưa đặt tên"}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        {cls.course?.name || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-indigo-700">{cls.teacher?.full_name || "Chưa phân công"}</span>
                                            <span className="text-xs text-gray-500">{cls.teacher?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {cls.course?.mode === "online" ? (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                                <Monitor className="w-3 h-3" /> Online
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                                <Building2 className="w-3 h-3" /> Offline
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-600">{cls.max_students}</TableCell>
                                    <TableCell>
                                        {cls.status === 'active' ? (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Đang hoạt động</Badge>
                                        ) : cls.status === 'completed' ? (
                                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Đã kết thúc</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Đã hủy</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Link href={`/admin/classes/${cls.id}`}>
                                                <Button variant="outline" size="sm" className="h-8 shadow-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                                    <School className="w-4 h-4 mr-2" />
                                                    Chi tiết lớp
                                                </Button>
                                            </Link>
                                            <ClassActions
                                                cls={cls}
                                                courses={courses}
                                                teachers={teachers}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
