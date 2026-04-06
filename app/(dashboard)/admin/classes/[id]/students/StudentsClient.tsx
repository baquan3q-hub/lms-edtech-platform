"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash, Users, UserX } from "lucide-react";
import { addStudentToClass, removeStudentFromClass, updateEnrollmentStatus } from "./actions";

interface Student {
    id: string;
    full_name: string;
    email: string;
    currentClasses?: string[];
}

interface Enrollment {
    id: string;
    student_id: string;
    enrolled_at: string;
    status: string;
    student: Student;
}

interface StudentsClientProps {
    classId: string;
    enrollments: Enrollment[];
    availableStudents: Student[];
}

export default function StudentsClient({ classId, enrollments, availableStudents }: StudentsClientProps) {
    const [loading, setLoading] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");

    const handleAddStudent = async () => {
        if (!selectedStudentId) {
            toast.error("Vui lòng chọn học sinh từ danh sách");
            return;
        }

        setLoading(true);
        try {
            const result = await addStudentToClass(classId, selectedStudentId);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Đã thêm học sinh vào lớp");
            setSelectedStudentId(""); // Reset select
        } catch (error) {
            toast.error("Đã xảy ra lỗi khi thêm học sinh");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveStudent = async (enrollmentId: string, studentName: string) => {
        if (!confirm(`Xóa học sinh ${studentName} khỏi lớp này?`)) return;

        setLoading(true);
        try {
            const result = await removeStudentFromClass(classId, enrollmentId);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Đã xóa học sinh khỏi lớp");
        } catch (error) {
            toast.error("Lỗi khi xóa học sinh");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (enrollmentId: string, newStatus: string) => {
        setLoading(true);
        try {
            const result = await updateEnrollmentStatus(classId, enrollmentId, newStatus);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Đã thay đổi trạng thái học tập");
        } catch (error) {
            toast.error("Lỗi khi cập nhật trạng thái");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Add Student Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" />
                    Thêm học sinh vào lớp
                </h3>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={loading || availableStudents.length === 0}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={availableStudents.length === 0 ? "Tất cả học viên đã được thêm vào lớp" : "Chọn học viên..."}>
                                    {selectedStudentId ? availableStudents.find((s) => s.id === selectedStudentId)?.full_name : ""}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {availableStudents.map(student => (
                                    <SelectItem key={student.id} value={student.id}>
                                        <div className="flex flex-col py-1 text-left">
                                            <span className="font-medium text-slate-800">
                                                {student.full_name} <span className="text-slate-500 font-normal">({student.email})</span>
                                            </span>
                                            {student.currentClasses && student.currentClasses.length > 0 ? (
                                                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                    <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Đang học:</span>
                                                    {student.currentClasses.map((c, i) => (
                                                        <Badge key={i} variant="outline" className="text-[10px] py-0 h-[18px] bg-slate-50 text-slate-600 border-slate-200">
                                                            {c}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="mt-1.5">
                                                    <span className="text-[10px] text-emerald-600 font-medium py-0.5 px-2 rounded-full bg-emerald-50 border border-emerald-100">
                                                        Thành viên Tự do (Chưa có lớp)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleAddStudent}
                        disabled={loading || !selectedStudentId}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {loading ? "Đang thêm..." : "Thêm vào lớp"}
                    </Button>
                </div>
            </div>

            {/* Students List Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-500" />
                        Danh sách Học sinh hiện tại ({enrollments.length})
                    </h3>
                </div>

                {enrollments.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <UserX className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>Chưa có học sinh nào trong lớp này.</p>
                        <p className="text-sm mt-1">Sử dụng công cụ phía trên để thêm học viên.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-12 text-center">STT</TableHead>
                                <TableHead>Học viên</TableHead>
                                <TableHead>Ngày tham gia</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments.map((enrollment, index) => (
                                <TableRow key={enrollment.id} className="hover:bg-slate-50/50">
                                    <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900">{enrollment.student.full_name}</span>
                                            <span className="text-xs text-slate-500">{enrollment.student.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {new Date(enrollment.enrolled_at).toLocaleDateString("vi-VN")}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={enrollment.status}
                                            onValueChange={(val) => handleStatusChange(enrollment.id, val)}
                                            disabled={loading}
                                        >
                                            <SelectTrigger className="w-[140px] h-8 text-xs font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 px-1 py-0 mr-2">Đang học</Badge>
                                                </SelectItem>
                                                <SelectItem value="completed">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 px-1 py-0 mr-2">Đã hoàn thành</Badge>
                                                </SelectItem>
                                                <SelectItem value="dropped">
                                                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 px-1 py-0 mr-2">Bỏ học</Badge>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveStudent(enrollment.id, enrollment.student.full_name)}
                                            disabled={loading}
                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 h-8"
                                        >
                                            <Trash className="w-4 h-4 mr-1" /> Xóa
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
