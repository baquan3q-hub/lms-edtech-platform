"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationBell from "@/components/shared/NotificationBell";

interface TeacherNavbarProps {
    userName?: string;
    userEmail?: string;
}

export default function TeacherNavbar({ userName, userEmail }: TeacherNavbarProps) {
    const initials = userName
        ? userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'TC';

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 sticky top-0 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium hidden sm:inline-block">
                    Kỳ học hiện tại: Học kỳ mùa Thu 2026
                </span>
            </div>

            <div className="flex items-center gap-4">
                <NotificationBell />

                <div className="h-8 w-px bg-gray-200 mx-1"></div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-900">{userName || 'Teacher'}</span>
                        <span className="text-xs text-gray-500">{userEmail || 'teacher@domain.com'}</span>
                    </div>
                    <Avatar className="h-9 w-9 bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>
    );
}
