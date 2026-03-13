"use client";

import React, { useState, useTransition } from "react";
import { Search, Trophy, Medal, PlusCircle, MinusCircle, History, AlertCircle, X, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addPointTransaction } from "@/lib/actions/point";

export default function PointsManagerClient({ classId, initialLeaderboard }: { classId: string, initialLeaderboard: any[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [pointAmount, setPointAmount] = useState<number>(5);
    const [pointReason, setPointReason] = useState<string>("Phát biểu xây dựng bài");
    const [pointType, setPointType] = useState<string>("participation");
    const [isSubmitting, startTransition] = useTransition();
    const [actionType, setActionType] = useState<"add" | "subtract">("add");

    const filteredLeaderboard = initialLeaderboard.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const presetReasons = actionType === "add" ? [
        { label: "Phát biểu xây dựng bài", points: 5, type: "participation" },
        { label: "Hoàn thành xuất sắc bài tập", points: 10, type: "homework" },
        { label: "Đi học chuyên cần", points: 2, type: "attendance" },
        { label: "Giúp đỡ bạn bè", points: 5, type: "behavior" },
    ] : [
        { label: "Vắng mặt không phép", points: -5, type: "attendance" },
        { label: "Không làm bài tập", points: -10, type: "homework" },
        { label: "Nói chuyện riêng / Làm việc riêng", points: -2, type: "behavior" },
        { label: "Đi trễ", points: -2, type: "attendance" },
    ];

    const openModal = (student: any, action: "add" | "subtract") => {
        setSelectedStudent(student);
        setActionType(action);
        setIsAddModalOpen(true);
        // Set default presets
        if (action === "add") {
            setPointAmount(5);
            setPointReason("Phát biểu xây dựng bài");
            setPointType("participation");
        } else {
            setPointAmount(-2);
            setPointReason("Đi trễ");
            setPointType("attendance");
        }
    };

    const handlePresetSelect = (preset: any) => {
        setPointReason(preset.label);
        setPointAmount(preset.points);
        setPointType(preset.type);
    };

    const handleSubmitResult = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || pointAmount === 0 || !pointReason.trim()) return;

        startTransition(async () => {
            const res = await addPointTransaction({
                student_id: selectedStudent.student_id,
                class_id: classId,
                points: pointAmount,
                reason: pointReason,
                type: pointType as any,
            });

            if (!res.error) {
                setIsAddModalOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        });
    };

    const top3 = filteredLeaderboard.slice(0, 3);
    const theRest = filteredLeaderboard.slice(3);

    return (
        <div className="space-y-6">
            {/* Top 3 Podium */}
            {top3.length > 0 && (
                <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 pt-8 pb-4">
                    {/* Hạng 2 (Silver) */}
                    {top3[1] && (
                        <div className="flex flex-col items-center order-2 md:order-1 relative pb-2 md:pb-0 translate-y-0 md:translate-y-6">
                            <div className="relative mb-3">
                                <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-slate-300 flex items-center justify-center shadow-lg overflow-hidden">
                                    {top3[1].avatar_url ? (
                                        <img src={top3[1].avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-slate-500">{top3[1].full_name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-slate-300 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm">
                                    2
                                </div>
                            </div>
                            <div className="text-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-100 min-w-[140px]">
                                <p className="font-bold text-slate-800 text-sm truncate max-w-[120px]" title={top3[1].full_name}>{top3[1].full_name}</p>
                                <p className="text-lg font-black text-slate-600 mt-0.5">{top3[1].total_points} đ</p>
                            </div>
                        </div>
                    )}

                    {/* Hạng 1 (Gold) */}
                    {top3[0] && (
                        <div className="flex flex-col items-center order-1 md:order-2 z-10">
                            <div className="relative mb-3">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                    <Trophy className="w-10 h-10 text-amber-400 drop-shadow-md" />
                                </div>
                                <div className="w-28 h-28 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center shadow-xl overflow-hidden ring-4 ring-amber-500/20">
                                    {top3[0].avatar_url ? (
                                        <img src={top3[0].avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-amber-600">{top3[0].full_name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="absolute -bottom-3 -right-1 bg-amber-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-4 border-white shadow-sm">
                                    1
                                </div>
                            </div>
                            <div className="text-center bg-gradient-to-b from-amber-50 to-white px-5 py-4 rounded-3xl shadow-md border border-amber-100 min-w-[160px]">
                                <p className="font-extrabold text-amber-900 truncate max-w-[140px]" title={top3[0].full_name}>{top3[0].full_name}</p>
                                <p className="text-2xl font-black text-amber-600 mt-1">{top3[0].total_points} đ</p>
                            </div>
                        </div>
                    )}

                    {/* Hạng 3 (Bronze) */}
                    {top3[2] && (
                        <div className="flex flex-col items-center order-3 md:order-3 relative pb-2 md:pb-0 translate-y-0 md:translate-y-8">
                            <div className="relative mb-3">
                                <div className="w-16 h-16 rounded-full bg-orange-100 border-4 border-orange-200 flex items-center justify-center shadow-md overflow-hidden">
                                    {top3[2].avatar_url ? (
                                        <img src={top3[2].avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-orange-500">{top3[2].full_name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-orange-300 text-orange-900 w-7 h-7 rounded-full flex items-center justify-center font-black text-sm border-2 border-white shadow-sm">
                                    3
                                </div>
                            </div>
                            <div className="text-center bg-white px-3 py-2.5 rounded-2xl shadow-sm border border-slate-100 min-w-[120px]">
                                <p className="font-bold text-slate-800 text-xs truncate max-w-[100px]" title={top3[2].full_name}>{top3[2].full_name}</p>
                                <p className="text-base font-black text-orange-600 mt-0.5">{top3[2].total_points} đ</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* List and Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                        <History className="w-5 h-5 mr-2 text-indigo-500" /> Bảng điểm thành viên
                    </h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm học sinh..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full md:w-[280px] bg-white border-slate-200"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white">
                                <th className="text-left py-3 px-5 font-semibold text-slate-500">Hạng</th>
                                <th className="text-left py-3 px-5 font-semibold text-slate-500">Học sinh</th>
                                <th className="text-center py-3 px-5 font-semibold text-slate-500">Tổng điểm</th>
                                <th className="text-right py-3 px-5 font-semibold text-slate-500">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeaderboard.map((student, index) => (
                                <tr key={student.student_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-5">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                            ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                                index === 1 ? 'bg-slate-200 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-600' :
                                                        'bg-slate-50 text-slate-400'}`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="py-3 px-5">
                                        <div className="font-semibold text-slate-800">{student.full_name}</div>
                                        <div className="text-xs text-slate-500">{student.email}</div>
                                    </td>
                                    <td className="py-3 px-5 text-center">
                                        <Badge variant="outline" className={`font-black text-sm px-3 py-1 ${student.total_points > 0 ? 'text-indigo-600 border-indigo-200 bg-indigo-50' :
                                                student.total_points < 0 ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-500 border-slate-200'
                                            }`}>
                                            {student.total_points}
                                        </Badge>
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/teacher/classes/${classId}/points/${student.student_id}`}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 md:px-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                                                    title="Xem lịch sử"
                                                >
                                                    <History className="w-4 h-4 mr-0 md:mr-1" />
                                                    <span className="hidden md:inline text-xs font-semibold">Lịch sử</span>
                                                </Button>
                                            </Link>
                                            <Button
                                                onClick={() => openModal(student, "subtract")}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                                title="Trừ điểm"
                                            >
                                                <MinusCircle className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                onClick={() => openModal(student, "add")}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                                title="Cộng điểm"
                                            >
                                                <PlusCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeaderboard.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center">
                                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 font-medium">Không tìm thấy học sinh nào.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Components */}
            {isAddModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`p-5 flex items-center justify-between border-b ${actionType === 'add' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionType === 'add' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {actionType === 'add' ? <PlusCircle className="w-6 h-6" /> : <MinusCircle className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${actionType === 'add' ? 'text-emerald-800' : 'text-red-800'}`}>
                                        {actionType === 'add' ? 'Tặng điểm' : 'Trừ điểm'}
                                    </h3>
                                    <p className={`text-xs font-medium ${actionType === 'add' ? 'text-emerald-600/80' : 'text-red-600/80'}`}>
                                        Học sinh: {selectedStudent.full_name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitResult} className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do phổ biến</label>
                                <div className="flex flex-wrap gap-2">
                                    {presetReasons.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handlePresetSelect(preset)}
                                            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium
                                                ${pointReason === preset.label 
                                                    ? (actionType === 'add' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-red-600 text-white border-red-600 shadow-sm')
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Số điểm</label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            required
                                            value={pointAmount}
                                            onChange={(e) => setPointAmount(Number(e.target.value))}
                                            className="font-black text-lg text-center pl-6"
                                            min={actionType === 'subtract' ? -100 : 1}
                                            max={actionType === 'subtract' ? -1 : 100}
                                        />
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-black ${actionType === 'add' ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {actionType === 'add' ? '+' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Chi tiết lý do</label>
                                    <Input
                                        type="text"
                                        required
                                        value={pointReason}
                                        onChange={(e) => setPointReason(e.target.value)}
                                        placeholder="Nhập lý do..."
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                                    Hủy bỏ
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className={actionType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                                >
                                    {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
