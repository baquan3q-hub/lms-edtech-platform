"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ParentLogoutButton() {
    const supabase = createClient();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-auto"
        >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
        </button>
    );
}
