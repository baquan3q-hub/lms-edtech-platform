import RealtimeSyncProvider from "@/lib/providers/RealtimeSyncProvider";
import { InstallBanner } from "@/components/shared/InstallBanner";
import { MobileHeader } from "@/components/shared/MobileHeader";
import { BottomNav } from "@/components/shared/BottomNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RealtimeSyncProvider>
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
    );
}
