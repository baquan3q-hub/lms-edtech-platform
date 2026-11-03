import { z } from "zod";
import { api,jsonBody,requireSameOrigin } from "@/lib/api/http";
import { saveGrade } from "@/lib/modules/assessment/grading-service";
import { requireActor } from "@/lib/auth/authorize";
export async function PUT(request:Request,context:{params:Promise<{submissionId:string}>}) {
  return api(async()=>{
    requireSameOrigin(request);
    await requireActor(["teacher","admin"]);
    const {submissionId}=await context.params;z.uuid().parse(submissionId);
    const input=await jsonBody(request,z.object({kind:z.enum(["exam","homework"]),newScore:z.number().finite().min(0),publishNow:z.boolean(),reason:z.string().max(2000).optional(),feedback:z.string().max(30000).optional(),rubricGrades:z.record(z.string(),z.json()).optional()}).strict());
    return {gradingStatus:await saveGrade(input.kind,{...input,submissionId})};
  });
}
