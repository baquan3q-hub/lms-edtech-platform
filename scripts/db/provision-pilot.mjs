/** Explicit Auth provisioning for a reviewed clean project. Never logs credentials. */
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root } from "./bootstrap.mjs";
import { pilotAccounts, pilotSeedSql } from "./single-school-pilot.mjs";

nextEnv.loadEnvConfig(root,false,{info(){},error(){}});
const ref=process.argv[2];
const createAuth=process.argv.includes("--create-auth");
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!ref||!/^[a-z]{20}$/.test(ref)||!url||new URL(url).hostname!==`${ref}.supabase.co`)throw new Error("Target project does not match local configuration");
const location=path.join(root,".local/single-school-accounts.json");
mkdirSync(path.dirname(location),{recursive:true});
const manifest=existsSync(location)?JSON.parse(readFileSync(location,"utf8")):{projectRef:ref,createdAt:new Date().toISOString(),accounts:pilotAccounts()};
if(manifest.projectRef!==ref)throw new Error("Credential manifest belongs to another project");
function save(){writeFileSync(location,JSON.stringify(manifest,null,2),{mode:0o600});}
save();
writeFileSync(path.join(root,".local/single-school-seed.sql"),pilotSeedSql(manifest.accounts));
writeFileSync(path.join(root,".local/TAI_KHOAN_MOI.md"),[
  "# Tài khoản dữ liệu mẫu LMS — chỉ lưu riêng trên máy, không đưa lên Git",
  "", "Trường: LMS-THPT. 200 học sinh, 15 giáo viên, 1 quản trị. Email .test là bí danh, không nhận email khôi phục.",
  "Đăng nhập học sinh có thể dùng LMS-THPT:HS0001 … LMS-THPT:HS0200 hoặc email.",
  "", "| Vai trò | Họ tên | Email | Mã học sinh | Mật khẩu |", "|---|---|---|---|---|",
  ...manifest.accounts.map(a=>`| ${a.role} | ${a.full_name} | ${a.email} | ${a.student_code||""} | ${a.password} |`),"",
].join("\n"),{mode:0o600});
if(createAuth){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error("Server-side service key is required");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const existing=await db.auth.admin.listUsers({perPage:1000,page:1});
  if(existing.error)throw new Error(`Auth inventory failed (${existing.error.status})`);
  const byEmail=new Map(existing.data.users.map(u=>[u.email,u.id]));
  const planned=new Set(manifest.accounts.map(a=>a.email));
  if(existing.data.users.some(u=>!planned.has(u.email)))throw new Error("Unexpected Auth users: refusing to seed a non-clean project");
  let next=0,completed=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<manifest.accounts.length){
      const account=manifest.accounts[next++];
      let id=byEmail.get(account.email);
      if(!id){
        const result=await db.auth.admin.createUser({email:account.email,password:account.password,email_confirm:true,user_metadata:{full_name:account.full_name,role:account.role}});
        if(result.error||!result.data.user)throw new Error(`Auth provisioning failed at account ${next} (${result.error?.status||"unknown"}); credentials retained locally for retry`);
        id=result.data.user.id;
      }
      account.authId=id;save();completed++;
      if(completed%25===0)console.log(JSON.stringify({authAccountsReady:completed,total:manifest.accounts.length}));
    }
  }));
}
console.log(JSON.stringify({projectRef:ref,authProvisioningRequested:createAuth,accounts:manifest.accounts.length,credentialsFile:".local/TAI_KHOAN_MOI.md",seedFile:".local/single-school-seed.sql"}));
