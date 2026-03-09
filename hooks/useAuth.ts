"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

interface AuthState {
    user: User | null;
    role: UserRole | null;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        role: null,
        loading: true,
        error: null,
    });

    const supabase = createClient();

    // Lấy thông tin user và role hiện tại
    const fetchUser = useCallback(async () => {
        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                setState({ user: null, role: null, loading: false, error: null });
                return;
            }

            // Lấy role từ bảng users
            const { data: userData, error: dbError } = await supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .single();

            if (dbError) {
                console.warn("[useAuth] Cannot fetch role:", dbError.message);
                // Fallback: lấy role từ user metadata
                const metaRole = user.user_metadata?.role as UserRole;
                setState({
                    user,
                    role: metaRole || "student",
                    loading: false,
                    error: null,
                });
                return;
            }

            setState({
                user,
                role: (userData?.role as UserRole) || "student",
                loading: false,
                error: null,
            });
        } catch (err) {
            console.error("[useAuth] Error:", err);
            setState({ user: null, role: null, loading: false, error: "Lỗi xác thực" });
        }
    }, [supabase]);

    // Đăng xuất
    const signOut = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));
        await supabase.auth.signOut();
        setState({ user: null, role: null, loading: false, error: null });
        // Redirect về trang login
        window.location.href = "/login";
    }, [supabase]);

    // Lắng nghe thay đổi auth state
    useEffect(() => {
        fetchUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUser();
            } else {
                setState({ user: null, role: null, loading: false, error: null });
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchUser, supabase]);

    return {
        user: state.user,
        role: state.role,
        loading: state.loading,
        error: state.error,
        signOut,
        refreshUser: fetchUser,
    };
}
