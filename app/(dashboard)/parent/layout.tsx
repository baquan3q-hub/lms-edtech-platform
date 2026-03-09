import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ParentSidebar from "@/components/parent/ParentSidebar";
import NotificationBell from "@/components/shared/NotificationBell";

export const dynamic = "force-dynamic";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, role, avatar_url")
        .eq("id", user.id)
        .single();

    if (userData?.role !== "parent") redirect(`/${userData?.role || "login"}`);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <ParentSidebar
                userName={userData?.full_name || "Phụ huynh"}
                userEmail={userData?.email || ""}
            />

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 z-10">
                    <h1 className="text-lg font-bold text-slate-900">Cổng Phụ huynh</h1>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <p className="text-sm font-medium text-slate-600">{userData?.full_name}</p>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
