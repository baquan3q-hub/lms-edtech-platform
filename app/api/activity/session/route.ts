import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, requireActor } from "@/lib/auth/authorize";
const input = z.discriminatedUnion("action", [
    z.object({ action: z.literal("start") }),
    z.object({ action: z.literal("heartbeat"), session_id: z.uuid(), event_id: z.uuid(), page: z.string().startsWith("/student").max(500), active: z.boolean(), video: z.boolean(), occurred_at: z.iso.datetime() }),
    z.object({ action: z.literal("logout"), session_id: z.uuid() }),
]);
export async function POST(req: NextRequest) {
    try {
        const actor = await requireActor(["student"]);
        const body = input.parse(await req.json());
        if (body.action === "start") {
            await actor.db.from("learning_sessions").update({ state: "offline", end_reason: "timeout" }).eq("student_id", actor.id).is("ended_at", null).lt("last_seen_at", new Date(Date.now() - 90000).toISOString());
            const { data, error } = await actor.db.from("learning_sessions").insert({ student_id: actor.id }).select("id, started_at").single();
            if (error) throw error;
            return NextResponse.json({ ...data, student_id: actor.id });
        }
        if (body.action === "logout") {
            const { error } = await actor.db.from("learning_sessions").update({ ended_at: new Date().toISOString(), state: "offline", end_reason: "logout" }).eq("id", body.session_id).eq("student_id", actor.id).is("ended_at", null);
            if (error) throw error;
        } else {
            // Replayed/offline heartbeats never renew online presence.
            if (Math.abs(Date.now() - Date.parse(body.occurred_at)) > 35000) return NextResponse.json({ error: "Heartbeat đã cũ." }, { status: 409 });
            const { error } = await actor.db.rpc("learning_heartbeat", { p_student: actor.id, p_session: body.session_id, p_event: body.event_id, p_page: body.page, p_active: body.active, p_video: body.video });
            if (error) return NextResponse.json({ error: "Phiên đã hết hạn hoặc chưa lưu được." }, { status: error.message.includes("SESSION_") ? 409 : 503 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Không thể ghi nhận phiên học." }, { status: error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 503 });
    }
}
