import { requirePortalProfile } from "@/lib/auth/portal";
import { redirect } from "next/navigation";
import TeacherSidebar from "@/components/teacher/TeacherSidebar";
import TeacherNavbar from "@/components/teacher/TeacherNavbar";

export default async function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userData = await requirePortalProfile("teacher");

    if (!userData) {
        redirect("/login");
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
