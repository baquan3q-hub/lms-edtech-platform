"use client";
import type { LearningEvent } from "./activity-schema";
import { clearLocalDrafts } from "./draft-store";
type Session = { id: string; student_id: string };
let current: Promise<Session> | null = null;
let session: Session | null = null;
let buffer: LearningEvent[] = [];
let sending: Promise<void> | null = null;
let loaded = false;
let videoPlaying = false;
const tabKey = () => {
    let id = sessionStorage.getItem("lms-tab");
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("lms-tab", id); }
    return id;
};
const storageKey = () => session ? `lms-events:${session.student_id}:${tabKey()}` : null;
function persist() { try { const key = storageKey(); if (key) localStorage.setItem(key, JSON.stringify(buffer.slice(-1000))); } catch { /* Memory queue stays available. */ } }
export function getLearningSession(): Promise<Session> {
    if (!current) current = fetch("/api/activity/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) })
        .then(async r => { if (!r.ok) throw new Error("Session unavailable"); session = await r.json();
            if (!loaded) { loaded = true; try { const old = JSON.parse(localStorage.getItem(storageKey()!) || "[]"); if (Array.isArray(old)) buffer.push(...old.filter(e => Date.parse(e.occurred_at) > Date.now() - 86400000)); } catch { /* Invalid local queue is discarded. */ } }
            return session!;
        }).catch(error => { current = null; throw error; });
    return current;
}
export async function queueActivity(event: Omit<LearningEvent, "event_id" | "session_id" | "occurred_at">) {
    const occurred_at = new Date().toISOString();
    try { const s = await getLearningSession(); buffer.push({ ...event, event_id: crypto.randomUUID(), session_id: s.id, occurred_at }); persist(); }
    catch { /* Tracking failure must never prevent submission. */ }
}
export function flushActivity() {
    if (sending) return sending;
    sending = (async () => {
        while (buffer.length) {
            const events = buffer.slice(0, 40);
            try {
                const response = await fetch("/api/activity/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events }), keepalive: true });
                if (!response.ok) break;
                const ids = new Set(events.map(e => e.event_id)); buffer = buffer.filter(e => !ids.has(e.event_id)); persist();
            } catch { break; }
        }
    })().finally(() => { sending = null; });
    return sending;
}
export function beaconActivity() {
    if (!buffer.length) return;
    // Retain until acknowledged by fetch: a successful beacon only means queued by the browser.
    navigator.sendBeacon("/api/activity/log", new Blob([JSON.stringify({ events: buffer.slice(0, 40) })], { type: "application/json" }));
}
export async function heartbeat(page: string, active: boolean) {
    try {
        const s = await getLearningSession();
        const response = await fetch("/api/activity/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "heartbeat", session_id: s.id, event_id: crypto.randomUUID(), page, active, video: videoPlaying && !document.hidden, occurred_at: new Date().toISOString() }), keepalive: true });
        if (response.status === 409) { current = null; session = null; }
    } catch { /* Retry on the next tick. */ }
}
export function setVideoPlaying(value: boolean) { videoPlaying = value; }
export async function endLearningSession() {
    await clearLocalDrafts().catch(() => {});
    await flushActivity();
    if (session) await fetch("/api/activity/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout", session_id: session.id }), keepalive: true }).catch(() => {});
    for (const key of Object.keys(localStorage)) if (key.startsWith("lms-events:")) localStorage.removeItem(key);
    current = null; session = null; loaded = false; buffer = []; videoPlaying = false;
    if ("caches" in window) for (const key of await caches.keys()) if (key.includes("supabase")) await caches.delete(key);
}
