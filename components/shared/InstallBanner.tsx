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
        <div className="fixed bottom-20 left-4 right-4 z-40 p-4 bg-white/80 backdrop-blur-lg border border-slate-200 rounded-3xl shadow-2xl flex items-center justify-between gap-4 md:hidden animate-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl shadow-inner">📱</div>
                <div className="flex flex-col">
                    <div className="text-[13px] font-black text-slate-900 leading-tight">Cài đặt ứng dụng!</div>
                    <div className="text-[11px] font-medium text-slate-500">Trải nghiệm mượt mà hơn</div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="default"
                    size="sm"
                    onClick={handleInstallClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-9 px-4 rounded-xl shadow-lg shadow-blue-500/20"
                >
                    Cài đặt
                </Button>
                <button
                    onClick={handleDismiss}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                    aria-label="Đóng biểu ngữ"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
