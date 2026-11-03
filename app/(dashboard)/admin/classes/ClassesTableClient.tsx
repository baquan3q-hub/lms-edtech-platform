"use client";

import { useState, useMemo } from "react";
import { 
    Search, 
    Layers, 
    List, 
    Building2, 
    Monitor, 
    School, 
    Users, 
    MapPin, 
    Plus, 
    RotateCcw
} from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import ClassActions from "@/components/admin/classes/ClassActions";
import AddClassDialog from "@/components/admin/classes/AddClassDialog";

export default function ClassesTableClient({
    classes,
    courses,
    teachers,
}: {
    classes: any[];
    courses: any[];
    teachers: any[];
}) {
    const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [courseFilter, setCourseFilter] = useState<string>("all");
    const [modeFilter, setModeFilter] = useState<string>("all");

    // Lọc danh sách lớp học
    const filteredClasses = useMemo(() => {
        return classes.filter(cls => {
            const matchesSearch = 
                !searchQuery.trim() ||
                cls.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cls.teacher?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cls.room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cls.course?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCourse = 
                courseFilter === "all" || 
                (cls.course_id || cls.course?.name) === courseFilter;

            const matchesMode = 
                modeFilter === "all" || 
                (cls.course?.mode || "offline") === modeFilter;

            return matchesSearch && matchesCourse && matchesMode;
        });
    }, [classes, searchQuery, courseFilter, modeFilter]);

    // Gom nhóm lớp học theo từng Khối học
    const groupedByGrade = useMemo(() => {
        const map = new Map<string, { grade: any; classes: any[] }>();

        // 1. Thêm tất cả các khối có sẵn từ database
        courses.forEach(course => {
            if (courseFilter === "all" || course.id === courseFilter) {
                if (modeFilter === "all" || (course.mode || "offline") === modeFilter) {
                    map.set(course.id, { grade: course, classes: [] });
                }
            }
        });

        // 2. Phân bổ các lớp vào khối tương ứng
        filteredClasses.forEach(cls => {
            const courseId = cls.course_id;
            if (courseId && map.has(courseId)) {
                map.get(courseId)!.classes.push(cls);
            } else if (courseId) {
                // Khối chưa có trong danh sách
                map.set(courseId, {
                    grade: cls.course || { id: courseId, name: "Khối khác", mode: "offline" },
                    classes: [cls]
                });
            }
        });

        return Array.from(map.values());
    }, [courses, filteredClasses, courseFilter, modeFilter]);

    const isFiltered = searchQuery !== "" || courseFilter !== "all" || modeFilter !== "all";

    const resetFilters = () => {
        setSearchQuery("");
        setCourseFilter("all");
        setModeFilter("all");
    };

    return (
        <div className="space-y-4">
            {/* THANH LỌC CHUẨN NGANG (Single-Line Horizontal Toolbar) */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Cụm input tìm kiếm & các dropdown lọc */}
                <div className="flex flex-1 flex-wrap md:flex-nowrap items-center gap-2.5">
                    {/* Ô tìm kiếm nhanh */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Tìm lớp, giáo viên, phòng học..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-white border-slate-200 text-sm text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Dropdown lọc Khối học */}
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                        <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200 text-sm text-slate-700">
                            <SelectValue placeholder="Tất cả Khối học" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 max-h-56">
                            <SelectItem value="all">Tất cả Khối học ({courses.length})</SelectItem>
                            {courses.map(course => (
                                <SelectItem key={course.id} value={course.id}>
                                    {course.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Dropdown lọc Hình thức */}
                    <Select value={modeFilter} onValueChange={setModeFilter}>
                        <SelectTrigger className="w-[145px] h-9 bg-white border-slate-200 text-sm text-slate-700">
                            <SelectValue placeholder="Hình thức" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="all">Tất cả hình thức</SelectItem>
                            <SelectItem value="offline">Trực tiếp</SelectItem>
                            <SelectItem value="online">Trực tuyến</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Nút reset filter */}
                    {isFiltered && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="h-9 px-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 text-xs shrink-0"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Xóa lọc
                        </Button>
                    )}
                </div>

                {/* Cụm chuyển đổi chế độ xem (Dual View Toggle) */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg shrink-0 self-end md:self-auto">
                    <button
                        onClick={() => setViewMode("grouped")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            viewMode === "grouped"
                                ? "bg-white text-blue-700 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Xem phân cấp theo Khối học"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Theo Khối học
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            viewMode === "table"
                                ? "bg-white text-blue-700 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Xem dạng Bảng tổng hợp"
                    >
                        <List className="w-3.5 h-3.5" />
                        Dạng Bảng
                    </button>
                </div>
            </div>

            {/* CHẾ ĐỘ 1: XEM THEO KHỐI HỌC (Hierarchical Grouped View) */}
            {viewMode === "grouped" && (
                <div className="p-5 space-y-6">
                    {groupedByGrade.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            Không tìm thấy khối học hoặc lớp học nào phù hợp với bộ lọc.
                        </div>
                    ) : (
                        groupedByGrade.map(({ grade, classes: gradeClasses }) => (
                            <div 
                                key={grade.id} 
                                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                            >
                                {/* Grade Header */}
                                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 text-base">
                                                    {grade.name}
                                                </h3>
                                                <Badge variant="secondary" className="bg-slate-200/80 text-slate-700 font-semibold text-xs border-0">
                                                    {gradeClasses.length} lớp học
                                                </Badge>
                                                {grade.mode === "online" ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                                                        <Monitor className="w-3 h-3 mr-1" /> Trực tuyến
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]">
                                                        <Building2 className="w-3 h-3 mr-1" /> Trực tiếp
                                                    </Badge>
                                                )}
                                            </div>
                                            {grade.description && (
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{grade.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action: Thêm lớp vào Khối này */}
                                    <div className="shrink-0">
                                        <AddClassDialog
                                            courses={courses}
                                            teachers={teachers}
                                            initialCourseId={grade.id}
                                            customTrigger={
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 text-xs font-semibold"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Thêm lớp vào {grade.name}
                                                </Button>
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Grade Classes Grid */}
                                <div className="p-4">
                                    {gradeClasses.length === 0 ? (
                                        <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
                                            <School className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-slate-600 text-sm font-medium">Chưa có lớp học nào thuộc {grade.name}</p>
                                            <p className="text-slate-400 text-xs mt-1 mb-3">Tạo lớp mới để phân công giáo viên và quản lý sĩ số học sinh.</p>
                                            <AddClassDialog
                                                courses={courses}
                                                teachers={teachers}
                                                initialCourseId={grade.id}
                                                customTrigger={
                                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium">
                                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                                        Tạo lớp đầu tiên cho {grade.name}
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                            {gradeClasses.map((cls: any) => (
                                                <div 
                                                    key={cls.id}
                                                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                                                >
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <Link 
                                                                href={`/admin/classes/${cls.id}`} 
                                                                className="font-bold text-slate-900 hover:text-blue-600 text-base leading-snug line-clamp-1"
                                                            >
                                                                {cls.name}
                                                            </Link>
                                                            <Badge className={
                                                                cls.status === "active" 
                                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]" 
                                                                    : "bg-slate-100 text-slate-600 border border-slate-200 text-[10px]"
                                                            }>
                                                                {cls.status === "active" ? "Đang mở" : "Đã đóng"}
                                                            </Badge>
                                                        </div>

                                                        {/* Metadata */}
                                                        <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                                                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                                <span className="truncate">GV: {cls.teacher?.full_name || "Chưa phân công"}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                                    {cls.room || "Chưa có phòng"}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3 text-slate-400" />
                                                                    Tối đa {cls.max_students || 40} HS
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Thao tác lớp */}
                                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                        <Link 
                                                            href={`/admin/classes/${cls.id}`}
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                                        >
                                                            Chi tiết lớp →
                                                        </Link>
                                                        <ClassActions 
                                                            cls={cls}
                                                            courses={courses}
                                                            teachers={teachers}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* CHẾ ĐỘ 2: XEM BẢNG TỔNG HỢP (Flat Table View) */}
            {viewMode === "table" && (
                <div className="p-4">
                    {filteredClasses.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 text-sm">
                            Không có lớp học nào phù hợp với bộ lọc.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="border-slate-200 bg-slate-50/70 hover:bg-transparent">
                                        <TableHead className="text-slate-600 font-semibold text-xs whitespace-nowrap">Lớp học</TableHead>
                                        <TableHead className="text-slate-600 font-semibold text-xs whitespace-nowrap">Khối / Chương trình</TableHead>
                                        <TableHead className="text-slate-600 font-semibold text-xs whitespace-nowrap">Giáo viên phụ trách</TableHead>
                                        <TableHead className="text-slate-600 font-semibold text-xs whitespace-nowrap">Hình thức</TableHead>
                                        <TableHead className="text-slate-600 font-semibold text-xs whitespace-nowrap">Sĩ số tối đa</TableHead>
                                        <TableHead className="text-slate-600 font-semibold text-xs whitespace-nowrap">Phòng học</TableHead>
                                        <TableHead className="text-slate-600 font-semibold text-xs whitespace-nowrap">Trạng thái</TableHead>
                                        <TableHead className="text-slate-600 font-semibold text-xs text-right whitespace-nowrap">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClasses.map((cls: any) => (
                                        <TableRow key={cls.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-semibold text-blue-700 text-sm">
                                                <Link href={`/admin/classes/${cls.id}`} className="hover:underline flex items-center min-h-[36px]">
                                                    {cls.name || "Chưa đặt tên"}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-800 text-sm">
                                                {cls.course?.name || "—"}
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">
                                                {cls.teacher?.full_name || <span className="text-slate-400 italic">Chưa phân công</span>}
                                            </TableCell>
                                            <TableCell>
                                                {cls.course?.mode === "online" ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-normal">
                                                        <Monitor className="w-3 h-3 mr-1" /> Online
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-normal">
                                                        <Building2 className="w-3 h-3 mr-1" /> Offline
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">
                                                {cls.max_students || 40} học sinh
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">
                                                {cls.room || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    cls.status === "active"
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"
                                                        : "bg-slate-100 text-slate-600 border border-slate-200 text-xs"
                                                }>
                                                    {cls.status === "active" ? "Đang mở" : "Đã kết thúc"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ClassActions
                                                    cls={cls}
                                                    courses={courses}
                                                    teachers={teachers}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
