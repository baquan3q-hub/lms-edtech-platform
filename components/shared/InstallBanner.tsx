"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check if user has already dismissed the banner
        const hasDismissed = localStorage.getItem("pwa_install_dismissed");

        // Check if the app is already installed
        // @ts-ignore
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

        if (!hasDismissed && !isStandalone) {
            const handler = (e: Event) => {
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                e.preventDefault();
                // Stash the event so it can be triggered later.
                setDeferredPrompt(e);
                // Show the install banner
                setShowBanner(true);
            };

            window.addEventListener("beforeinstallprompt", handler);

            return () => {
                window.removeEventListener("beforeinstallprompt", handler);
            };
        }
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            console.log("User accepted the A2HS prompt");
        } else {
            console.log("User dismissed the A2HS prompt");
        }

        // Clear the saved prompt since it can't be used again
        setDeferredPrompt(null);
        setShowBanner(false);
    };

    const handleDismiss = () => {
        localStorage.setItem("pwa_install_dismissed", "true");
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-primary text-primary-foreground shadow-lg flex items-center justify-between gap-4 md:hidden pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
                <div className="text-2xl">📱</div>
                <div className="text-sm font-medium">Cài app để dùng tiện hơn!</div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleInstallClick}
                    className="text-xs font-semibold h-8 px-3"
                >
                    Cài đặt
                </Button>
                <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
                    aria-label="Đóng biểu ngữ"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
