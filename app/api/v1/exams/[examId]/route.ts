import { z } from "zod";
import { api } from "@/lib/api/http";
import { fetchExamQuestions } from "@/lib/actions/exam";
import { AccessError } from "@/lib/auth/actor-context";
import { requireActor } from "@/lib/auth/authorize";

export async function GET(_request: Request, context: { params: Promise<{ examId: string }> }) {
  return api(async () => {
    await requireActor(["student"]);
    const { examId } = await context.params;
    z.uuid().parse(examId);
    const result = await fetchExamQuestions(examId);
    if (!result.data) throw new AccessError(404, "Không tìm thấy đề thi.", "NOT_FOUND");
    return result.data;
  });
}
