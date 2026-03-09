"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    BookOpen,
    School,
    DollarSign,
    GraduationCap,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Link2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const sidebarItems = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Quản lý Người dùng", href: "/admin/users", icon: Users },
    { title: "Quản lý Khóa học", href: "/admin/courses", icon: BookOpen },
    { title: "Quản lý Lớp học", href: "/admin/classes", icon: School },
    { title: "Quản lý Phòng học", href: "/admin/rooms", icon: MapPin },
    { title: "Liên kết PH-HS", href: "/admin/students/link-parent", icon: Link2 },
    { title: "Tài chính", href: "/admin/finance", icon: DollarSign },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "h-screen sticky top-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out hidden md:flex flex-col z-40",
                collapsed ? "w-[68px]" : "w-[260px]"
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 shrink-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h2 className="text-sm font-bold text-gray-900 truncate">
                            E-Learning
                        </h2>
                        <p className="text-[10px] text-gray-400 truncate">
                            Admin Portal
                        </p>
                    </div>
                )}
            </div>

            <Separator className="bg-gray-100" />

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin" &&
                            pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                    isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 shrink-0 transition-colors",
                                        isActive
                                            ? "text-blue-600"
                                            : "text-gray-400 group-hover:text-gray-600"
                                    )}
                                />
                                {!collapsed && (
                                    <span className="truncate">{item.title}</span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse */}
            <div className="p-3 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            <span className="text-xs">Thu gọn</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    );
}
