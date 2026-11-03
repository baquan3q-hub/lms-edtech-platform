"use client";

import { useRealtimeSync } from "@/hooks/useRealtimeSync";

/**
 * Client component nhúng vào Dashboard layout.
 * Tự động lấy user session và khởi tạo Realtime Sync.
 */
export default function RealtimeSyncProvider({
    children, userId, role, schoolId,
}: {
    children: React.ReactNode;
    userId: string;
    role: string;
    schoolId: string;
}) {
    useRealtimeSync(userId, role, schoolId);

    return <>{children}</>;
}
