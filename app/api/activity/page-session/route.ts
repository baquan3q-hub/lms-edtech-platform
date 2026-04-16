import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const textBody = await req.text();
        const body = JSON.parse(textBody);
        const { pagePath, sectionName, durationSeconds } = body;

        const sessionStart = new Date(Date.now() - durationSeconds * 1000).toISOString();

        // Check xem bảng có tồn tại không (error handling gracefully)
        const { error } = await supabase.from('user_page_sessions').insert({
            user_id: user.id,
            page_path: pagePath,
            section_name: sectionName,
            started_at: sessionStart,
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds
        });

        if (error) {
            console.error("Lỗi khi lưu thời gian hoạt động:", error.message);
            // Ignore error gracefully so it doesn't break client sendBeacon
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Activity tracking error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
