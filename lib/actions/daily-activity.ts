"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchStudentDailyActivity(studentId: string, dateStr?: string) {
    try {
        const adminSupabase = createAdminClient();
        
        // Mặc định lấy hôm nay (local time)
        const dateObj = dateStr ? new Date(dateStr) : new Date();
        dateObj.setHours(0, 0, 0, 0);
        const nextDay = new Date(dateObj);
        nextDay.setDate(nextDay.getDate() + 1);

        const { data, error } = await adminSupabase
            .from("user_page_sessions")
            .select("section_name, duration_seconds, started_at")
            .eq("user_id", studentId)
            .gte("started_at", dateObj.toISOString())
            .lt("started_at", nextDay.toISOString());

        // Nếu bảng chưa có (do db chưa push up) => fail gracefully
        if (error) {
            console.error("fetchStudentDailyActivity error:", error.message);
            return { data: [], total_duration: 0, error: null }; // pretend table is empty
        }

        const sessions = data || [];
        
        let totalDuration = 0;
        const breakdown: Record<string, number> = {};

        sessions.forEach(s => {
            totalDuration += s.duration_seconds;
            breakdown[s.section_name] = (breakdown[s.section_name] || 0) + s.duration_seconds;
        });

        const breakdownList = Object.keys(breakdown).map(k => ({
            name: k,
            duration: breakdown[k]
        })).sort((a, b) => b.duration - a.duration);

        return { 
            data: breakdownList, 
            total_duration: totalDuration, 
            error: null 
        };
    } catch (error: any) {
        return { data: [], total_duration: 0, error: error.message };
    }
}
