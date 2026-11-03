"use server";
import { z } from "zod";
import { requireResourceAccess } from "@/lib/auth/authorize";
export async function readVideoProgress(itemId: string) {
    const { id, db } = await requireResourceAccess("course_items", itemId, "learn");
    const { data, error } = await db.from("video_progress").select("position_seconds,coverage,intervals").eq("student_id", id).eq("item_id", itemId).maybeSingle();
    if (error) throw new Error("Không đọc được tiến độ video.");
    return data;
}
export async function saveVideoProgress(input: unknown) {
    const body = z.object({ itemId: z.uuid(), position: z.number().min(0).max(86400), duration: z.number().positive().max(86400), intervals: z.array(z.tuple([z.number().min(0), z.number().min(0)])).max(200) }).parse(input);
    if (body.intervals.some(([s, e]) => e < s || e > body.duration || e - s > 35) || body.position > body.duration) throw new Error("Khoảng xem video không hợp lệ.");
    const { id, db, resource } = await requireResourceAccess("course_items", body.itemId, "learn");
    if (resource.type !== "video") throw new Error("Không phải học liệu video.");
    const { data, error } = await db.rpc("save_learning_video", { p_student: id, p_item: body.itemId, p_position: body.position, p_duration: body.duration, p_intervals: body.intervals });
    if (error) throw new Error("Chưa lưu được tiến độ xem video.");
    return Number(data);
}
