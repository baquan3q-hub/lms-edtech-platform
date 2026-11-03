import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { redirect } from "next/navigation";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";
import SuperAdminNavbar from "@/components/super-admin/SuperAdminNavbar";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let superAdminProfile;
    try {
        superAdminProfile = await requireSuperAdmin();
    } catch {
        redirect("/login");
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <SuperAdminSidebar />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">
                <SuperAdminNavbar
                    userName={superAdminProfile.full_name || "Bùi Anh Quân"}
                    userEmail={superAdminProfile.email}
                />
                <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
