"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface SuperAdminNavbarProps {
    userName?: string;
    userEmail?: string;
}

export default function SuperAdminNavbar({
    userName = "Bùi Anh Quân",
    userEmail = "boiquan401@gmail.com",
}: SuperAdminNavbarProps) {
    const router = useRouter();
    const supabase = createClient();
    const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function handleLogout() {
        setIsLoggingOut(true);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:navigation-start"));
        }
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Đăng xuất thất bại", { description: error.message });
            setIsLoggingOut(false);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("app:navigation-end"));
            }
            return;
        }
        router.push("/login");
        router.refresh();
    }

    return (
        <header className="h-16 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 text-slate-800">
            <div className="flex items-center justify-between h-full px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                            <span>Super Admin</span>
                        </div>
                        <span className="hidden sm:inline text-xs text-slate-500">
                            Cổng quản trị trung tâm
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live System Status */}
                    <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200 text-xs text-slate-600">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Hệ thống trực tuyến</span>
                    </div>

                    <Separator orientation="vertical" className="h-5 bg-slate-200" />

                    {/* User profile */}
                    <div className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8 ring-1 ring-blue-500/30">
                            <AvatarFallback className="text-xs font-bold text-white bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="hidden md:block text-left">
                            <p className="text-xs font-semibold text-slate-800 leading-none">{userName}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{userEmail}</p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoggingOut}
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors h-8 px-2 text-xs"
                    >
                        {isLoggingOut ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-red-500" />
                                <span>Đang đăng xuất...</span>
                            </>
                        ) : (
                            <>
                                <LogOut className="w-3.5 h-3.5 mr-1" />
                                <span className="hidden sm:inline">Đăng xuất</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </header>
    );
}
