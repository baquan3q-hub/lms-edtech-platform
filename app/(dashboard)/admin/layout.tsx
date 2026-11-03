import { requirePortalProfile } from "@/lib/auth/portal";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";

import { checkIsSuperAdmin } from "@/lib/auth/super-admin";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userData = await requirePortalProfile("admin");

    if (!userData) {
        redirect("/login");
    }

    const isSuper = checkIsSuperAdmin(userData);



    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <AdminSidebar isSuperAdmin={isSuper} />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AdminNavbar
                    userName={userData?.full_name || "Admin"}
                    userEmail={userData?.email}
                    isSuperAdmin={isSuper}
                />
                <main className="flex-1 min-h-0 overflow-y-auto p-6 pb-10">
                    {children}
                </main>
            </div>
        </div>
    );
}
