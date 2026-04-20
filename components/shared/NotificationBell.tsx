"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, Calendar, FileText, Info, BookOpen, BarChart3, ClipboardCheck, ChevronDown, ChevronUp, X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/actions/notifications";

const ICONS: Record<string, React.ElementType> = {
    attendance: Calendar,
    absence_request: FileText,
    quiz_feedback: BookOpen,
    child_quiz_feedback: BarChart3,
    teacher_review: ClipboardCheck,
    feedback: BookOpen,
    system: Info,
};

const COLORS: Record<string, string> = {
    attendance: "text-amber-500 bg-amber-50",
    absence_request: "text-emerald-500 bg-emerald-50",
    quiz_feedback: "text-purple-500 bg-purple-50",
    child_quiz_feedback: "text-indigo-500 bg-indigo-50",
    teacher_review: "text-teal-500 bg-teal-50",
    feedback: "text-indigo-500 bg-indigo-50",
    system: "text-blue-500 bg-blue-50",
};

// Chuyển bất kỳ giá trị nào về string an toàn để render
function safeString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
        return value.explanation || value.tip || value.message || value.title || value.content || value.text || JSON.stringify(value);
    }
    return String(value);
}

export default function NotificationBell() {
    const [userId, setUserId] = useState<string | undefined>();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
    }, [supabase]);

    const { notifications, unreadCount } = useNotifications(userId);

    const handleClick = async (n: any) => {
        // Đánh dấu đã đọc
        if (!n.is_read) {
            await markNotificationAsRead(n.id);
        }
        // Toggle expand — hiện nội dung đầy đủ ngay trong dropdown
        setExpandedId(prev => prev === n.id ? null : n.id);
    };

    const handleReadAll = async () => {
        await markAllNotificationsAsRead();
    };

    if (!userId) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100">
                    <Bell className="w-5 h-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 rounded-2xl shadow-xl border-slate-200 p-0">
                <div className="flex items-center justify-between p-4 pb-2">
                    <DropdownMenuLabel className="font-bold text-base p-0 flex items-center gap-2">
                        Thông báo mới
                        {unreadCount > 0 && <Badge className="bg-emerald-50 text-emerald-600 border-none">{unreadCount}</Badge>}
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleReadAll} className="h-8 text-xs text-slate-500 hover:text-emerald-600">
                            <Check className="w-3 h-3 mr-1" /> Đọc tất cả
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator className="bg-slate-100 mx-2" />

                <div className="max-h-[450px] overflow-y-auto px-2 py-1">
                    {notifications.length === 0 ? (
                        <div className="text-center py-8">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 font-medium">Bạn chưa có thông báo nào</p>
                        </div>
                    ) : (
                        notifications.map((n: any) => {
                            const Icon = ICONS[n.type] || ICONS.system;
                            const colorClass = COLORS[n.type] || COLORS.system;
                            const isExpanded = expandedId === n.id;
                            const title = safeString(n.title);
                            const message = safeString(n.message);

                            return (
                                <div
                                    key={n.id}
                                    className={`mb-1.5 p-3 rounded-xl cursor-pointer transition-all border ${
                                        isExpanded
                                            ? "bg-white border-slate-200 shadow-sm"
                                            : n.is_read
                                                ? "opacity-75 hover:bg-slate-50 border-transparent"
                                                : "bg-blue-50/50 hover:bg-blue-50 border-blue-100"
                                    }`}
                                    onClick={() => handleClick(n)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm leading-tight ${n.is_read ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>
                                                    {title}
                                                </p>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {!n.is_read && (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    )}
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                                    ) : (
                                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Nội dung: collapsed = 2 dòng, expanded = full */}
                                            <p className={`text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-wrap transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                {message}
                                            </p>

                                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="p-2 pt-0">
                        <DropdownMenuSeparator className="bg-slate-100 mb-2" />
                        <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-900 justify-center h-9" onClick={() => {
                            const basePath = window.location.pathname.split('/')[1] || 'parent';
                            router.push(`/${basePath}/notifications`);
                        }}>
                            Xem tất cả thông báo
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
