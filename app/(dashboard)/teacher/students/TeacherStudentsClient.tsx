"use client";

import { useState, useEffect } from "react";
import { Search, Users, Filter, Eye, Phone, Mail, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
import { fetchTeacherClasses, fetchTeacherStudents } from "@/lib/actions/teacherStudents";

type ClassOption = { id: string; name: string; course: any };

export default function TeacherStudentsClient() {
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("all");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        loadStudents();
    }, [selectedClassId]);

    const loadClasses = async () => {
        const res = await fetchTeacherClasses();
        setClasses(res.data || []);
    };

    const loadStudents = async () => {
        setLoading(true);
        const classFilter = selectedClassId === "all" ? undefined : selectedClassId;
        const res = await fetchTeacherStudents(classFilter);
        setStudents(res.data || []);
        setLoading(false);
    };

    const filteredStudents = students.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                    <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Quản lý Học viên</h1>
                    <p className="text-sm text-slate-500">Xem thông tin chi tiết học viên và phụ huynh trong các lớp của bạn</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-full sm:w-[250px]">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Lọc theo lớp" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả lớp</SelectItem>
                        {classes.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} — {cls.course?.name || ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
                    <p className="text-3xl font-black text-indigo-600">{filteredStudents.length}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Học viên</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
                    <p className="text-3xl font-black text-emerald-600">{classes.length}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Lớp đang dạy</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
                    <p className="text-3xl font-black text-amber-600">
                        {filteredStudents.filter(s => s.parents?.length > 0).length}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Có PH liên kết</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
                    <p className="text-3xl font-black text-rose-500">
                        {filteredStudents.filter(s => !s.parents || s.parents.length === 0).length}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Chưa có PH</p>
                </div>
            </div>

            {/* Student List */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Không tìm thấy học viên nào.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredStudents.map((student, idx) => (
                        <div key={student.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-emerald-200 transition-colors">
                            {/* Main row */}
                            <div
                                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                                onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900">{student.full_name}</p>
                                    <p className="text-xs text-slate-500">{student.email}</p>
                                </div>

                                {/* Classes */}
                                <div className="hidden sm:flex flex-wrap gap-1">
                                    {student.classes?.map((cls: any) => (
                                        <Badge key={cls.id} variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">
                                            {cls.name}
                                        </Badge>
                                    ))}
                                </div>

                                {/* Parent count */}
                                <Badge
                                    variant="outline"
                                    className={`shrink-0 text-[10px] ${student.parents?.length > 0
                                        ? "bg-amber-50 text-amber-600 border-amber-200"
                                        : "bg-slate-50 text-slate-400 border-slate-200"
                                        }`}
                                >
                                    {student.parents?.length || 0} PH
                                </Badge>

                                {expandedStudentId === student.id
                                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                }
                            </div>

                            {/* Expanded detail */}
                            {expandedStudentId === student.id && (
                                <div className="px-5 pb-5 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                        {/* Student Detail */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-indigo-500 pl-2">
                                                Thông tin Học viên
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                    <span>{student.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Phone className="w-4 h-4 text-slate-400" />
                                                    <span>{student.phone || "Chưa có SĐT"}</span>
                                                </div>
                                                {student.profile && (
                                                    <div className="mt-3 space-y-1.5 bg-slate-50 rounded-lg p-3">
                                                        {student.profile.date_of_birth && (
                                                            <p className="text-xs"><span className="text-slate-400">Ngày sinh:</span> <span className="font-medium text-slate-700">{new Date(student.profile.date_of_birth).toLocaleDateString("vi-VN")}</span></p>
                                                        )}
                                                        {student.profile.gender && (
                                                            <p className="text-xs"><span className="text-slate-400">Giới tính:</span> <span className="font-medium text-slate-700">{student.profile.gender}</span></p>
                                                        )}
                                                        {student.profile.address && (
                                                            <p className="text-xs"><span className="text-slate-400">Địa chỉ:</span> <span className="font-medium text-slate-700">{student.profile.address}</span></p>
                                                        )}
                                                        {student.profile.grade_level && (
                                                            <p className="text-xs"><span className="text-slate-400">Lớp/Khối:</span> <span className="font-medium text-slate-700">{student.profile.grade_level}</span></p>
                                                        )}
                                                        {student.profile.school_name && (
                                                            <p className="text-xs"><span className="text-slate-400">Trường:</span> <span className="font-medium text-slate-700">{student.profile.school_name}</span></p>
                                                        )}
                                                    </div>
                                                )}
                                                {!student.profile && (
                                                    <p className="text-xs text-slate-400 italic mt-2">Học viên chưa cập nhật thông tin cá nhân.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Parents Detail */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-amber-500 pl-2">
                                                Phụ huynh liên kết ({student.parents?.length || 0})
                                            </h4>
                                            {(!student.parents || student.parents.length === 0) ? (
                                                <p className="text-xs text-slate-400 italic">Chưa có phụ huynh liên kết.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {student.parents.map((link: any) => (
                                                        <div key={link.id} className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                                    {link.parent?.full_name?.charAt(0) || "?"}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-semibold text-slate-800 text-sm truncate">
                                                                            {link.parent?.full_name || "Không rõ"}
                                                                        </p>
                                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] shrink-0">
                                                                            {link.relationship || "PH"}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                            <Mail className="w-3 h-3" /> {link.parent?.email || "—"}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                            <Phone className="w-3 h-3" /> {link.parent?.phone || "—"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
