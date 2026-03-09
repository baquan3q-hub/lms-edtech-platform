import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeacherSidebar from "@/components/teacher/TeacherSidebar";
import TeacherNavbar from "@/components/teacher/TeacherNavbar";

export default async function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // Check authentication
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Retrieve user data to ensure they are a teacher
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();

    const { data: userData } = await adminSupabase
        .from("users")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

    // Check teacher role
    if (userData?.role !== "teacher") {
        redirect(`/${userData?.role || "login"}`);
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <TeacherSidebar userName={userData?.full_name || "Giáo viên"} userEmail={userData?.email || ""} />

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <TeacherNavbar
                    userName={userData?.full_name || "Teacher"}
                    userEmail={userData?.email}
                />
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
