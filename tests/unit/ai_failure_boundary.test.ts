import {describe,it,expect,vi} from "vitest";
const writes=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc:async()=>({data:{allowed:true},error:null}),from:()=>({insert:writes})})}));
import { generateQuestionsDraft } from "@/lib/ai/ai-service";
describe("Production AI failure boundary",()=>{
  it("returns unavailable without saving fabricated questions when no key is configured",async()=>{
    vi.stubEnv("GEMINI_API_KEY",undefined);
    const result=await generateQuestionsDraft({schoolId:"school",requestedBy:"teacher",subject:"Toán",gradeLevel:12,topic:"Đạo hàm"});
    expect(result.success).toBe(false);expect(result.draft).toBeUndefined();expect(writes).not.toHaveBeenCalled();
  });
});
