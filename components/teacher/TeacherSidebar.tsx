"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    FileSignature,
    Users,
} from "lucide-react";
import UserAvatarMenu from "@/components/shared/UserAvatarMenu";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/teacher" },
    { icon: BookOpen, label: "Lớp học của tôi", href: "/teacher/classes" },
    { icon: Users, label: "Quản lý Học viên", href: "/teacher/students" },
    { icon: FileSignature, label: "Quản lý Bài giảng", href: "/teacher/lessons" },
];

interface TeacherSidebarProps {
    userName?: string;
    userEmail?: string;
}

export default function TeacherSidebar({ userName = "Giáo viên", userEmail = "" }: TeacherSidebarProps) {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300">
            {/* Logo area */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <div className="flex flex-col">
                    <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Teacher Portal
                    </span>
                    <span className="text-xs text-slate-500 font-medium tracking-wide">LMS PLATFORM</span>
                </div>
            </div>

            {/* Navigation options */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${isActive
                                ? "bg-slate-800 text-white"
                                : "hover:bg-slate-800/50 hover:text-white"
                                }`}
                        >
                            <item.icon
                                className={`w-5 h-5 transition-transform duration-200 ${isActive ? "text-emerald-400 scale-110" : "text-slate-400 group-hover:text-emerald-400"
                                    }`}
                            />
                            <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Avatar menu thay cho logout */}
            <div className="p-3 border-t border-slate-800 mt-auto">
                <UserAvatarMenu
                    fullName={userName}
                    email={userEmail}
                    profileHref="/teacher/profile"
                    avatarGradient="from-emerald-400 to-cyan-500"
                    variant="dark"
                />
            </div>
        </div>
    );
}
