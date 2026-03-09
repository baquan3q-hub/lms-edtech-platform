"use client";

import { useState } from "react";
import { Users, Trophy, Download, Search, Eye, MessageSquare, ArrowUp, ArrowDown, Minus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import GradeReportDialog from "./GradeReportDialog";
import TeacherPointsTab from "./TeacherPointsTab";

interface StudentStats {
    total_sessions: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
    attendance_rate: number;
    avg_score: number;
}

interface StudentData {
    id: string;
    name: string;
    email: string;
    stats: StudentStats;
}

interface TeacherClassStudentsClientProps {
    classId: string;
    students: StudentData[];
}

export default function TeacherClassStudentsClient({ classId, students }: TeacherClassStudentsClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("list");
    const [selectedReportStudent, setSelectedReportStudent] = useState<string | null>(null);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Tính Rank Tổng hợp (40% chuyên cần, 60% điểm TB)
    const rankedStudents = [...filteredStudents].map(s => {
        const totalScore = (s.stats.attendance_rate * 0.4) + (s.stats.avg_score * 10 * 0.6);
        return { ...s, totalScore };
    }).sort((a, b) => b.totalScore - a.totalScore);

    const getProgressColor = (rate: number) => {
        if (rate >= 80) return "bg-emerald-500";
        if (rate >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border shadow-sm mb-6">
                    <TabsTrigger value="list" className="data-[state=active]:bg-slate-100">
                        <Users className="w-4 h-4 mr-2" />
                        Danh sách học viên
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" className="data-[state=active]:bg-slate-100">
                        <Trophy className="w-4 h-4 mr-2 text-amber-500" />
                        Bảng xếp hạng
                    </TabsTrigger>
                    <TabsTrigger value="points" className="data-[state=active]:bg-slate-100">
                        <Star className="w-4 h-4 mr-2 text-indigo-500" />
                        Điểm chuyên cần
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: DANH SÁCH HỌC VIÊN */}
                <TabsContent value="list" className="space-y-4 outline-none mt-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-500">Tổng số:</span>
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">{students.length} học viên</Badge>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Tìm kiếm học viên..."
                                    className="pl-9 bg-slate-50 border-transparent focus:bg-white transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="shrink-0 hidden sm:flex">
                                <Download className="w-4 h-4 mr-2" /> Xuất Excel
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Học viên</th>
                                        <th className="px-6 py-4 font-medium">Chuyên cần</th>
                                        <th className="px-6 py-4 font-medium">Chi tiết vắng</th>
                                        <th className="px-6 py-4 font-medium">Điểm TB</th>
                                        <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border">
                                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">
                                                            {student.name.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{student.name}</p>
                                                        <p className="text-xs text-slate-500">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-32 space-y-1.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-medium text-slate-700">{student.stats.attendance_rate}%</span>
                                                        <span className="text-slate-500">
                                                            {student.stats.present_count}/{student.stats.total_sessions}
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={student.stats.attendance_rate}
                                                        className="h-1.5"
                                                        indicatorColor={getProgressColor(student.stats.attendance_rate)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5">
                                                    {student.stats.absent_count > 0 && (
                                                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] px-1.5 min-w-[36px] justify-center">
                                                            V: {student.stats.absent_count}
                                                        </Badge>
                                                    )}
                                                    {student.stats.late_count > 0 && (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] px-1.5 min-w-[36px] justify-center">
                                                            T: {student.stats.late_count}
                                                        </Badge>
                                                    )}
                                                    {student.stats.excused_count > 0 && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] px-1.5 min-w-[36px] justify-center">
                                                            P: {student.stats.excused_count}
                                                        </Badge>
                                                    )}
                                                    {student.stats.absent_count === 0 && student.stats.late_count === 0 && student.stats.excused_count === 0 && (
                                                        <span className="text-xs text-slate-400">Không có</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-700">{student.stats.avg_score.toFixed(1)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Xem chi tiết">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Gửi báo cáo học tập" onClick={() => setSelectedReportStudent(student.id)}>
                                                        <MessageSquare className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                Không tìm thấy học viên nào phù hợp.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: BẢNG XẾP HẠNG */}
                <TabsContent value="leaderboard" className="space-y-6 outline-none mt-0 animate-in fade-in zoom-in-95 duration-300">
                    {/* Top 3 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        {/* Hạng 2 */}
                        {rankedStudents[1] && (
                            <div className="order-2 md:order-1 mt-0 md:mt-8">
                                <Card className="border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-300"></div>
                                    <CardContent className="p-6 text-center pt-8">
                                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl border-4 border-slate-200">
                                            🥈
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 truncate">{rankedStudents[1].name}</h3>
                                        <p className="text-sm text-slate-500 mb-4">{rankedStudents[1].stats.attendance_rate}% CC • {rankedStudents[1].stats.avg_score} ĐTB</p>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                                            {rankedStudents[1].totalScore.toFixed(1)} điểm
                                        </Badge>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Hạng 1 */}
                        {rankedStudents[0] && (
                            <div className="order-1 md:order-2">
                                <Card className="border-amber-200 shadow-md relative overflow-hidden ring-1 ring-amber-100">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500"></div>
                                    <CardContent className="p-6 text-center pt-8">
                                        <div className="w-20 h-20 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-4 text-4xl border-4 border-amber-200 shadow-inner">
                                            🥇
                                        </div>
                                        <h3 className="font-bold text-xl text-slate-900 truncate">{rankedStudents[0].name}</h3>
                                        <p className="text-sm text-amber-600 font-medium mb-4">{rankedStudents[0].stats.attendance_rate}% CC • {rankedStudents[0].stats.avg_score} ĐTB</p>
                                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 shadow-sm px-3 py-1">
                                            {rankedStudents[0].totalScore.toFixed(1)} điểm xuất sắc
                                        </Badge>
                                    </CardContent>
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-400/10 rounded-full blur-xl"></div>
                                    <div className="absolute -left-4 -top-4 w-24 h-24 bg-orange-400/10 rounded-full blur-xl"></div>
                                </Card>
                            </div>
                        )}

                        {/* Hạng 3 */}
                        {rankedStudents[2] && (
                            <div className="order-3 mt-0 md:mt-12">
                                <Card className="border-orange-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-300"></div>
                                    <CardContent className="p-6 text-center pt-8">
                                        <div className="w-14 h-14 mx-auto bg-orange-50 rounded-full flex items-center justify-center mb-4 text-xl border-4 border-orange-200">
                                            🥉
                                        </div>
                                        <h3 className="font-bold text-base text-slate-800 truncate">{rankedStudents[2].name}</h3>
                                        <p className="text-xs text-slate-500 mb-3">{rankedStudents[2].stats.attendance_rate}% CC • {rankedStudents[2].stats.avg_score} ĐTB</p>
                                        <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">
                                            {rankedStudents[2].totalScore.toFixed(1)} điểm
                                        </Badge>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* Bảng xếp hạng chi tiết */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div>
                                <CardTitle className="text-lg">Bảng xếp hạng toàn lớp</CardTitle>
                                <p className="text-sm text-slate-500 mt-1">Sắp xếp theo Điểm Tổng hợp (40% CC + 60% ĐTB)</p>
                            </div>
                            <Button className="hidden sm:flex" onClick={() => setSelectedReportStudent("all")}>
                                <MessageSquare className="w-4 h-4 mr-2" /> Gửi báo cáo toàn lớp
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 font-medium w-16 text-center">Hạng</th>
                                            <th className="px-6 py-3 font-medium">Học viên</th>
                                            <th className="px-6 py-3 font-medium text-center">Chuyên cần</th>
                                            <th className="px-6 py-3 font-medium text-center">Điểm TB</th>
                                            <th className="px-6 py-3 font-medium text-center">Xu hướng</th>
                                            <th className="px-6 py-3 font-medium text-right">Điểm tổng hợp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rankedStudents.map((student, index) => (
                                            <tr key={student.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 text-center font-bold text-slate-500">
                                                    #{index + 1}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {student.name}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={student.stats.attendance_rate >= 80 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                                                        {student.stats.attendance_rate}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={student.stats.avg_score >= 8 ? "text-emerald-600 font-medium" : "text-slate-700 font-medium"}>
                                                        {student.stats.avg_score.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {/* Mock xu hướng */}
                                                    {index % 3 === 0 ? (
                                                        <ArrowUp className="w-4 h-4 text-emerald-500 mx-auto" />
                                                    ) : index % 3 === 1 ? (
                                                        <Minus className="w-4 h-4 text-slate-400 mx-auto" />
                                                    ) : (
                                                        <ArrowDown className="w-4 h-4 text-red-500 mx-auto" />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                                    {student.totalScore.toFixed(1)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: ĐIỂM CHUYÊN CẦN */}
                <TabsContent value="points" className="space-y-6 outline-none mt-0">
                    <TeacherPointsTab classId={classId} />
                </TabsContent>
            </Tabs>

            {selectedReportStudent && (
                <GradeReportDialog
                    classId={classId}
                    studentId={selectedReportStudent}
                    studentName={selectedReportStudent === "all" ? undefined : students.find(s => s.id === selectedReportStudent)?.name}
                    onClose={() => setSelectedReportStudent(null)}
                />
            )}
        </div>
    );
}
