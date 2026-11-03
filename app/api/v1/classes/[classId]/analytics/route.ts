import { z } from "zod";
import { api } from "@/lib/api/http";
import { getClassAnalytics } from "@/lib/modules/analytics/service";
export async function GET(request:Request,context:{params:Promise<{classId:string}>}) {
  return api(async()=>{
    const {classId}=await context.params;
    const page=z.coerce.number().int().min(0).max(1000).parse(new URL(request.url).searchParams.get("page")||0);
    return getClassAnalytics(classId,page);
  });
}
