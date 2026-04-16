import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/activity/log — Nhận batch activity events từ client
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { events } = body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return NextResponse.json({ error: "No events provided" }, { status: 400 });
        }

        // Rate limiting: max 100 events per request
        if (events.length > 100) {
            return NextResponse.json({ error: "Too many events (max 100)" }, { status: 400 });
        }

        // Validate và chuẩn hóa events
        const validEvents = events
            .filter((e: any) => e.activity_type && e.context_type)
            .map((e: any) => ({
                student_id: user.id,
                activity_type: e.activity_type,
                context_type: e.context_type,
                context_id: e.context_id || null,
                class_id: e.class_id || null,
                metadata: e.metadata || {},
            }));

        if (validEvents.length === 0) {
            return NextResponse.json({ error: "No valid events" }, { status: 400 });
        }

        // Batch insert vào student_activity_logs
        const { error } = await supabase
            .from("student_activity_logs")
            .insert(validEvents);

        if (error) {
            console.error("Error inserting activity logs:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            logged: validEvents.length 
        });
    } catch (error: any) {
        console.error("Activity log API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
