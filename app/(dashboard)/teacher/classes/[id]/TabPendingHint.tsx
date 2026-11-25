"use client";

import { useLinkStatus } from "next/link";

// Vạch nhỏ dưới tab khi đang chờ server trả tab mới. Luôn render và chỉ đổi độ mờ
// (đặt absolute trong trigger) nên không làm xê dịch bố cục.
export default function TabPendingHint() {
    const { pending } = useLinkStatus();
    return (
        <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-current transition-opacity ${pending ? "opacity-70 animate-pulse" : "opacity-0"}`}
        />
    );
}
