"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDiscussionMessages, sendDiscussionMessage, deleteDiscussionMessage, DiscussionMessage } from "@/lib/actions/discussion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2, User, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RealtimeDiscussionProps {
    itemId: string;
    classId: string;
    currentUser: {
        id: string;
        role: string;
        full_name: string;
        avatar_url?: string;
    };
}

export default function RealtimeDiscussion({ itemId, classId, currentUser }: RealtimeDiscussionProps) {
    const [messages, setMessages] = useState<DiscussionMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const isTeacherOrAdmin = ["teacher", "admin"].includes(currentUser.role);

    // Cuộn xuống cuối
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Lấy tin nhắn lịch sử và khởi tạo Realtime Subscription
    useEffect(() => {
        const fetchInitialMessages = async () => {
            setIsLoading(true);
            const { data, error } = await getDiscussionMessages(itemId);
            if (error) {
                toast.error("Không thể tải tin nhắn thảo luận");
            } else if (data) {
                setMessages(data);
            }
            setIsLoading(false);
        };

        fetchInitialMessages();

        // Subscribe to Supabase Realtime cho bảng discussion_messages
        const channel = supabase
            .channel(`discussion_${itemId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Lắng nghe INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'discussion_messages',
                    filter: `item_id=eq.${itemId}`, // Chỉ lấy tin nhắn trong phòng này
                },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Khi có người nhắn tin mới, fetch thêm thông tin user của tin nhắn đó
                        const newMsg = payload.new as DiscussionMessage;

                        // Tạm thời nếu user chính mình gửi => ta fetch user object hoặc tự gắn (tuy nhiên ta chọn cách fetch DB cho chuẩn)
                        const { data: userData } = await supabase
                            .from('users')
                            .select('id, full_name, avatar_url, role')
                            .eq('id', newMsg.user_id)
                            .single();

                        if (userData) {
                            newMsg.user = userData;
                        }

                        setMessages((prev) => [...prev, newMsg]);
                    } else if (payload.eventType === 'DELETE') {
                        // Xóa tin nhắn khỏi state
                        setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [itemId, supabase]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        const { error } = await sendDiscussionMessage(itemId, classId, newMessage);
        if (error) {
            toast.error(error);
        } else {
            setNewMessage("");
        }
        setIsSending(false);
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa tin nhắn này?")) return;

        // Optimistic UI update
        const previousMessages = [...messages];
        setMessages(prev => prev.filter(m => m.id !== messageId));

        const { error } = await deleteDiscussionMessage(messageId);
        if (error) {
            toast.error("Xóa tin nhắn thất bại: " + error);
            setMessages(previousMessages); // Rollback
        } else {
            toast.success("Đã xóa tin nhắn");
        }
    };

    return (
        <div className="flex flex-col h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Messages Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                        Phòng Thảo Luận Trực Tuyến
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Các tin nhắn mới sẽ hiển thị lập tức</p>
                </div>
            </div>

            {/* Messages List Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Đang tải dữ liệu...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                            <AlertCircle className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500">Chưa có lượt thảo luận nào</p>
                        <p className="text-sm">Hãy là người đầu tiên bắt đầu bằng cách gửi tin nhắn nhé!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.user_id === currentUser.id;
                        const isTeacherMessage = msg.user?.role === "teacher" || msg.user?.role === "admin";
                        // Kỹ thuật gộp avatar nếu cùng 1 người nhắn liên tiếp
                        const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id;

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>

                                {/* Avatar mảng trái (người khác) */}
                                {!isMe && (
                                    <div className="w-10 shrink-0">
                                        {showAvatar ? (
                                            <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                                                <AvatarImage src={msg.user?.avatar_url || ""} />
                                                <AvatarFallback className={`${isTeacherMessage ? "bg-indigo-100 text-indigo-700 font-bold" : "bg-slate-200 text-slate-700 font-semibold"} text-xs`}>
                                                    {msg.user?.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : <div className="w-10 h-10" />}
                                    </div>
                                )}

                                <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                                    {showAvatar && (
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-xs font-semibold text-slate-700">
                                                {isMe ? "Bạn" : msg.user?.full_name || "Người dùng ẩn danh"}
                                            </span>
                                            {isTeacherMessage && !isMe && (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Giáo viên</span>
                                            )}
                                            <span className="text-[10px] text-slate-400 flex items-center">
                                                <Clock className="w-3 h-3 mr-0.5 inline" /> {format(new Date(msg.created_at), 'HH:mm', { locale: vi })}
                                            </span>
                                        </div>
                                    )}

                                    <div className="group relative flex items-center">
                                        {/* Nút xóa chéo (Nếu là Giáo viên/Admin hoặc tự mình xóa tin mình) */}
                                        {isMe && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50 absolute -left-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                title="Xóa tin nhắn của bạn"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}

                                        <div
                                            className={`px-4 py-2.5 rounded-2xl relative ${isMe
                                                    ? "bg-indigo-600 text-white rounded-tr-sm"
                                                    : isTeacherMessage
                                                        ? "bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tl-sm"
                                                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        </div>

                                        {/* Nút xóa chéo mảng phải (Đối với Giáo viên kiểm duyệt tin nhắn học sinh) */}
                                        {!isMe && isTeacherOrAdmin && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50 absolute -right-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                title="Xóa tin nhắn (Kiểm duyệt)"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Nhập tin nhắn thảo luận... (Bấm Enter để gửi)"
                        className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
                        disabled={isSending}
                        autoComplete="off"
                    />
                    <Button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className={`${newMessage.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 text-slate-400"} transition-colors shadow-sm`}
                    >
                        {isSending ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </form>
                <p className="text-center text-[10px] text-slate-400 mt-2">
                    Thảo luận trong không gian này yêu cầu nội dung văn minh. Giáo viên có quyền kiểm duyệt tin nhắn.
                </p>
            </div>
        </div>
    );
}
