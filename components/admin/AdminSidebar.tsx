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
    MessageSquare,
    ClipboardCheck,
    BarChart3,
    Bell,
    ClipboardList,
    Activity,
    Building2,
    ShieldCheck,
    Crown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const sidebarGroups = [
    {
        name: "Quản Trị Chung",
        items: [
            { title: "Bảng điều khiển", href: "/admin", icon: LayoutDashboard },
            { title: "Hồ sơ & Danh bạ", href: "/admin/users", icon: Users },
            { title: "Thu & Đóng học phí", href: "/admin/finance", icon: DollarSign },
        ]
    },
    {
        name: "Super Admin Platform",
        items: [
            { title: "Bảng Quản Trị Nền Tảng", href: "/super-admin", icon: Crown },
            { title: "Dữ Liệu Trường & API", href: "/super-admin/schools", icon: Building2 },
        ]
    },
    {
        name: "Học Vụ & Vận Hành",
        items: [
            { title: "Quản lý Khối & Lớp", href: "/admin/classes", icon: School },
            { title: "Quản lý Phòng học", href: "/admin/rooms", icon: MapPin },
            { title: "Chuyên cần & Nghỉ phép", href: "/admin/attendance", icon: ClipboardCheck },
            { title: "Sổ điểm & Học lực", href: "/admin/grades", icon: BarChart3 },
            { title: "Nề nếp & Rèn luyện", href: "/admin/behavior", icon: Activity },
        ]
    },
    {
        name: "Cầu Nối Gia Đình & Hành Chính",
        items: [
            { title: "Thông báo trường", href: "/admin/announcements", icon: Bell },
            { title: "Khảo sát ý kiến", href: "/admin/surveys", icon: ClipboardList },
            { title: "Hộp thư Phụ huynh", href: "/admin/feedback", icon: MessageSquare },
        ]
    },
];

export default function AdminSidebar({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "h-screen sticky top-0 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out hidden md:flex flex-col z-40",
                collapsed ? "w-[68px]" : "w-[260px]"
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 shrink-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shadow-sm shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-sm font-bold text-slate-900 truncate">
                                EduSchool LMS
                            </h2>
                            {isSuperAdmin && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 leading-none">
                                    SUPER
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                            {isSuperAdmin ? "Quản trị Nền tảng (Platform)" : "Quản trị Nhà trường"}
                        </p>
                    </div>
                )}
            </div>

            <Separator className="bg-gray-100" />

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
                {sidebarGroups
                    .filter((group) => group.name !== "Super Admin Platform" || isSuperAdmin)
                    .map((group, idx) => (
                    <div key={idx} className="space-y-1">
                        {!collapsed && (
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
                                {group.name}
                            </h3>
                        )}
                        {group.items.map((item) => {
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
                                        title={collapsed ? item.title : undefined}
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
                    </div>
                ))}
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
