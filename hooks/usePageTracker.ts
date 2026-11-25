"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { beaconActivity, flushActivity, getLearningSession, heartbeat } from "@/lib/learning/tracker-client";

const INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

/**
 * One heartbeat loop for the whole student layout. Navigation only updates the page
 * reported by the next tick: it no longer restarts the 30 s timer or sends an extra
 * heartbeat, since each heartbeat costs a full actor check on the server.
 */
export function usePageTracker() {
    const pathname = usePathname();
    const pageRef = useRef(pathname);
    useEffect(() => { pageRef.current = pathname; }, [pathname]);

    useEffect(() => {
        let lastInput = Date.now();
        const input = () => { lastInput = Date.now(); };
        const tick = () => { void heartbeat(pageRef.current, !document.hidden && Date.now() - lastInput < 60000); void flushActivity(); };
        const visibility = () => { if (document.hidden) beaconActivity(); tick(); };
        void getLearningSession().catch(() => {});
        const timer = setInterval(tick, 30000);
        for (const name of INPUT_EVENTS) document.addEventListener(name, input, { passive: true });
        document.addEventListener("visibilitychange", visibility);
        window.addEventListener("pagehide", beaconActivity);
        window.addEventListener("online", tick);
        return () => {
            tick(); clearInterval(timer);
            for (const name of INPUT_EVENTS) document.removeEventListener(name, input);
            document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", beaconActivity); window.removeEventListener("online", tick);
        };
    }, []);
    return null;
}
