import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // Kiểm tra auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Lấy thông tin user từ database (dùng Admin Client để bypass RLS)
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();

    const { data: userData } = await adminSupabase
        .from("users")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

    // Kiểm tra role admin
    if (userData?.role !== "admin") {
        redirect(`/${userData?.role || "login"}`);
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AdminNavbar
                    userName={userData?.full_name || "Admin"}
                    userEmail={userData?.email}
                />
                <main className="flex-1 min-h-0 overflow-y-auto p-6 pb-10">
                    {children}
                </main>
            </div>
        </div>
    );
}
