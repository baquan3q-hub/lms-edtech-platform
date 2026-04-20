"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchParentNotifications, fetchStudentFeedbackForParent } from "@/lib/actions/parentStudent";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/actions/notifications";
import { confirmAnnouncementRead, recordAnnouncementRead } from "@/lib/actions/admin-announcements";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Bell, Megaphone, CheckCheck, Loader2, FileText,
    Calendar, BookOpen, BarChart3, Info, ExternalLink,
    Video, Link2, ChevronDown, ChevronUp, Filter, Inbox, MessageSquare, AlertTriangle, Circle, CheckCircle2,
    ClipboardCheck, ThumbsUp, ClipboardList, CheckCircle
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
    attendance: Calendar,
    absence_request: FileText,
    quiz_feedback: BookOpen,
    child_quiz_feedback: BarChart3,
    teacher_review: ClipboardCheck,
    system: Info,
    announcement: Megaphone,
    survey: ClipboardList,
};

const COLOR_MAP: Record<string, string> = {
    attendance: "text-amber-600 bg-amber-50 border-amber-200",
    absence_request: "text-emerald-600 bg-emerald-50 border-emerald-200",
    quiz_feedback: "text-purple-600 bg-purple-50 border-purple-200",
    child_quiz_feedback: "text-indigo-600 bg-indigo-50 border-indigo-200",
    teacher_review: "text-teal-600 bg-teal-50 border-teal-200",
    system: "text-blue-600 bg-blue-50 border-blue-200",
    announcement: "text-orange-600 bg-orange-50 border-orange-200",
    survey: "text-pink-600 bg-pink-50 border-pink-200",
};

// Chuyển bất kỳ giá trị nào về string an toàn để render trong React
function safeString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
        // Trích xuất nội dung text từ object AI-generated
        return value.explanation || value.tip || value.message || value.title || value.content || value.text || JSON.stringify(value);
    }
    return String(value);
}

// Sanitize một notification item — đảm bảo title và message luôn là string
function sanitizeItem(item: any): any {
    return {
        ...item,
        title: safeString(item.title),
        message: typeof item.message === 'object' && item.message !== null ? safeString(item.message) : item.message,
        content: typeof item.content === 'object' && item.content !== null ? safeString(item.content) : item.content,
    };
}

type StudentInfo = {
    id: string;
    full_name: string;
    email: string;
    relationship: string;
};

type FilterType = 'all' | 'announcement' | 'system' | 'survey' | 'confirmed';

