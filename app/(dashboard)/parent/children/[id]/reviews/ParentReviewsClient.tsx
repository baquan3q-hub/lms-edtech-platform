"use client";

import { useState } from "react";
import {
    FileBarChart, ThumbsUp, AlertTriangle, MessageSquare,
    CalendarDays, Star, Clock, BookOpen, Filter, ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const REVIEW_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    session: { label: "Buổi học", color: "text-blue-700", bg: "bg-blue-50" },
    weekly: { label: "Tuần", color: "text-emerald-700", bg: "bg-emerald-50" },
    monthly: { label: "Tháng", color: "text-purple-700", bg: "bg-purple-50" },
    quarterly: { label: "Quý", color: "text-amber-700", bg: "bg-amber-50" },
    course_end: { label: "Hết khóa", color: "text-rose-700", bg: "bg-rose-50" },
};

interface ParentReviewsClientProps {
    reviews: any[];
    studentId: string;
}

export default function ParentReviewsClient({ reviews, studentId }: ParentReviewsClientProps) {
    const [filterType, setFilterType] = useState<string>("all");

    const filtered = filterType === "all" ? reviews : reviews.filter(r => r.review_type === filterType);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <Link href="/parent" className="text-sm text-indigo-600 font-medium hover:underline mb-1 inline-block">
                        ← Quay lại Dashboard
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <FileBarChart className="w-5 h-5 text-white" />
                        </div>
                        Nhận xét từ Giáo viên
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Xem nhận xét, đánh giá và báo cáo học tập từ giáo viên
                    </p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2 bg-white rounded-xl border border-slate-200 p-3">
                <button
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        filterType === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                    Tất cả ({reviews.length})
                </button>
                {Object.entries(REVIEW_TYPE_LABELS).map(([key, meta]) => {
                    const count = reviews.filter(r => r.review_type === key).length;
                    if (count === 0) return null;
                    return (
                        <button
                            key={key}
                            onClick={() => setFilterType(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterType === key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                            }`}
                        >
                            {meta.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Reviews List */}
            {filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((review: any) => {
                        const typeMeta = REVIEW_TYPE_LABELS[review.review_type] || REVIEW_TYPE_LABELS.session;
                        return (
                            <div key={review.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <Badge className={`${typeMeta.bg} ${typeMeta.color} border-none text-xs`}>
                                            {typeMeta.label}
                                        </Badge>
                                        <span className="text-sm font-medium text-slate-700">
                                            {review.class?.name}
                                            {review.class?.course?.name && <span className="text-slate-400 ml-1">({review.class.course.name})</span>}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <CalendarDays className="w-3 h-3" />
                                            {new Date(review.review_date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                                        </p>
                                        {review.period_label && (
                                            <p className="text-[10px] font-semibold text-indigo-600">{review.period_label}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Score Data (for periodic reviews) */}
                                {review.score_data && Object.keys(review.score_data).length > 0 && review.score_data.overallAvg !== undefined && (
                                    <div className="px-5 py-3 border-b border-slate-100 bg-indigo-50/30">
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                            <div className="bg-white rounded-lg p-2.5 text-center border border-indigo-100">
                                                <p className="text-slate-400 mb-0.5">Chuyên cần</p>
                                                <p className="font-black text-indigo-700 text-lg">{review.score_data.attendanceRate}%</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2.5 text-center border border-indigo-100">
                                                <p className="text-slate-400 mb-0.5">ĐTB Kiểm tra</p>
                                                <p className="font-black text-emerald-700 text-lg">{review.score_data.avgExamScore}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2.5 text-center border border-indigo-100">
                                                <p className="text-slate-400 mb-0.5">ĐTB Bài tập</p>
                                                <p className="font-black text-amber-700 text-lg">{review.score_data.avgHwScore}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2.5 text-center border border-indigo-100">
                                                <p className="text-slate-400 mb-0.5">ĐTB Chung</p>
                                                <p className="font-black text-purple-700 text-lg">{review.score_data.overallAvg}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2.5 text-center border border-indigo-100">
                                                <p className="text-slate-400 mb-0.5">Xếp loại</p>
                                                <p className={`font-black text-lg ${
                                                    review.score_data.rank === "Giỏi" ? "text-emerald-600" :
                                                    review.score_data.rank === "Khá" ? "text-indigo-600" :
                                                    review.score_data.rank === "Trung bình" ? "text-amber-600" :
                                                    "text-red-600"
                                                }`}>{review.score_data.rank}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tags */}
                                <div className="px-5 py-4 space-y-3">
                                    {review.positive_tags && review.positive_tags.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 mb-2">
                                                <ThumbsUp className="w-3 h-3" /> Điểm tốt
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {review.positive_tags.map((tag: string) => (
                                                    <span key={tag} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                                                        ✓ {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {review.improvement_tags && review.improvement_tags.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1 mb-2">
                                                <AlertTriangle className="w-3 h-3" /> Cần cải thiện
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {review.improvement_tags.map((tag: string) => (
                                                    <span key={tag} className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium border border-rose-200">
                                                        ⚠ {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {review.teacher_comment && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1.5">
                                                <MessageSquare className="w-3 h-3" /> Nhận xét từ Giáo viên
                                            </p>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                {review.teacher_comment}
                                            </p>
                                            {review.teacher?.full_name && (
                                                <p className="text-[10px] text-slate-400 mt-2 italic">— {review.teacher.full_name}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <FileBarChart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Chưa có nhận xét nào từ giáo viên.</p>
                    <p className="text-sm text-slate-400 mt-1">Khi giáo viên gửi nhận xét, bạn sẽ thấy ở đây.</p>
                </div>
            )}
        </div>
    );
}
