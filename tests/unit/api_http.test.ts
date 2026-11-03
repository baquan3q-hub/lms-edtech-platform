import { describe,it,expect } from "vitest";
import { z } from "zod";
import { api,jsonBody,requireSameOrigin } from "@/lib/api/http";
import { AccessError } from "@/lib/auth/actor-context";
describe("Versioned API transport",()=>{
  it("returns a stable private error envelope without leaking database errors",async()=>{
    const response=await api(async()=>{throw new Error("secret SQL and credentials");});
    const body=await response.json();
    expect(response.status).toBe(503);expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");expect(JSON.stringify(body)).not.toContain("secret");
    expect(body.requestId).toBeTruthy();
  });
  it("retains resource authorization status codes",async()=>{
    const response=await api(async()=>{throw new AccessError(403,"Không có quyền.","FORBIDDEN");});
    expect(response.status).toBe(403);
  });
  it("checks actual UTF-8 bytes, even with a forged Content-Length",async()=>{
    const request=new Request("https://school.test/api/v1/test",{method:"POST",headers:{"Content-Type":"application/json","Content-Length":"1"},body:JSON.stringify({text:"Việt Nam".repeat(30)})});
    await expect(jsonBody(request,z.object({text:z.string()}),50)).rejects.toMatchObject({status:413});
  });
  it("rejects malformed JSON and foreign cookie origins",async()=>{
    await expect(jsonBody(new Request("https://school.test",{method:"POST",headers:{"Content-Type":"application/json"},body:"{"}),z.object({}))).rejects.toMatchObject({status:400});
    expect(()=>requireSameOrigin(new Request("https://school.test/api/v1/test",{headers:{origin:"https://foreign.test"}}))).toThrow(AccessError);
  });
});
