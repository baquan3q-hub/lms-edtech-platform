"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function usePageTracker() {
    const pathname = usePathname();
    const sessionStartRef = useRef<number>(Date.now());
    const supabase = createClient();

    // Map đường dẫn thành section
    const getSectionName = (path: string) => {
        if (path.includes('/dashboard')) return 'Tổng quan';
        if (path.includes('/classes')) {
            if (path.includes('/learn')) return 'Bài giảng';
            if (path.includes('/exams')) return 'Kiểm tra';
            return 'Lớp học';
        }
        if (path.includes('/assignments')) return 'Bài tập';
        if (path.includes('/announcements')) return 'Thông báo';
        if (path.includes('/profile')) return 'Hồ sơ';
        return 'Khác';
    };

    useEffect(() => {
        sessionStartRef.current = Date.now();
        const sectionName = getSectionName(pathname);

        const handleUnloadOrSwitch = () => {
            const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
            if (duration < 5) return; // Bỏ qua nếu ở trang dưới 5 giây

            const payload = {
                pagePath: pathname,
                sectionName,
                durationSeconds: duration,
            };

            // Dùng sendBeacon để đảm bảo data được gửi khi đóng tab
            navigator.sendBeacon("/api/activity/page-session", JSON.stringify(payload));
        };

        window.addEventListener("beforeunload", handleUnloadOrSwitch);

        return () => {
            handleUnloadOrSwitch();
            window.removeEventListener("beforeunload", handleUnloadOrSwitch);
        };
    }, [pathname]);

    return null;
}
