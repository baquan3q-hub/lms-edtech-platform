"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    TrendingUp,
    GraduationCap,
    CalendarDays,
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

    return (
        <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex shrink-0 shadow-2xl z-20">
            <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 bg-slate-900/50 backdrop-blur-md">
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
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive
                                ? "text-white bg-indigo-500/10"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                            <item.icon
                                className={`w-5 h-5 transition-colors ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                                    }`}
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Avatar menu thay cho logout */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                <UserAvatarMenu
                    fullName={userName}
                    email={userEmail}
                    profileHref="/student/profile"
                    avatarGradient="from-indigo-500 to-purple-600"
                    variant="dark"
                    role="student"
                    userId={userId}
                />
            </div>
        </aside>
    );
}