export default function ParentNotificationsClient({ students, parentId }: { students: StudentInfo[]; parentId: string }) {
    const router = useRouter();
    const supabase = createClient();
    const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<FilterType>('all');
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [classIds, setClassIds] = useState<string[]>([]);
    const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Feedback Modal State
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
    const [loadingFeedback, setLoadingFeedback] = useState(false);



    const loadNotifications = useCallback(async (studentId: string, filterType: FilterType, reset = true) => {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const offset = reset ? 0 : items.length;
        // Khi filter = 'confirmed', fetch tất cả rồi lọc client-side
        const apiFilter = filterType === 'confirmed' ? 'all' : filterType;
        const { data } = await fetchParentNotifications(studentId, { limit: 30, offset, filter: apiFilter as any });

        if (data) {
            const safeItems = (data.items || []).map(sanitizeItem);
            if (reset) {
                setItems(safeItems);
            } else {
                setItems(prev => [...prev, ...safeItems]);
            }
            setUnreadCount(data.unreadCount);
            setClassIds(data.classIds);
            setHasMore(data.items.length >= 30);
            // Khởi tạo trạng thái đã xác nhận xem từ server
            if (data.confirmedAnnouncementIds && reset) {
                setConfirmedIds(new Set(data.confirmedAnnouncementIds));
            }
        }

        setLoading(false);
        setLoadingMore(false);
    }, [items.length]);

    useEffect(() => {
        if (selectedStudentId) {
            loadNotifications(selectedStudentId, filter, true);
        }
    }, [selectedStudentId, filter]);

    // Realtime subscriptions
    useEffect(() => {
        if (!parentId || classIds.length === 0) return;

        const channel = supabase
            .channel(`parent-notifications-${parentId}`)
            // New system notifications
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${parentId}`,
                },
                (payload) => {
                    const newItem = sanitizeItem({
                        ...payload.new,
                        source: 'notification',
                        sort_date: (payload.new as any).created_at,
                    });
                    setItems(prev => [newItem, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            // New class announcements
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "announcements",
                },
                (payload) => {
                    const ann = payload.new as any;
                    if (classIds.includes(ann.class_id)) {
                        const newItem = sanitizeItem({
                            ...ann,
                            source: 'announcement',
                            sort_date: ann.created_at,
                            class_name: "Lớp học",
                            teacher_name: null,
                        });
                        setItems(prev => [newItem, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [parentId, classIds, supabase]);

    const handleClickNotification = async (item: any) => {
        // Đánh dấu đã đọc
        if (item.source === 'notification' && !item.is_read) {
            await markNotificationAsRead(item.id);
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_read: true } : i));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        // Luôn expand/collapse inline — không redirect, không mở modal
        const compositeId = `${item.source}-${item.id}`;
        setExpandedId(prev => prev === compositeId ? null : compositeId);
    };

    // Mở modal feedback chi tiết (gọi từ nút trong expanded view)
    const handleOpenFeedbackDetail = async (item: any) => {
        setFeedbackModalOpen(true);
        setLoadingFeedback(true);
        setSelectedFeedback(null);
        const { data } = await fetchStudentFeedbackForParent(item.metadata.analysisId, selectedStudentId);
        setSelectedFeedback(data);
        setLoadingFeedback(false);
    };

    const handleReadAll = async () => {
        await markAllNotificationsAsRead();
        setItems(prev => prev.map(i => i.source === 'notification' ? { ...i, is_read: true } : i));
        setUnreadCount(0);
    };

    // Xử lý xác nhận "Đã xem" cho announcement
    const handleConfirmRead = async (announcementId: string) => {
        setConfirmingId(announcementId);
        const res = await confirmAnnouncementRead(announcementId);
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            setConfirmedIds(prev => new Set([...prev, announcementId]));
            toast.success("Đã xác nhận xem thông báo!");
        }
        setConfirmingId(null);
    };

    const filters: { key: FilterType; label: string; icon: React.ElementType }[] = [
        { key: 'all', label: 'Tất cả', icon: Inbox },
        { key: 'announcement', label: 'Thông báo lớp', icon: Megaphone },
        { key: 'system', label: 'Hệ thống', icon: Bell },
        { key: 'survey', label: 'Khảo sát', icon: ClipboardList },
        { key: 'confirmed', label: 'Đã xem', icon: CheckCircle2 },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        Thông báo
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Theo dõi thông báo từ lớp học và giáo viên</p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReadAll}
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                        <CheckCheck className="w-4 h-4 mr-1.5" /> Đọc tất cả ({unreadCount})
                    </Button>
                )}
            </div>

            {/* Student selector (if multiple children) */}
            {students.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {students.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedStudentId(s.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl shrink-0 transition-all text-sm font-medium ${selectedStudentId === s.id
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-amber-300"
                                }`}
                        >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${selectedStudentId === s.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"}`}>
                                {s.full_name?.charAt(0)}
                            </span>
                            {s.full_name}
                        </button>
                    ))}
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                {filters.map(f => {
                    const Icon = f.icon;
                    const isActive = filter === f.key;
                    return (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {f.label}
                        </button>
                    );
                })}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                    <span className="ml-3 text-sm text-slate-500 font-medium">Đang tải thông báo...</span>
                </div>
            )}

            {/* Empty state */}
            {!loading && items.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có thông báo</h3>
                    <p className="text-sm text-slate-400">Khi có thông báo mới, chúng sẽ hiện ở đây.</p>
                </div>
            )}

            {/* Notification list */}
            {!loading && items.length > 0 && (
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const isAnnouncement = item.source === 'announcement';
                        const type = isAnnouncement ? (item.resource_type === 'survey' ? 'survey' : 'announcement') : (item.type || 'system');
                        const Icon = ICON_MAP[type] || ICON_MAP.system;
                        const colorClass = COLOR_MAP[type] || COLOR_MAP.system;
                        const isUnread = isAnnouncement ? false : !item.is_read;
                        const isExpanded = expandedId === `${item.source}-${item.id}`;
                        
                        let displayContent = isAnnouncement ? item.content : item.message;
                        if (typeof displayContent === 'object' && displayContent !== null) {
                            displayContent = displayContent.explanation || displayContent.tip || JSON.stringify(displayContent);
                        }

                        return (
                            <div
                                key={`${item.source}-${item.id}-${idx}`}
                                onClick={() => handleClickNotification(item)}
                                className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${isUnread
                                    ? "bg-blue-50/60 border-blue-200 hover:border-blue-300 shadow-sm"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                    }`}
                            >
                                {/* Unread indicator */}
                                {isUnread && (
                                    <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                )}

                                <div className="flex items-start gap-3.5">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                {/* Source badge */}
                                                <div className="flex items-center gap-2 mb-1">
                                                    {isAnnouncement ? (
                                                        <Badge className={`${item.resource_type === 'survey' ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'} border-none text-[9px] font-semibold`}>
                                                            {item.resource_type === 'survey' ? '📋 Khảo sát' : `📢 ${item.class_name}`}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className={`border-none text-[9px] font-semibold ${type === 'attendance' ? 'bg-amber-100 text-amber-700'
                                                            : type === 'quiz_feedback' || type === 'child_quiz_feedback' ? 'bg-purple-100 text-purple-700'
                                                            : type === 'absence_request' ? 'bg-emerald-100 text-emerald-700'
                                                            : type === 'teacher_review' ? 'bg-teal-100 text-teal-700'
                                                            : type === 'survey' ? 'bg-pink-100 text-pink-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {type === 'attendance' ? '📅 Điểm danh'
                                                                : type === 'quiz_feedback' || type === 'child_quiz_feedback' ? '📊 Kết quả học tập'
                                                                : type === 'absence_request' ? '📄 Xin phép'
                                                                : type === 'teacher_review' ? '📝 Nhận xét GV'
                                                                : type === 'survey' ? '📋 Khảo sát'
                                                                : '🔔 Hệ thống'
                                                            }
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <p className={`text-sm leading-snug ${isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                                                    {item.title}
                                                </p>

                                                {/* Message / Content */}
                                                <p className={`text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-wrap transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                    {displayContent}
                                                </p>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3" onClick={e => e.stopPropagation()}>
                                                        {/* Attachments */}
                                                        {item.attachments && item.attachments.length > 0 && (
                                                            <div className="grid gap-2">
                                                                {item.attachments.map((file: any, fidx: number) => (
                                                                    <a key={fidx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                                                                        <FileText className="w-4 h-4 text-blue-500" />
                                                                        <span className="text-xs font-medium text-slate-700 truncate">{file.name}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Legacy Attachments — cả announcement lẫn system notification có _announcementId */}
                                                        {(isAnnouncement || item._announcementId) && (item.file_url || item.video_url || item.link_url) && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.file_url && (
                                                                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors shadow-sm">
                                                                        <FileText className="w-4 h-4" /> Xem tài liệu
                                                                    </a>
                                                                )}
                                                                {item.video_url && (
                                                                    <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-100 transition-colors shadow-sm">
                                                                        <Video className="w-4 h-4" /> Xem video
                                                                    </a>
                                                                )}
                                                                {item.link_url && (
                                                                    <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition-colors shadow-sm">
                                                                        <Link2 className="w-4 h-4" /> Mở liên kết
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Confirm Read Button — cho cả announcement lẫn system notification có _announcementId */}
                                                        {(() => {
                                                            const annId = isAnnouncement ? item.id : item._announcementId;
                                                            if (!annId) return null;
                                                            if (confirmedIds.has(annId)) {
                                                                return (
                                                                    <div className="flex items-center justify-center gap-1.5 py-2 mt-2 bg-emerald-50 rounded-lg">
                                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                                        <span className="text-xs font-semibold text-emerald-600">Đã xác nhận xem</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => { e.stopPropagation(); handleConfirmRead(annId); }}
                                                                    disabled={confirmingId === annId}
                                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm mt-3"
                                                                >
                                                                    {confirmingId === annId ? (
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                    )}
                                                                    Xác nhận đã xem thông báo này
                                                                </Button>
                                                            );
                                                        })()}

                                                        {/* Quiz / Homework attachments */}
                                                        {(item.quiz_data || item.quiz_id) && (
                                                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200 mt-2">
                                                                <div className="w-8 h-8 rounded-lg shrink-0 bg-purple-200/50 flex items-center justify-center text-purple-700">
                                                                    <BookOpen className="w-4 h-4" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-xs font-bold text-purple-900">Bài tập / Khảo sát đính kèm</p>
                                                                    <p className="text-[10px] text-purple-600/80 mt-0.5 flex items-center gap-1">
                                                                        <Info className="w-3 h-3" /> Nhấn 'Tới chi tiết' để xem
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* System notification link action */}
                                                        {item.source === 'notification' && item.link && (
                                                            <Button size="sm" variant="outline" onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(item.link);
                                                            }} className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm mt-1">
                                                                Xem trang chi tiết <ExternalLink className="w-3.5 h-3.5 ml-2" />
                                                            </Button>
                                                        )}

                                                        {/* Feedback detail button */}
                                                        {item.type === 'feedback' && item.metadata?.analysisId && (
                                                            <Button size="sm" onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenFeedbackDetail(item);
                                                            }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-1">
                                                                <BookOpen className="w-3.5 h-3.5 mr-2" /> Xem nhận xét chi tiết từ giáo viên
                                                            </Button>
                                                        )}

                                                        {/* Teacher review detail button */}
                                                        {item.type === 'teacher_review' && item.link && (
                                                            <Button size="sm" onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(item.link);
                                                            }} className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-sm mt-1">
                                                                <ClipboardCheck className="w-3.5 h-3.5 mr-2" /> Xem trang nhận xét giáo viên
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Teacher name for announcements (collapsed state) */}
                                                {!isExpanded && isAnnouncement && item.teacher_name && (
                                                    <p className="text-[10px] text-slate-400 mt-1.5">
                                                        👩‍🏫 {item.teacher_name}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Time & Expand button */}
                                            <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {item.sort_date && formatDistanceToNow(new Date(item.sort_date), { addSuffix: true, locale: vi })}
                                                </span>
                                                <button className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                                                    {isExpanded ? (
                                                        <>Thu gọn <ChevronUp className="w-3 h-3" /></>
                                                    ) : (
                                                        <>Chi tiết <ChevronDown className="w-3 h-3" /></>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Parent Feedback Dialog */}
            <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 bg-slate-50">
                    <DialogHeader className="p-5 bg-white border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            Chi tiết Nhận xét & Đề xuất
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-5">
                        {loadingFeedback ? (
                            <div className="flex flex-col flex-1 items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                                <p className="text-slate-500 font-medium">Đang tải dữ liệu nhận xét...</p>
                            </div>
                        ) : selectedFeedback ? (
                            <div className="space-y-6">
                                {/* Teacher Feedback */}
                                {(selectedFeedback.teacher_edited_feedback || selectedFeedback.ai_feedback) && (
                                    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                                        <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-100">
                                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-indigo-500" /> Nhận xét từ Giáo viên
                                            </h3>
                                        </div>
                                        <div className="p-5">
                                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                {selectedFeedback.teacher_edited_feedback || selectedFeedback.ai_feedback}
                                            </p>
                                            
                                            {selectedFeedback.knowledge_gaps && selectedFeedback.knowledge_gaps.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Kiến thức cần cải thiện
                                                    </h4>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {selectedFeedback.knowledge_gaps.map((gap: string, i: number) => (
                                                            <Badge key={i} className="bg-red-50 text-red-700 border-none text-[10px]">🔴 {gap}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Improvement Tasks */}
                                {(selectedFeedback.teacher_edited_tasks || selectedFeedback.ai_improvement_tasks) && (
                                    <div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                            <BookOpen className="w-5 h-5 text-indigo-500" /> Bài tập cải thiện được giao
                                        </h3>
                                        <div className="space-y-3">
                                            {(selectedFeedback.teacher_edited_tasks || selectedFeedback.ai_improvement_tasks).map((task: any, idx: number) => {
                                                const prog = (selectedFeedback.progress || []).find((p: any) => p.task_index === idx);
                                                const isCompleted = prog?.status === 'completed';
                                                
                                                return (
                                                    <div key={idx} className={`p-4 rounded-xl border ${isCompleted ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                                        <div className="flex items-start gap-3">
                                                            {isCompleted ? (
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                            ) : (
                                                                <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                                                            )}
                                                            <div className="flex-1">
                                                                <h4 className={`font-bold text-sm ${isCompleted ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                                    Bài tập {idx + 1}: {task.title}
                                                                </h4>
                                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                                    {task.theory || 'Gồm lý thuyết và bài tập trắc nghiệm nhỏ.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col flex-1 items-center justify-center py-20 text-center">
                                <AlertTriangle className="w-10 h-10 text-slate-300 mb-4" />
                                <h3 className="font-bold text-slate-700">Không tìm thấy dữ liệu</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-sm">Có thể dữ liệu đã bị xóa hoặc xảy ra lỗi trong quá trình tải. Vui lòng thử lại sau.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>


        </div>
    );
}
