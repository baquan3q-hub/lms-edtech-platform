"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/notificationStore";

/**
 * Hook trung tâm xử lý Supabase Realtime cho toàn bộ Dashboard.
 * Subscribe vào các bảng quan trọng và invalidate TanStack Query cache
 * để UI tự động cập nhật mà không cần reload trang.
 *
 * Nhúng vào app/(dashboard)/layout.tsx
 */
export function useRealtimeSync(userId: string, role: string) {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!userId) return;

        // Tránh tạo channel trùng
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
            .channel(`realtime-sync-${userId}`)

            // ── 1. attendance_records ──────────────────────────────
            // Khi GV lưu điểm danh → Admin thấy ngay, Parent thấy ngay
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "attendance_records",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["attendance"] });
                    queryClient.invalidateQueries({ queryKey: ["student-stats"] });
                    queryClient.invalidateQueries({ queryKey: ["admin-attendance-today"] });
                    queryClient.invalidateQueries({ queryKey: ["child-attendance"] });
                    queryClient.invalidateQueries({ queryKey: ["child-stats"] });
                    queryClient.invalidateQueries({ queryKey: ["attendance-points"] });
                }
            )

            // ── 2. attendance_sessions ────────────────────────────
            // Khi mở phiên điểm danh mới
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "attendance_sessions",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["attendance"] });
                    queryClient.invalidateQueries({ queryKey: ["admin-attendance-today"] });
                }
            )

            // ── 3. absence_requests ───────────────────────────────
            // Phụ huynh gửi đơn xin nghỉ → GV nhận biết
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "absence_requests",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["absence-requests"] });
                }
            )

            // ── 4. notifications ──────────────────────────────────
            // Thông báo mới cho user hiện tại → cập nhật chuông
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    useNotificationStore.getState().addNotification(payload.new as any);
                }
            )

            // ── 5. student_class_stats ────────────────────────────
            // Thống kê cập nhật → refresh bảng xếp hạng
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "student_class_stats",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["student-stats"] });
                    queryClient.invalidateQueries({ queryKey: ["child-stats"] });
                    queryClient.invalidateQueries({ queryKey: ["class-students"] });
                }
            )

            // ── 6. attendance_points ──────────────────────────────
            // Điểm chuyên cần thay đổi → gamification UI cập nhật
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "attendance_points",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["attendance-points"] });
                    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
                }
            )

            // ── 7. announcements ─────────────────────────────────
            // Thông báo mới từ lớp → Parent notifications page cập nhật
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "announcements",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["parent-notifications"] });
                    queryClient.invalidateQueries({ queryKey: ["class-announcements"] });
                }
            )

            .subscribe();

        channelRef.current = channel;

        // ── Fetch notifications ban đầu ──────────────────────
        const fetchInitialNotifications = async () => {
            const { data } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(30);

            if (data) {
                useNotificationStore.getState().setNotifications(data);
            }
        };
        fetchInitialNotifications();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [userId, role]);
}
