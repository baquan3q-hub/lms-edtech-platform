"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

/**
 * Client component nhúng vào Dashboard layout.
 * Tự động lấy user session và khởi tạo Realtime Sync.
 */
export default function RealtimeSyncProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [userId, setUserId] = useState<string>("");
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        const supabase = createClient();

        const init = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            setUserId(user.id);

            // Lấy role từ bảng users
            const { data: userData } = await supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .single();

            setRole(userData?.role || "");
        };

        init();
    }, []);

    // Kích hoạt hook realtime sync khi đã có userId
    useRealtimeSync(userId, role);

    return <>{children}</>;
}
