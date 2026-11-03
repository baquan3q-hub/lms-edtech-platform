import { z } from "zod";

const content = z.object({
  item_id: z.string(), content: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(), file_url: z.string().nullable().optional(),
  zoom_link: z.string().nullable().optional(), deadline: z.string().nullable().optional(),
  max_attempts: z.number().nullable().optional(), min_score: z.number().nullable().optional(),
  score_method: z.string().nullable().optional(),
});
const item = z.object({
  id: z.string(), class_id: z.string(), parent_id: z.string().nullable(),
  title: z.string(), type: z.string(), order_index: z.number(), is_published: z.boolean(),
  content: z.union([content, z.array(content)]).nullable().optional(),
});

/** Embedded quiz data is private; questions are loaded through assessment DTOs. */
export function toStudentCourseItem(value: unknown) {
  return item.parse(value);
}
