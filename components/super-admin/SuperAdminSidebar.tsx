"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Cpu,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    KeyRound,
    History,
    Shield,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const superAdminNavItems = [
    {
        title: "Tổng quan",
        href: "/super-admin",
        icon: LayoutDashboard,
    },
    {
        title: "Tài khoản & Mật khẩu",
        href: "/super-admin/accounts",
        icon: KeyRound,
    },
    {
        title: "Cơ sở trường học",
        href: "/super-admin/schools",
        icon: Building2,
    },
    {
        title: "Lịch sử hoạt động",
        href: "/super-admin/activities",
        icon: History,
    },
    {
        title: "API Gateway & AI",
        href: "/super-admin/api-gateway",
        icon: Cpu,
    },
];

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "h-screen sticky top-0 bg-white text-slate-700 border-r border-slate-200/80 transition-all duration-200 ease-in-out hidden md:flex flex-col z-40 select-none shadow-xs",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}
        >
            {/* Header Brand */}
            <div className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 shadow-sm shadow-blue-500/20 text-white shrink-0">
                    <Shield className="w-5 h-5" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-sm font-bold tracking-tight text-slate-900 truncate">
                                LMS Platform
                            </h2>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Super Admin
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                            Bảng Quản Trị Hệ Thống
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation Items */}
            <div className="flex-1 p-3 space-y-5 overflow-y-auto">
                <div className="space-y-1">
                    {!collapsed && (
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
                            Quản lý
                        </p>
                    )}
                    {superAdminNavItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/super-admin" && pathname.startsWith(item.href));

                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                                        isActive
                                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-sm shadow-blue-600/20"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                                    )}
                                    title={collapsed ? item.title : undefined}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <item.icon
                                            className={cn(
                                                "w-4 h-4 shrink-0 transition-colors",
                                                isActive ? "text-white" : "text-slate-500 group-hover:text-slate-900"
                                            )}
                                        />
                                        {!collapsed && <span className="truncate">{item.title}</span>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Tenant View Switcher */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                    {!collapsed && (
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                            Cơ sở
                        </p>
                    )}
                    <Link href="/admin">
                        <div
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50/60 border border-slate-200/80 transition-colors group",
                                collapsed && "justify-center"
                            )}
                            title="Chuyển sang giao diện Quản lý Nhà trường (School Admin)"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {!collapsed && (
                                <div className="overflow-hidden">
                                    <span className="block font-medium text-slate-800 group-hover:text-blue-700">Giao diện Trường học</span>
                                    <span className="block text-[10px] text-slate-500 truncate">Chuyển sang School Admin</span>
                                </div>
                            )}
                        </div>
                    </Link>
                </div>
            </div>

            {/* Collapse Button */}
            <div className="p-3 shrink-0 border-t border-slate-100 space-y-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-8"
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4 mr-1.5" />
                            <span className="text-xs">Thu gọn</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    );
}
