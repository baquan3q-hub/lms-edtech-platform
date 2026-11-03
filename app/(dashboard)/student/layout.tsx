import { redirect } from "next/navigation";
import { requirePortalProfile } from "@/lib/auth/portal";
import { PageTracker } from "./PageTracker";
import StudentSidebar from "@/components/student/StudentSidebar";
import StudentNavbar from "@/components/student/StudentNavbar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const userData = await requirePortalProfile("student");
    if (!userData) redirect("/login");

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <PageTracker />
            {/* Sidebar */}
            <StudentSidebar userName={userData?.full_name || "Học sinh"} userEmail={userData?.email || ""} userId={userData.id} />

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
