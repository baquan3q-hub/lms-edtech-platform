"use client";

import { useEffect, useRef, useCallback } from "react";

// Kiểu dữ liệu cho mỗi activity event
interface ActivityEvent {
    activity_type: string;
    context_type: string;
    context_id?: string;
    class_id?: string;
    metadata?: Record<string, any>;
}

interface UseActivityTrackerOptions {
    contextType: "lesson" | "quiz" | "exam" | "homework" | "video";
    contextId: string;
    classId: string;
    enabled?: boolean;             // Bật/tắt tracker
    flushIntervalMs?: number;      // Interval gửi batch (default 30s)
    idleTimeoutMs?: number;        // Thời gian idle trước khi log (default 60s)
}

/**
 * Hook theo dõi hành vi học sinh trên các trang học tập.
 * Ghi nhận: thời gian hoạt động, chuyển tab, idle, page focus/blur.
 * Batch gửi events mỗi 30 giây hoặc khi rời trang.
 */
export function useActivityTracker(options: UseActivityTrackerOptions) {
    const {
        contextType,
        contextId,
        classId,
        enabled = true,
        flushIntervalMs = 30000,
        idleTimeoutMs = 60000,
    } = options;

    // Buffer events chưa gửi
    const eventBuffer = useRef<ActivityEvent[]>([]);
    // Thời gian bắt đầu session
    const sessionStartRef = useRef<number>(Date.now());
    // Idle tracking
    const lastActivityRef = useRef<number>(Date.now());
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isIdleRef = useRef(false);
    const idleStartRef = useRef<number>(0); // Thời điểm bắt đầu idle thực tế
    // Tab switch tracking
    const tabSwitchCountRef = useRef(0);
    // Flush interval ref
    const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Track per-question timestamps
    const questionStartRef = useRef<number>(Date.now());

    // Thêm event vào buffer
    const logEvent = useCallback((event: Omit<ActivityEvent, "context_type" | "context_id" | "class_id">) => {
        if (!enabled) return;
        eventBuffer.current.push({
            ...event,
            context_type: contextType,
            context_id: contextId,
            class_id: classId,
        });
    }, [contextType, contextId, classId, enabled]);

    // Gửi batch events lên server
    const flushEvents = useCallback(async () => {
        if (eventBuffer.current.length === 0) return;

        const eventsToSend = [...eventBuffer.current];
        eventBuffer.current = [];

        try {
            await fetch("/api/activity/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ events: eventsToSend }),
            });
        } catch (err) {
            // Nếu gửi thất bại, cần đẩy lại vào buffer
            eventBuffer.current = [...eventsToSend, ...eventBuffer.current];
            console.error("Failed to flush activity events:", err);
        }
    }, []);

    // Reset idle timer
    const resetIdleTimer = useCallback(() => {
        if (!enabled) return;
        lastActivityRef.current = Date.now();

        if (isIdleRef.current) {
            // Đang idle → thoát idle — tính duration từ thời điểm bắt đầu idle thực tế
            const idleDuration = Math.round((Date.now() - idleStartRef.current) / 1000);
            logEvent({
                activity_type: "idle_end",
                metadata: { idle_duration_s: idleDuration },
            });
            isIdleRef.current = false;
            idleStartRef.current = 0;
        }

        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            isIdleRef.current = true;
            idleStartRef.current = Date.now(); // Ghi nhận thời điểm bắt đầu idle
            logEvent({
                activity_type: "idle_detected",
                metadata: { 
                    idle_threshold_s: idleTimeoutMs / 1000,
                    idle_start_time: new Date().toISOString(),
                },
            });
        }, idleTimeoutMs);
    }, [enabled, idleTimeoutMs, logEvent]);

    // === EXPOSED FUNCTIONS cho component sử dụng ===

    /**
     * Ghi nhận khi học sinh bắt đầu trả lời câu hỏi mới
     */
    const trackQuestionStart = useCallback((questionIndex: number) => {
        questionStartRef.current = Date.now();
        logEvent({
            activity_type: "question_start",
            metadata: { question_index: questionIndex },
        });
    }, [logEvent]);

    /**
     * Ghi nhận khi học sinh trả lời xong 1 câu
     */
    const trackQuestionAnswer = useCallback((questionIndex: number, isCorrect?: boolean) => {
        const answerSpeedMs = Date.now() - questionStartRef.current;
        const isRapidGuess = answerSpeedMs < 3000; // Dưới 3 giây → nghi ngờ đoán nhanh

        logEvent({
            activity_type: "quiz_answer",
            metadata: {
                question_index: questionIndex,
                answer_speed_ms: answerSpeedMs,
                is_rapid_guess: isRapidGuess,
                is_correct: isCorrect,
            },
        });

        // Reset timer cho câu tiếp theo
        questionStartRef.current = Date.now();
    }, [logEvent]);

    /**
     * Ghi nhận khi student nộp bài (quiz/exam/homework)
     */
    const trackSubmission = useCallback(async (extras?: Record<string, any>) => {
        const totalDurationS = Math.round((Date.now() - sessionStartRef.current) / 1000);
        logEvent({
            activity_type: `${contextType}_submit`,
            metadata: {
                total_duration_s: totalDurationS,
                tab_switch_count: tabSwitchCountRef.current,
                ...extras,
            },
        });
        // Flush ngay lập tức và ĐỢI hoàn tất trước khi AI behavior analysis chạy
        await flushEvents();
    }, [contextType, logEvent, flushEvents]);

    /**
     * Ghi nhận cảnh báo gian lận (strict mode)
     */
    const trackWarning = useCallback((reason: string) => {
        logEvent({
            activity_type: "cheat_warning",
            metadata: { reason, tab_switch_count: tabSwitchCountRef.current },
        });
    }, [logEvent]);

    // === SETUP EFFECTS ===
    useEffect(() => {
        if (!enabled) return;

        // Log session start
        sessionStartRef.current = Date.now();
        logEvent({
            activity_type: `${contextType}_start`,
            metadata: { started_at: new Date().toISOString() },
        });

        // Visibility change → tab switch
        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabSwitchCountRef.current++;
                logEvent({
                    activity_type: "tab_switch",
                    metadata: { 
                        direction: "away", 
                        count: tabSwitchCountRef.current,
                        time_since_start_s: Math.round((Date.now() - sessionStartRef.current) / 1000),
                    },
                });
            } else {
                logEvent({
                    activity_type: "page_focus",
                    metadata: { 
                        direction: "back",
                        away_duration_s: 0, // Simplified
                    },
                });
            }
        };

        // User activity detection (mouse/keyboard)
        const handleUserActivity = () => resetIdleTimer();

        // Page unload → flush buffer
        const handleBeforeUnload = () => {
            const totalDurationS = Math.round((Date.now() - sessionStartRef.current) / 1000);
            eventBuffer.current.push({
                activity_type: "session_end",
                context_type: contextType,
                context_id: contextId,
                class_id: classId,
                metadata: { 
                    total_duration_s: totalDurationS,
                    tab_switch_count: tabSwitchCountRef.current,
                },
            });
            // Phải dùng sendBeacon vì fetch bị cancel khi unload
            const payload = JSON.stringify({ events: eventBuffer.current });
            navigator.sendBeacon("/api/activity/log", payload);
            eventBuffer.current = [];
        };

        // Register listeners
        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("mousemove", handleUserActivity, { passive: true });
        document.addEventListener("keydown", handleUserActivity, { passive: true });
        document.addEventListener("click", handleUserActivity, { passive: true });
        document.addEventListener("scroll", handleUserActivity, { passive: true });
        window.addEventListener("beforeunload", handleBeforeUnload);

        // Start idle detection
        resetIdleTimer();

        // Flush interval 
        flushIntervalRef.current = setInterval(flushEvents, flushIntervalMs);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("mousemove", handleUserActivity);
            document.removeEventListener("keydown", handleUserActivity);
            document.removeEventListener("click", handleUserActivity);
            document.removeEventListener("scroll", handleUserActivity);
            window.removeEventListener("beforeunload", handleBeforeUnload);

            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);

            // Final flush on unmount
            flushEvents();
        };
    }, [enabled, contextType, contextId, classId, flushIntervalMs, logEvent, resetIdleTimer, flushEvents]);

    return {
        logEvent,
        trackQuestionStart,
        trackQuestionAnswer,
        trackSubmission,
        trackWarning,
        flushEvents,
        getTabSwitchCount: () => tabSwitchCountRef.current,
        getSessionDuration: () => Math.round((Date.now() - sessionStartRef.current) / 1000),
    };
}
