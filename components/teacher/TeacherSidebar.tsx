"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    CalendarDays,
    FileSignature,
    Users,
    ClipboardCheck,
    PanelLeftClose,
    PanelLeftOpen,
    FileBarChart,
    Bell,
    MessageSquareMore,
    Activity
} from "lucide-react";
import UserAvatarMenu from "@/components/shared/UserAvatarMenu";

const menuGroups = [
    {
        name: "Học Thuật",
        items: [
            { icon: LayoutDashboard, label: "Tổng quan", href: "/teacher" },
            { icon: BookOpen, label: "Quản lý lớp học", href: "/teacher/classes" },
            { icon: CalendarDays, label: "Lịch dạy", href: "/teacher/schedule" },
            { icon: Users, label: "Quản lý Học viên", href: "/teacher/students" },
            { icon: FileSignature, label: "Ngân hàng Tài liệu", href: "/teacher/lessons" },
            { icon: FileBarChart, label: "Báo cáo & Nhận xét", href: "/teacher/reports" },
            { icon: Activity, label: "Hành vi Học tập", href: "/teacher/behavior" },
        ]
    },
    {
        name: "Giao Tiếp & Hành Chính",
        items: [
            { icon: Bell, label: "Thông báo", href: "/teacher/announcements" },
            { icon: MessageSquareMore, label: "Ý kiến & Phản hồi", href: "/teacher/feedback" },
            { icon: ClipboardCheck, label: "Đơn xin nghỉ", href: "/teacher/absence-requests" },
        ]
    }
];

interface TeacherSidebarProps {
    userName?: string;
    userEmail?: string;
}

export default function TeacherSidebar({ userName = "Giáo viên", userEmail = "" }: TeacherSidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Optional: Load state from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem("teacherSidebarCollapsed");
        if (saved) {
            setIsCollapsed(saved === "true");
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("teacherSidebarCollapsed", String(newState));
    };

    return (
        <div className={`bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo area */}
            <div className={`h-16 flex items-center border-b border-slate-800 shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
                {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden whitespace-nowrap">
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            Teacher Portal
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold tracking-wider">LMS PLATFORM</span>
                    </div>
                )}

                <button
                    onClick={toggleCollapse}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex shrink-0"
                    title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                    {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation options */}
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
                {menuGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1">
                        {!isCollapsed && (
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">
                                {group.name}
                            </h3>
                        )}
                        {group.items.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                                        ? "bg-slate-800 text-white shadow-sm"
                                        : "hover:bg-slate-800/50 hover:text-white"
                                        }`}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <item.icon
                                        className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? "text-emerald-400 scale-110" : "text-slate-400 group-hover:text-emerald-400"
                                            }`}
                                    />
                                    {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Avatar menu */}
            <div className="p-3 border-t border-slate-800 mt-auto overflow-hidden">
                <UserAvatarMenu
                    fullName={userName}
                    email={userEmail}
                    profileHref="/teacher/profile"
                    avatarGradient="from-emerald-400 to-cyan-500"
                    variant="dark"
                    compact={isCollapsed}
                />
            </div>
        </div>
    );
}
