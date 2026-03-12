"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import ParentAvatarSection from "./ParentAvatarSection";
import { ChevronLeft, ChevronRight, LayoutDashboard, Link2, TrendingUp, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
    { href: "/parent/notifications", label: "Thông báo", icon: Bell },
    { href: "/parent/progress", label: "Điểm số & Tiến độ", icon: TrendingUp },
    { href: "/parent/link-student", label: "Liên kết con em", icon: Link2 },
];

interface ParentSidebarProps {
    userName: string;
    userEmail: string;
    userId?: string;
}

export default function ParentSidebar({ userName, userEmail, userId }: ParentSidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "h-screen bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 relative",
                isCollapsed ? "w-[80px]" : "w-[260px]"
            )}
        >
            {/* Collapse Toggle Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute -right-4 top-6 w-8 h-8 rounded-full bg-white border-slate-200 shadow-sm z-50 hidden md:flex hover:bg-slate-50 hover:text-amber-600"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>

            {/* Logo */}
            <div className="p-5 border-b border-slate-100 h-[73px] flex items-center">
                <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200/50 shrink-0 mx-auto md:mx-0">
                        <span className="text-white font-bold text-sm">P</span>
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden transition-all duration-300">
                            <h2 className="text-sm font-bold text-slate-900 whitespace-nowrap">E-Learning</h2>
                            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Parent Portal</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center rounded-xl text-sm font-medium transition-colors relative group",
                                isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3",
                                isActive
                                    ? "bg-amber-50 text-amber-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon
                                className={cn(
                                    "w-5 h-5 shrink-0 transition-colors",
                                    isActive ? "text-amber-600" : "text-slate-400 group-hover:text-amber-500"
                                )}
                            />
                            {!isCollapsed && (
                                <span className="whitespace-nowrap transition-opacity duration-300">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Avatar Menu */}
            <div className={cn(
                "border-t border-slate-100 transition-all duration-300",
                isCollapsed ? "p-3 flex justify-center" : "p-4"
            )}>
                <ParentAvatarSection
                    fullName={userName}
                    email={userEmail}
                    compact={isCollapsed}
                    userId={userId}
                />
            </div>
        </aside>
    );
}
