import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentSidebar from "@/components/student/StudentSidebar";
import StudentNavbar from "@/components/student/StudentNavbar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();
    const { data: userData } = await adminSupabase.from("users").select("full_name, email, role").eq("id", user.id).single();
    if (userData?.role !== "student") redirect(`/${userData?.role || "login"}`);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar */}
            <StudentSidebar userName={userData?.full_name || "Học sinh"} userEmail={userData?.email || ""} />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none -z-10" />

                <StudentNavbar
                    userName={userData?.full_name || "Học sinh"}
                    userEmail={userData?.email}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
