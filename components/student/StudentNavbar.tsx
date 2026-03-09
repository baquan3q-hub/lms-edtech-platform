"use client";

import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationBell from "@/components/shared/NotificationBell";

interface StudentNavbarProps {
    userName: string;
    userEmail?: string;
}

export default function StudentNavbar({ userName, userEmail }: StudentNavbarProps) {
    // Lấy chữ cái đầu tiên làm avatar
    const initials = userName
        ? userName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()
        : "HS";

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
            {/* Mobile menu button (can implement drawer later) */}
            <div className="flex items-center gap-4 md:hidden">
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
                    <Menu className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex items-center gap-4 md:hidden">
                <span className="font-semibold text-slate-800">E-Learning Student</span>
            </div>

            {/* Search Bar - Hidden on small screens */}
            <div className="hidden md:flex items-center flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                    type="text"
                    placeholder="Tìm kiếm khoá học, tài liệu..."
                    className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm rounded-full pl-10 pr-4 py-2 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3 sm:gap-5 ml-auto">
                <NotificationBell />

                <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-semibold text-slate-800">{userName}</span>
                        <span className="text-xs text-slate-500">{userEmail || "Học sinh"}</span>
                    </div>
                    <Avatar className="h-9 w-9 border-2 border-indigo-100 ring-2 ring-transparent transition-all hover:ring-indigo-500/30 cursor-pointer">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium text-xs">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>
    );
}
