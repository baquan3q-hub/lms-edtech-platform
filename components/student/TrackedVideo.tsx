"use client";
import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { readVideoProgress, saveVideoProgress } from "@/lib/actions/video-progress";
import { setVideoPlaying } from "@/lib/learning/tracker-client";
import type { Interval } from "@/lib/learning/intervals";

declare global {
    interface Window {
        onYouTubeIframeAPIReady?: () => void;
        YT?: typeof YT;
    }
}

let youtubeReady: Promise<void> | null = null;
function loadYoutube() {
    if (window.YT?.Player) return Promise.resolve();
    if (!youtubeReady) youtubeReady = new Promise(resolve => {
        window.onYouTubeIframeAPIReady = () => resolve();
        const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(script);
    });
    return youtubeReady;
}
export default function TrackedVideo({ url, itemId }: { url: string; itemId: string }) {
    const container = useRef<HTMLDivElement>(null);
    const [coverage, setCoverage] = useState(0), [message, setMessage] = useState("");
    useEffect(() => {
        let disposed = false, destroy = () => {}, previous = 0, wall = 0, duration = 0, position = 0, saving = false;
        const pending: Interval[] = [];
        const sample = (time: number, length: number, playing: boolean, speed = 1) => {
            const now = performance.now();
            const delta = time - previous, elapsed = wall ? (now - wall) / 1000 : 0;
            if (playing && !document.hidden && elapsed > 0 && elapsed < 5 && delta > 0 && delta <= elapsed * speed + 1 && delta <= 35) pending.push([previous, time]);
            position = time; duration = length; previous = time; wall = now; setVideoPlaying(playing && !document.hidden);
        };
        const save = async () => {
            if (saving || !duration || !pending.length) return;
            saving = true; const batch = pending.slice(0, 200);
            try { const result = await saveVideoProgress({ itemId, position, duration, intervals: batch }); pending.splice(0, batch.length); if (!disposed) { setCoverage(result); setMessage(""); } }
            catch { if (!disposed) setMessage("Chưa lưu được tiến độ. Hệ thống sẽ thử lại."); }
            finally { saving = false; }
        };
        const init = async () => {
            let resume = 0;
            try { const progress = await readVideoProgress(itemId); resume = Number(progress?.position_seconds) || 0; if (!disposed) setCoverage(Number(progress?.coverage) || 0); }
            catch { if (!disposed) setMessage("Chưa tải được tiến độ đã lưu."); }
            if (disposed || !container.current) return;
            const youtube = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/)?.[1];
            const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
            if (youtube) {
                await loadYoutube(); if (disposed || !container.current) return;
                const host = document.createElement("div"); container.current.appendChild(host);
                const player = new YT.Player(host, { videoId: youtube, width: "100%", height: "100%", playerVars: { origin: window.location.origin, start: Math.floor(resume) } });
                const timer = setInterval(() => { if (player.getCurrentTime) sample(player.getCurrentTime(), player.getDuration(), player.getPlayerState() === YT.PlayerState.PLAYING, player.getPlaybackRate()); }, 1000);
                destroy = () => { clearInterval(timer); player.destroy(); };
            } else if (vimeo) {
                const player = new Player(container.current, { id: Number(vimeo), responsive: true });
                let playing = false;
                player.on("play", () => { playing = true; }); player.on("pause", () => { playing = false; setVideoPlaying(false); });
                player.on("timeupdate", (e: { seconds: number; duration: number }) => sample(e.seconds, e.duration, playing));
                await player.ready(); if (resume) await player.setCurrentTime(resume).catch(() => {});
                destroy = () => { void player.destroy(); };
            } else if (/\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes("supabase.co/storage")) {
                const video = document.createElement("video"); video.controls = true; video.src = url; video.className = "w-full h-full";
                video.onloadedmetadata = () => { video.currentTime = Math.min(resume, video.duration); };
                video.ontimeupdate = () => sample(video.currentTime, video.duration, !video.paused, video.playbackRate);
                video.onpause = () => { setVideoPlaying(false); void save(); }; video.onended = () => { setVideoPlaying(false); void save(); };
                container.current.appendChild(video); destroy = () => { video.pause(); video.remove(); };
            } else {
                const frame = document.createElement("iframe"); frame.src = url; frame.title = "Video bài giảng"; frame.className = "w-full h-full"; container.current.appendChild(frame);
                setMessage("Nguồn video này không hỗ trợ đo tự động. Giáo viên có thể xác nhận hoàn thành."); destroy = () => frame.remove();
            }
            if (disposed) destroy();
        };
        void init().catch(() => { if (!disposed) setMessage("Không tải được video. Vui lòng tải lại trang."); });
        const timer = setInterval(() => void save(), 10000);
        const visibility = () => { wall = 0; if (document.hidden) { setVideoPlaying(false); void save(); } };
        document.addEventListener("visibilitychange", visibility);
        return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", visibility); destroy(); setVideoPlaying(false); void save(); };
    }, [url, itemId]);
    return <section className="h-full flex flex-col"><div ref={container} className="flex-1 min-h-0" /><p className="bg-white text-slate-700 text-sm p-2" role="status">{message || `Đã xem ${Math.round(coverage * 100)}% nội dung${coverage >= .9 ? " · Hoàn thành video" : ""}`}</p></section>;
}
