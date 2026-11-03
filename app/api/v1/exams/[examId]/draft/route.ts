import { z } from "zod";
import { api, jsonBody, requireSameOrigin } from "@/lib/api/http";
import { saveExamDraftWithVersioning } from "@/lib/actions/submission-draft";
import { requireActor } from "@/lib/auth/authorize";
import { AccessError } from "@/lib/auth/actor-context";
import { answersSchema } from "@/lib/learning/grading";
export async function PATCH(request:Request,context:{params:Promise<{examId:string}>}) {
  return api(async()=>{
    requireSameOrigin(request);
    const actor=await requireActor(["student"]);
    const {examId}=await context.params;z.uuid().parse(examId);
    const input=await jsonBody(request,z.object({attemptId:z.uuid(),answers:answersSchema,clientVersion:z.number().int().min(0)}).strict(),512000);
    const {data,error}=await actor.db.from("exam_attempts").select("id").eq("id",input.attemptId).eq("student_id",actor.id).eq("exam_id",examId).maybeSingle();
    if(error||!data)throw new AccessError(404,"Không tìm thấy lượt làm bài.","NOT_FOUND");
    const result=await saveExamDraftWithVersioning(input);
    if(!result.success)throw new AccessError(409,result.error||"Chưa lưu được bản nháp.",result.code||"DRAFT_SAVE_FAILED");
    return {version:result.version};
  });
}
