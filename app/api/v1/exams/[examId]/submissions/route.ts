import { z } from "zod";
import { api,jsonBody,requireSameOrigin } from "@/lib/api/http";
import { submitExamAnswers } from "@/lib/actions/exam";
import { requireResourceAccess } from "@/lib/auth/authorize";
import { AccessError } from "@/lib/auth/actor-context";
import { answersSchema } from "@/lib/learning/grading";
export async function POST(request:Request,context:{params:Promise<{examId:string}>}) {
  return api(async()=>{
    requireSameOrigin(request);
    const {examId}=await context.params;z.uuid().parse(examId);
    const actor=await requireResourceAccess("exams",examId,"learn");
    const input=await jsonBody(request,z.object({attemptId:z.uuid(),answers:answersSchema}).strict(),512000);
    const result=await submitExamAnswers(examId,actor.resource.class_id,input.answers,"",0,input.attemptId);
    if(!result.data)throw new AccessError(409,result.error||"Chưa nộp được bài.","SUBMISSION_REJECTED");
    return result.data;
  });
}
