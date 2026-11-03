import { beforeEach,describe,it,expect,vi } from "vitest";
const state=vi.hoisted(()=>({
  user:{id:"student",email:"student@example.test",user_metadata:{role:"super_admin"}},
  role:"student", memberships:[{id:"m1",school_id:"school-a",role:"student",status:"active"}],
  activation:[] as {status:string}[],cookies:{} as Record<string,string>,headers:{} as Record<string,string>,
  membershipError:false,
}));
vi.mock("next/headers",()=>({cookies:async()=>({get:(name:string)=>state.cookies[name]?{value:state.cookies[name]}:undefined}),headers:async()=>({get:(name:string)=>state.headers[name]||null})}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:state.user},error:null})}})}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({from:(table:string)=>{
  let rows:Record<string,unknown>[]=table==="users"?[{id:state.user.id,role:state.role}]:table==="school_memberships"?state.memberships:table==="account_activations"?state.activation:[];
  const query={
    select:()=>query,eq:(field:string,value:unknown)=>{rows=rows.filter(row=>row[field]===undefined||row[field]===value);return query;},order:()=>query,limit:()=>query,
    single:async()=>({data:rows[0]||null,error:null}),then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:rows,error:table==="school_memberships"&&state.membershipError?{message:"unavailable"}:null}).then(resolve),
  };return query;
}})}));
import { getActorContext,requireActorContext } from "@/lib/auth/actor-context";
describe("Actor resolution uses verified school membership",()=>{
  beforeEach(()=>{
    state.role="student";state.memberships=[{id:"m1",school_id:"school-a",role:"student",status:"active"}];
    state.activation=[];state.cookies={};state.headers={};state.membershipError=false;
  });
  it("ignores user-editable role metadata",async()=>{
    const actor=await getActorContext();expect(actor?.roles).toEqual(["student"]);expect(actor?.currentRole).toBe("student");
  });
  it("never fabricates a pilot membership",async()=>{
    state.memberships=[];expect(await getActorContext()).toBeNull();
  });
  it("keeps roles in different schools separate",async()=>{
    state.memberships.push({id:"m2",school_id:"school-b",role:"admin",status:"active"});
    expect((await getActorContext("school-a"))?.roles).toEqual(["student"]);
    expect((await getActorContext("school-b"))?.roles).toEqual(["admin"]);
    state.cookies={"lms-school-id":"school-a"};
    await expect(requireActorContext(["admin"])).rejects.toMatchObject({status:403});
  });
  it("fails closed on membership lookup errors, missing memberships, and pending activation",async()=>{
    state.membershipError=true;expect(await getActorContext()).toBeNull();
    state.membershipError=false;state.activation=[{status:"pending"}];expect(await getActorContext()).toBeNull();
    state.activation=[];state.cookies={"lms-school-id":"foreign-school"};expect(await getActorContext()).toBeNull();
  });
  it("supports bearer clients while validating the requested school",async()=>{
    state.headers={authorization:"Bearer validated-by-auth-provider","x-school-id":"school-a"};
    expect((await getActorContext())?.schoolId).toBe("school-a");
    state.headers["x-school-id"]="foreign-school";expect(await getActorContext()).toBeNull();
  });
});
