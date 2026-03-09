"use client";

import { Bell, Menu, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import Sidebar from "./Sidebar"; // Assuming Sidebar is also shared, replace if needed

// Helper to get title from pathname
const getPageTitle = (pathname: string) => {
    if (pathname.includes("/admin/users")) return "Quản lý Users";
    if (pathname.includes("/admin/classes")) return "Quản lý Lớp học";
    if (pathname.includes("/admin/reports")) return "Báo cáo";
    if (pathname.includes("/admin")) return "Admin Dashboard";

    if (pathname.includes("/teacher/attendance")) return "Điểm danh";
    if (pathname.includes("/teacher/students")) return "Học viên";
    if (pathname.includes("/teacher/schedule")) return "Lịch dạy";
    if (pathname.includes("/teacher")) return "Teacher Dashboard";

    if (pathname.includes("/parent/schedule")) return "Lịch học của con";
    if (pathname.includes("/parent/progress")) return "Điểm số";
    if (pathname.includes("/parent/absence-request")) return "Xin nghỉ";
    if (pathname.includes("/parent")) return "Parent Dashboard";

    if (pathname.includes("/student/classes")) return "Lớp học của tôi";
    if (pathname.includes("/student/schedule")) return "Lịch học";
    if (pathname.includes("/student/achievements")) return "Thành tích";
    if (pathname.includes("/student/profile")) return "Hồ sơ";
    if (pathname.includes("/student")) return "Student Dashboard";

    return "ELearn";
};

export function MobileHeader() {
    const pathname = usePathname();
    const pageTitle = getPageTitle(pathname || "");

    return (
        <div className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-3">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
                        {/* We will need to make sure Sidebar component works here */}
                        <div className="p-4 border-b font-semibold text-lg flex items-center h-16">
                            ELearn
                        </div>
                        <Sidebar />
                    </SheetContent>
                </Sheet>
                <span className="font-semibold text-lg line-clamp-1">{pageTitle}</span>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-destructive"></span>
                    <span className="sr-only">Notifications</span>
                </Button>
                <Link href="/profile" className="flex items-center justify-center h-9 w-9 rounded-full bg-muted min-h-[44px] min-w-[44px]">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Profile</span>
                </Link>
            </div>
        </div>
    );
}
