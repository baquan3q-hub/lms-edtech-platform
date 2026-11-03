import { z } from "zod";
import { api, requireSameOrigin } from "@/lib/api/http";
import { beginExamAttempt } from "@/lib/actions/exam";
import { requireActor } from "@/lib/auth/authorize";
import { AccessError } from "@/lib/auth/actor-context";
export async function POST(request: Request, context: {params:Promise<{examId:string}>}) {
  return api(async()=>{
    requireSameOrigin(request);
    await requireActor(["student"]);
    const {examId}=await context.params;z.uuid().parse(examId);
    const result=await beginExamAttempt(examId);
    if(!result.data)throw new AccessError(409,result.error||"Không thể mở lượt làm bài.","ATTEMPT_UNAVAILABLE");
    return result.data;
  });
}
