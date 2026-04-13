"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Home,
    BookOpen,
    Calendar,
    Trophy,
    User,
    ClipboardList,
    Users,
    BarChart,
    School,
    FileCheck
} from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    // Don't show on non-dashboard pages or auth pages
    if (!pathname || pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
        return null;
    }

    // Determine user role based on pathname
    const role = pathname.split('/')[1];

    // Define navigation items per role
    let navItems = [];

    if (role === "student") {
        navItems = [
            { href: "/student", label: "Trang chủ", icon: Home },
            { href: "/student/classes", label: "Lớp học", icon: BookOpen },
            { href: "/student/achievements", label: "Thành tích", icon: Trophy },
            { href: "/student/profile", label: "Cá nhân", icon: User },
        ];
    } else if (role === "parent") {
        navItems = [
            { href: "/parent", label: "Tổng quan", icon: Home },
            { href: "/parent/schedule", label: "Lịch học", icon: Calendar },
            { href: "/parent/progress", label: "Điểm số", icon: BarChart },
            { href: "/parent/surveys", label: "Khảo sát", icon: ClipboardList },
        ];
    } else if (role === "teacher") {
        navItems = [
            { href: "/teacher", label: "Tổng quan", icon: Home },
            { href: "/teacher/classes", label: "Lớp học", icon: BookOpen },
            { href: "/teacher/absence-requests", label: "Đơn nghỉ", icon: FileCheck },
            { href: "/teacher/students", label: "Học viên", icon: Users },
        ];
    } else if (role === "admin") {
        navItems = [
            { href: "/admin", label: "Dashboard", icon: Home },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/classes", label: "Lớp học", icon: School },
            { href: "/admin/reports", label: "Báo cáo", icon: BarChart },
        ];
    } else {
        return null; // Don't show bottom nav for unknown roles
    }

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
            <nav className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] gap-1 transition-colors ${isActive
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Icon
                                className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className="text-[10px] sm:text-xs text-center leading-none">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
