"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { queueActivity, flushActivity, beaconActivity } from "@/lib/learning/tracker-client";
import type { LearningEvent } from "@/lib/learning/activity-schema";
interface Options { contextType: LearningEvent["context_type"]; contextId: string; classId: string; attemptId?: string; enabled?: boolean; flushIntervalMs?: number; idleTimeoutMs?: number }
export function useActivityTracker({ contextType, contextId, classId, attemptId, enabled = true, flushIntervalMs = 30000, idleTimeoutMs = 60000 }: Options) {
    const started = useRef(0), questionStarted = useRef(0), switches = useRef(0), localAttempt = useRef("");
    const pending = useRef(new Set<Promise<void>>());
    const logEvent = useCallback((event: { activity_type: string; metadata?: Record<string, unknown> }) => {
        if (!enabled) return;
        const metadata = Object.fromEntries(Object.entries(event.metadata || {}).filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null)) as LearningEvent["metadata"];
        const task = queueActivity({ activity_type: event.activity_type as LearningEvent["activity_type"], context_type: contextType, context_id: contextId, class_id: classId, attempt_id: attemptId || localAttempt.current || null, metadata });
        pending.current.add(task); void task.finally(() => pending.current.delete(task));
    }, [enabled, contextType, contextId, classId, attemptId]);
    const flushEvents = useCallback(async () => { await Promise.all([...pending.current]); await flushActivity(); }, []);
    useEffect(() => {
        if (!enabled) return;
        started.current = Date.now(); questionStarted.current = Date.now(); switches.current = 0; localAttempt.current = crypto.randomUUID();
        let lastInput = Date.now(), idleAt = 0, hiddenAt = 0;
        logEvent({ activity_type: `${contextType}_start` });
        const activity = () => {
            if (idleAt) logEvent({ activity_type: "idle_end", metadata: { idle_duration_s: Math.round((Date.now() - idleAt) / 1000) } });
            idleAt = 0; lastInput = Date.now();
        };
        const visibility = () => {
            if (document.hidden) { hiddenAt = Date.now(); switches.current++; logEvent({ activity_type: "tab_switch" }); beaconActivity(); }
            else { logEvent({ activity_type: "page_focus", metadata: { away_duration_s: hiddenAt ? Math.round((Date.now() - hiddenAt) / 1000) : 0 } }); hiddenAt = 0; }
        };
        const idleTimer = setInterval(() => { if (!idleAt && Date.now() - lastInput >= idleTimeoutMs) { idleAt = lastInput + idleTimeoutMs; logEvent({ activity_type: "idle_detected" }); } }, 1000);
        const timer = setInterval(() => void flushEvents(), flushIntervalMs);
        for (const name of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) document.addEventListener(name, activity, { passive: true });
        document.addEventListener("visibilitychange", visibility);
        return () => {
            if (idleAt) logEvent({ activity_type: "idle_end", metadata: { idle_duration_s: Math.round((Date.now() - idleAt) / 1000) } });
            clearInterval(timer); clearInterval(idleTimer);
            for (const name of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) document.removeEventListener(name, activity);
            document.removeEventListener("visibilitychange", visibility); void flushEvents();
        };
    }, [enabled, contextType, contextId, classId, logEvent, flushEvents, flushIntervalMs, idleTimeoutMs]);
    return useMemo(() => ({ logEvent, flushEvents,
        trackQuestionStart: (index: number) => { questionStarted.current = Date.now(); logEvent({ activity_type: "question_start", metadata: { question_index: index } }); },
        trackQuestionAnswer: (index: number, correct?: boolean) => { const speed = Date.now() - questionStarted.current; logEvent({ activity_type: "quiz_answer", metadata: { question_index: index, answer_speed_ms: speed, is_rapid_guess: speed < 3000, is_correct: correct } }); questionStarted.current = Date.now(); },
        trackSubmission: async (extras?: Record<string, unknown>) => { logEvent({ activity_type: `${contextType}_submit`, metadata: { ...extras, total_duration_s: Math.round((Date.now() - started.current) / 1000), tab_switch_count: switches.current } }); await flushEvents(); },
        trackWarning: (reason: string) => logEvent({ activity_type: "cheat_warning", metadata: { reason } }),
        getTabSwitchCount: () => switches.current, getSessionDuration: () => Math.round((Date.now() - started.current) / 1000),
    }), [contextType, logEvent, flushEvents]);
}
