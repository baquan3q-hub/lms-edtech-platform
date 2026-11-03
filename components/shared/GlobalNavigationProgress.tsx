"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function NavigationProgressContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Khi pathname hoặc searchParams thay đổi -> Điều hướng đã hoàn tất
    useEffect(() => {
        if (isNavigating) {
            setProgress(100);
            const timer = setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [pathname, searchParams]);

    // Giả lập tiến trình chạy mượt từ 0% -> 85% trong lúc chờ server phản hồi
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isNavigating) {
            setProgress(15);
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 85) return prev;
                    // Tăng chậm dần về gần 85%
                    const remaining = 85 - prev;
                    return prev + Math.max(1, Math.floor(remaining * 0.15));
                });
            }, 120);
        }
        return () => clearInterval(interval);
    }, [isNavigating]);

    // Bắt sự kiện click vào các thẻ liên kết nội bộ <a>
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement)?.closest("a");
            if (!target) return;

            const href = target.getAttribute("href");
            const targetAttr = target.getAttribute("target");

            // Bỏ qua nếu là link ngoại bộ, target _blank, download, hoặc bookmark #
            if (
                !href ||
                href.startsWith("#") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                href.startsWith("javascript:") ||
                targetAttr === "_blank" ||
                e.ctrlKey ||
                e.metaKey ||
                e.shiftKey ||
                e.altKey
            ) {
                return;
            }

            // Kiểm tra xem có phải điều hướng nội bộ không
            const url = new URL(href, window.location.href);
            const isInternal = url.origin === window.location.origin;

            // Nếu là trang khác với trang hiện tại -> Kích hoạt loading ngay lập tức (0ms)
            const currentFull = window.location.pathname + window.location.search;
            const targetFull = url.pathname + url.search;

            if (isInternal && currentFull !== targetFull) {
                setIsNavigating(true);
            }
        };

        // Lắng nghe sự kiện tùy chỉnh nếu gọi router.push() từ code
        const handleCustomStart = () => setIsNavigating(true);
        const handleCustomEnd = () => {
            setProgress(100);
            setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 250);
        };

        document.addEventListener("click", handleClick, { capture: true });
        window.addEventListener("app:navigation-start", handleCustomStart);
        window.addEventListener("app:navigation-end", handleCustomEnd);

        return () => {
            document.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("app:navigation-start", handleCustomStart);
            window.removeEventListener("app:navigation-end", handleCustomEnd);
        };
    }, []);

    if (!isNavigating && progress === 0) return null;

    return (
        <div className="fixed inset-x-0 top-0 z-[99999] pointer-events-none">
            {/* Thanh tiến trình Gradient mượt mà trên đỉnh màn hình */}
            <div
                className="h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 shadow-[0_0_12px_rgba(59,130,246,0.8),0_0_6px_rgba(99,102,241,0.6)] transition-all duration-200 ease-out"
                style={{
                    width: `${progress}%`,
                    opacity: progress === 100 ? 0 : 1,
                    transitionProperty: "width, opacity",
                }}
            />

            {/* Floating Emotion Spinner ở góc trên bên phải */}
            <div
                className={`fixed top-4 right-4 sm:top-5 sm:right-6 transition-all duration-300 transform ${
                    isNavigating
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 -translate-y-2 scale-95"
                }`}
            >
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-xl shadow-slate-950/20 text-white text-xs font-medium">
                    <div className="relative flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="absolute w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping" />
                    </div>
                    <span className="tracking-tight text-slate-200">
                        Đang chuyển màn hình...
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function GlobalNavigationProgress() {
    return (
        <Suspense fallback={null}>
            <NavigationProgressContent />
        </Suspense>
    );
}
