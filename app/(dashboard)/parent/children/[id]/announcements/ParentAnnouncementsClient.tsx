"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchParentClassAnnouncements, fetchStudentInfoForParent } from "@/lib/actions/parentAnnouncements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Bell, Loader2, Pin, Download, FileText, Video,
    ExternalLink, ListChecks, Filter, ArrowLeft, Eye
} from "lucide-react";
import Link from "next/link";

interface ParentAnnouncementsClientProps {
    studentId: string;
}

export default function ParentAnnouncementsClient({ studentId }: ParentAnnouncementsClientProps) {
    const [student, setStudent] = useState<any>(null);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [filter, setFilter] = useState<"all" | "has_files" | "has_quiz">("all");
    const LIMIT = 20;

    // Lấy thông tin học sinh
    useEffect(() => {
        fetchStudentInfoForParent(studentId).then(res => {
            if (res.data) setStudent(res.data);
        });
    }, [studentId]);

    // Lấy thông báo
    const loadAnnouncements = useCallback(async (reset = false) => {
        const currentOffset = reset ? 0 : offset;
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const res = await fetchParentClassAnnouncements(studentId, {
            classId: selectedClass === "all" ? undefined : selectedClass,
            filter,
            limit: LIMIT,
            offset: currentOffset,
        });

        if (res.data) {
            if (reset) {
                setAnnouncements(res.data.announcements);
                setOffset(LIMIT);
            } else {
                setAnnouncements(prev => [...prev, ...res.data!.announcements]);
                setOffset(prev => prev + LIMIT);
            }
            setClasses(res.data.classes);
            setTotal(res.data.total);
        }

        setLoading(false);
        setLoadingMore(false);
    }, [studentId, selectedClass, filter, offset]);

    useEffect(() => {
        loadAnnouncements(true);
    }, [studentId, selectedClass, filter]);

    // Helpers
    const getFileIcon = (type: string) => {
        if (type?.includes("pdf")) return "📄";
        if (type?.includes("word") || type?.includes("document")) return "📝";
        if (type?.includes("presentation") || type?.includes("powerpoint")) return "📊";
        if (type?.includes("image")) return "🖼️";
        if (type?.includes("video")) return "🎥";
        return "📎";
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const hasMore = announcements.length < total;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/parent">
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                    </Button>
                </Link>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    📢 Thông báo lớp học
                    {student && <span className="text-amber-600">— {student.full_name}</span>}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Tất cả thông báo giáo viên đã gửi đến lớp của con
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {classes.length > 1 && (
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-[200px] h-9 text-sm">
                            <SelectValue placeholder="Chọn lớp" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả lớp</SelectItem>
                            {classes.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        className={`text-xs h-8 ${filter === "all" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                        onClick={() => setFilter("all")}
                    >
                        Tất cả
                    </Button>
                    <Button
                        variant={filter === "has_files" ? "default" : "outline"}
                        size="sm"
                        className={`text-xs h-8 ${filter === "has_files" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
                        onClick={() => setFilter("has_files")}
                    >
                        📎 Có file
                    </Button>
                    <Button
                        variant={filter === "has_quiz" ? "default" : "outline"}
                        size="sm"
                        className={`text-xs h-8 ${filter === "has_quiz" ? "bg-indigo-500 hover:bg-indigo-600" : ""}`}
                        onClick={() => setFilter("has_quiz")}
                    >
                        📝 Có bài tập
                    </Button>
                </div>

                <Badge className="bg-slate-100 text-slate-600 border-none text-xs ml-auto">
                    {total} thông báo
                </Badge>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            )}

            {/* Empty */}
            {!loading && announcements.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-amber-200">
                    <Bell className="w-12 h-12 text-amber-200 mx-auto mb-3" />
                    <p className="text-lg font-bold text-slate-700">Chưa có thông báo nào</p>
                    <p className="text-sm text-slate-400 mt-1">Thông báo từ giáo viên sẽ xuất hiện ở đây.</p>
                </div>
            )}

            {/* Announcement List */}
            {!loading && announcements.length > 0 && (
                <div className="space-y-4">
                    {announcements.map((ann: any) => (
                        <div
                            key={ann.id}
                            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                                ann.is_pinned
                                    ? "border-amber-300 ring-1 ring-amber-200"
                                    : "border-slate-200"
                            }`}
                        >
                            {/* Card Header */}
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {ann.is_pinned && (
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                                            <Pin className="w-3 h-3 mr-0.5" /> Ghim
                                        </Badge>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                            {ann.teacher_name?.charAt(0) || "G"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {ann.teacher_name || "Giáo viên"}
                                            </p>
                                            <p className="text-[10px] text-slate-400">{ann.class_name}</p>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[11px] text-slate-400 shrink-0">
                                    {new Date(ann.created_at).toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </div>

                            {/* Card Content */}
                            <div className="px-5 py-4 space-y-3">
                                <h3 className="font-bold text-slate-900">{ann.title}</h3>
                                {ann.content && (
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                        {ann.content}
                                    </p>
                                )}

                                {/* Single file (legacy) */}
                                {ann.file_url && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                        <a
                                            href={ann.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline flex-1 truncate"
                                        >
                                            Tài liệu đính kèm
                                        </a>
                                        <a
                                            href={ann.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5"
                                        >
                                            <Download className="w-3 h-3" /> Tải về
                                        </a>
                                    </div>
                                )}

                                {/* Multi-file attachments (new) */}
                                {ann.attachments && ann.attachments.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                            📎 File đính kèm ({ann.attachments.length} file)
                                        </p>
                                        {ann.attachments.map((file: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                            >
                                                <span className="text-base shrink-0">{getFileIcon(file.type)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                                    {file.size && (
                                                        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                                                    )}
                                                </div>
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5 shrink-0"
                                                >
                                                    <Download className="w-3 h-3" /> Tải về
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Video */}
                                {ann.video_url && (
                                    <a
                                        href={ann.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors"
                                    >
                                        <Video className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span className="text-sm text-rose-600 font-medium">Video đính kèm</span>
                                        <ExternalLink className="w-3 h-3 text-rose-400 ml-auto" />
                                    </a>
                                )}

                                {/* Link */}
                                {ann.link_url && (
                                    <a
                                        href={ann.link_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-200 hover:bg-violet-100 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4 text-violet-500 shrink-0" />
                                        <span className="text-sm text-violet-600 font-medium truncate">{ann.link_url}</span>
                                    </a>
                                )}

                                {/* Quiz inline (read-only for parent) */}
                                {(ann.quiz_data || ann.quiz_id) && (
                                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                        <div className="flex items-center gap-2">
                                            <ListChecks className="w-4 h-4 text-indigo-500" />
                                            <span className="text-sm font-semibold text-indigo-700">
                                                📝 Bài ôn tập kèm theo
                                            </span>
                                        </div>
                                        {ann.quiz_data?.questions && (
                                            <p className="text-xs text-indigo-500 mt-1">
                                                {ann.quiz_data.questions.length} câu hỏi
                                            </p>
                                        )}
                                        <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-400">
                                            <Eye className="w-3 h-3" />
                                            Phụ huynh chỉ xem, không thể làm bài
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <Button
                                variant="outline"
                                onClick={() => loadAnnouncements(false)}
                                disabled={loadingMore}
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                            >
                                {loadingMore ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : null}
                                Xem thêm thông báo
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
