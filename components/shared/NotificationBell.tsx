"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, Calendar, FileText, Info, BookOpen, BarChart3 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
    system: Info,
};

const COLORS: Record<string, string> = {
    attendance: "text-amber-500 bg-amber-50",
    absence_request: "text-emerald-500 bg-emerald-50",
    quiz_feedback: "text-purple-500 bg-purple-50",
    child_quiz_feedback: "text-indigo-500 bg-indigo-50",
    system: "text-blue-500 bg-blue-50",
};

export default function NotificationBell() {
    const [userId, setUserId] = useState<string | undefined>();
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
    }, [supabase]);

    const { notifications, unreadCount } = useNotifications(userId);

    const handleRead = async (id: string, link?: string) => {
        await markNotificationAsRead(id);
        if (link) router.push(link);
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
            <DropdownMenuContent align="end" className="w-80 sm:w-96 rounded-2xl shadow-xl border-slate-200">
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

                <div className="max-h-[400px] overflow-y-auto px-2 py-1">
                    {notifications.length === 0 ? (
                        <div className="text-center py-8">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 font-medium">Bạn chưa có thông báo nào</p>
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const Icon = ICONS[n.type] || ICONS.system;
                            const colorClass = COLORS[n.type] || COLORS.system;

                            return (
                                <DropdownMenuItem
                                    key={n.id}
                                    className={`mb-1 p-3 rounded-xl cursor-pointer flex items-start gap-4 transition-colors ${n.is_read ? "opacity-75 focus:bg-slate-50" : "bg-blue-50/50 focus:bg-blue-50"}`}
                                    onClick={() => handleRead(n.id, n.link)}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <p className={`text-sm leading-tight ${n.is_read ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                                        </p>
                                    </div>
                                    {!n.is_read && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                                    )}
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="p-2 pt-0">
                        <DropdownMenuSeparator className="bg-slate-100 mb-2" />
                        <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-900 justify-center h-9" onClick={() => router.push("/parent/notifications")}>
                            Xem tất cả thông báo
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
