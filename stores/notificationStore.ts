import { create } from "zustand";

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type?: string;
    metadata?: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

interface NotificationStore {
    notifications: Notification[];
    unreadCount: number;

    // Actions
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
    notifications: [],
    unreadCount: 0,

    setNotifications: (notifications) =>
        set({
            notifications,
            unreadCount: notifications.filter((n) => !n.is_read).length,
        }),

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
        })),

    markAsRead: (id) =>
        set((state) => {
            const wasUnread = state.notifications.find(
                (n) => n.id === id && !n.is_read
            );
            return {
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, is_read: true } : n
                ),
                unreadCount: wasUnread
                    ? state.unreadCount - 1
                    : state.unreadCount,
            };
        }),

    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({
                ...n,
                is_read: true,
            })),
            unreadCount: 0,
        })),

    clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
