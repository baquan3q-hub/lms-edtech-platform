import RealtimeSyncProvider from "@/lib/providers/RealtimeSyncProvider";
import { InstallBanner } from "@/components/shared/InstallBanner";
import { MobileHeader } from "@/components/shared/MobileHeader";
import { BottomNav } from "@/components/shared/BottomNav";
import QueryProvider from "@/lib/providers/QueryProvider";
import { getActorContext } from "@/lib/auth/actor-context";
import { getCurrentUser } from "@/lib/supabase/auth";
import { checkAccountActivationStatus } from "@/lib/auth/activation";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const actor = await getActorContext();
    if (!actor) {
        const user = await getCurrentUser();
        if (!user) redirect("/login");
        if (!(await checkAccountActivationStatus(user.id)).isActivated) redirect("/activate");
        redirect("/access-denied");
    }
    return (
        <QueryProvider key={`${actor.userId}:${actor.schoolId}:${actor.currentRole}`}>
        <RealtimeSyncProvider userId={actor.userId} role={actor.currentRole} schoolId={actor.schoolId}>
            <div className="flex min-h-screen w-full flex-col lg:flex-row bg-muted/40 pb-16 lg:pb-0 relative">
                {/* Placeholder for desktop sidebar, e.g. <Sidebar className="hidden lg:block lg:w-64" /> if handled here, but this is a general dashboard layout so we assume roles handle sidebar inside their specific layouts or we add a global sidebar. For now, we only add MobileHeader and BottomNav. */}
                <MobileHeader />
                <main className="flex-1 overflow-x-hidden">
                    {children}
                </main>
            </div>
            <BottomNav />
            <InstallBanner />
        </RealtimeSyncProvider>
        </QueryProvider>
    );
}
