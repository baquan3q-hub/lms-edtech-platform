import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useNotifications(userId: string | undefined) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const supabase = createClient();

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const fetchInitialNotifications = async () => {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(20);

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter((n) => !n.is_read).length);
            }
        };

        fetchInitialNotifications();

        const channel = supabase
            .channel(`notifications:user_id=eq.${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotification = payload.new;
                    setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
                    setUnreadCount((prev) => prev + 1);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const updatedNotification = payload.new;
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
                    );
                    setUnreadCount((prev) => {
                        // Recalculate unread count based on the updated state
                        const currentUnread = payload.old.is_read ? prev : prev - 1;
                        return updatedNotification.is_read ? currentUnread : currentUnread + 1;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return { notifications, setNotifications, unreadCount, setUnreadCount };
}
