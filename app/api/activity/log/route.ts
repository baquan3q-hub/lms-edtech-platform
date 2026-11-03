import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, requireActor, requireResourceAccess } from "@/lib/auth/authorize";
import { eventBatchSchema } from "@/lib/learning/activity-schema";
export async function POST(req: NextRequest) {
    try {
        const actor = await requireActor(["student"]);
        const text = await req.text();
        if (text.length > 60000) return NextResponse.json({ error: "Dữ liệu quá lớn." }, { status: 413 });
        const { events } = eventBatchSchema.parse(JSON.parse(text));
        const contexts = new Map<string,string>();
        for (const event of events) {
            if (Date.parse(event.occurred_at) > Date.now() + 60000 || Date.parse(event.occurred_at) < Date.now() - 86400000) throw new Error("STALE_EVENT");
            const key = `${event.context_type}:${event.context_id}`;
            if (!contexts.has(key)) {
                const access = await requireResourceAccess(event.context_type === "exam" ? "exams" : event.context_type === "homework" ? "homework" : "course_items", event.context_id, "learn");
                contexts.set(key,access.resource.class_id);
            }
            if (contexts.get(key) !== event.class_id) throw new AccessError(403);
        }
        const sessions = [...new Set(events.map(e => e.session_id))];
        const { data, error: sessionError } = await actor.db.from("learning_sessions").select("id").eq("student_id", actor.id).in("id", sessions);
        if (sessionError) throw sessionError;
        if (data?.length !== sessions.length) throw new AccessError(403);
        for (const e of events.filter(e => e.context_type === "exam")) {
            if (!e.attempt_id) throw new AccessError(400);
            const { data: attempt } = await actor.db.from("exam_attempts").select("id").eq("id", e.attempt_id).eq("student_id", actor.id).eq("exam_id", e.context_id).maybeSingle();
            if (!attempt) throw new AccessError(403);
        }
        const { error } = await actor.db.rpc("ingest_learning_events", { p_student: actor.id, p_events: events });
        if (error) return NextResponse.json({ error: "Không thể lưu sự kiện." }, { status: error.message.includes("RATE_LIMIT") ? 429 : 503 });
        return NextResponse.json({ success: true, logged: events.length });
    } catch (error) {
        return NextResponse.json({ error: "Sự kiện không hợp lệ hoặc không thể lưu." }, { status: error instanceof AccessError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503 });
    }
}
