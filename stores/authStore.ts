import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

interface AuthStore {
    // State
    user: User | null;
    role: UserRole | null;
    loading: boolean;

    // Actions
    setUser: (user: User | null) => void;
    setRole: (role: UserRole | null) => void;
    setLoading: (loading: boolean) => void;
    setAuth: (user: User | null, role: UserRole | null) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    // Initial state
    user: null,
    role: null,
    loading: true,

    // Actions
    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    setLoading: (loading) => set({ loading }),
    setAuth: (user, role) => set({ user, role, loading: false }),
    clearAuth: () => set({ user: null, role: null, loading: false }),
}));
