"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, Menu, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { sidebarItems } from "./AdminSidebar";
import NotificationBell from "@/components/shared/NotificationBell";

interface AdminNavbarProps {
    userName?: string;
    userEmail?: string;
}

export default function AdminNavbar({ userName = "Admin", userEmail }: AdminNavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Đăng xuất thất bại", { description: error.message });
            return;
        }
        router.push("/login");
        router.refresh();
    }

    return (
        <header className="h-16 shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center justify-between h-full px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="w-6 h-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-white">
                            <SheetHeader className="p-4 border-b border-gray-100 text-left">
                                <SheetTitle className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                                        <GraduationCap className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-base font-bold text-gray-900">E-Learning Admin</span>
                                </SheetTitle>
                            </SheetHeader>
                            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                                {sidebarItems.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <div
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors mb-1",
                                                    isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                                )}
                                            >
                                                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
                                                {item.title}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">Admin Dashboard</h1>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <Separator orientation="vertical" className="h-8 bg-gray-200" />
                    <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium text-gray-900 leading-none">{userName}</p>
                            {userEmail && <p className="text-xs text-gray-400 mt-0.5">{userEmail}</p>}
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline text-xs">Đăng xuất</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
