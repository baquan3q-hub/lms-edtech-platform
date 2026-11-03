"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { beaconActivity, flushActivity, getLearningSession, heartbeat } from "@/lib/learning/tracker-client";
export function usePageTracker() {
    const pathname = usePathname();
    useEffect(() => {
        let lastInput = Date.now();
        const input = () => { lastInput = Date.now(); };
        const tick = () => { void heartbeat(pathname, !document.hidden && Date.now() - lastInput < 60000); void flushActivity(); };
        const visibility = () => { if (document.hidden) beaconActivity(); tick(); };
        void getLearningSession().catch(() => {});
        const timer = setInterval(tick, 30000);
        for (const name of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) document.addEventListener(name, input, { passive: true });
        document.addEventListener("visibilitychange", visibility);
        window.addEventListener("pagehide", beaconActivity);
        window.addEventListener("online", tick);
        return () => {
            tick(); clearInterval(timer);
            for (const name of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) document.removeEventListener(name, input);
            document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", beaconActivity); window.removeEventListener("online", tick);
        };
    }, [pathname]);
    return null;
}
