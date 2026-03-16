"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    TrendingUp,
    GraduationCap,
    PanelLeftClose,
    PanelLeftOpen
} from "lucide-react";
import UserAvatarMenu from "@/components/shared/UserAvatarMenu";

const navigation = [
    { name: "Tổng quan", href: "/student", icon: LayoutDashboard },
    { name: "Lớp học", href: "/student/classes", icon: BookOpen },
    { name: "Bài tập", href: "/student/assignments", icon: FileText },
    { name: "Kết quả học tập", href: "/student/grades", icon: TrendingUp },
];

interface StudentSidebarProps {
    userName?: string;
    userEmail?: string;
    userId?: string;
}

export default function StudentSidebar({ userName = "Học sinh", userEmail = "", userId }: StudentSidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem("studentSidebarCollapsed");
        if (saved) {
            setIsCollapsed(saved === "true");
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("studentSidebarCollapsed", String(newState));
    };

    // To prevent hydration mismatch, wait for mount before applying the dynamic width
    if (!isMounted) {
        return (
            <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex shrink-0 shadow-2xl z-20 transition-all duration-300">
                <div className="h-16 flex items-center border-b border-slate-800 shrink-0 bg-slate-900/50 backdrop-blur-md justify-between px-6">
                    <Link href="/student" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                E-Learning
                            </span>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Học sinh</p>
                        </div>
                    </Link>
                    <div className="w-8 h-8 rounded-lg"></div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar"></nav>
            </aside>
        );
    }

    return (
        <aside className={`h-screen bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex shrink-0 shadow-2xl z-20 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`h-16 flex items-center border-b border-slate-800 shrink-0 bg-slate-900/50 backdrop-blur-md ${isCollapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
                {!isCollapsed && (
                    <Link href="/student" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                E-Learning
                            </span>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Học sinh</p>
                        </div>
                    </Link>
                )}
                
                <button
                    onClick={toggleCollapse}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex shrink-0"
                    title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                    {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive
                                ? "text-white bg-indigo-500/10 shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                }`}
                            title={isCollapsed ? item.name : undefined}
                        >
                            {isActive && !isCollapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                            <item.icon
                                className={`w-5 h-5 shrink-0 transition-all duration-200 ${isActive ? "text-indigo-400 scale-110" : "text-slate-500 group-hover:text-slate-300"
                                    }`}
                            />
                            {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Avatar menu thay cho logout */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/50 mt-auto overflow-hidden text-slate-300">
                <UserAvatarMenu
                    fullName={userName}
                    email={userEmail}
                    profileHref="/student/profile"
                    avatarGradient="from-indigo-500 to-purple-600"
                    variant="dark"
                    role="student"
                    userId={userId}
                    compact={isCollapsed}
                />
            </div>
        </aside>
    );
}
