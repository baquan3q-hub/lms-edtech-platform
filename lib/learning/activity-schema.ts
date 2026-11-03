import { z } from "zod";
export const eventSchema = z.object({
    event_id: z.uuid(), session_id: z.uuid(), attempt_id: z.uuid().nullable().optional(),
    occurred_at: z.iso.datetime(), activity_type: z.enum(["quiz_start","exam_start","homework_start","lesson_start","video_start","question_start","quiz_answer","quiz_submit","exam_submit","homework_submit","tab_switch","page_focus","idle_detected","idle_end","session_end","cheat_warning"]),
    context_type: z.enum(["quiz","exam","homework","lesson","video"]), context_id: z.uuid(), class_id: z.uuid(),
    metadata: z.record(z.string().max(60), z.union([z.string().max(500),z.number().finite().min(0).max(86400000),z.boolean(),z.null()])).default({}),
});
export const eventBatchSchema = z.object({ events: z.array(eventSchema).min(1).max(100) });
export type LearningEvent = z.infer<typeof eventSchema>;
