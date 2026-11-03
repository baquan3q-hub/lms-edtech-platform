/** Read-only metadata inventory. Never fetch rows, execute RPCs or apply SQL. */
import { loadEnvConfig } from "@next/env";
import { mkdirSync,writeFileSync } from "node:fs";
import path from "node:path";
import { root } from "./bootstrap.mjs";
loadEnvConfig(root,false);
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error("Supabase server configuration is required");
const response=await fetch(new URL("/rest/v1/",url),{
  headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:"application/openapi+json"},signal:AbortSignal.timeout(20000),
});
if(!response.ok)throw new Error(`Read-only metadata request failed (${response.status})`);
const schema=await response.json();
const resources=Object.fromEntries(Object.entries(schema.definitions||{}).map(([name,value])=>[name,Object.keys(value.properties||{}).sort()]));
const functions=Object.keys(schema.paths||{}).filter(name=>name.startsWith("/rpc/")).map(name=>name.slice(5)).sort();
const inventory={capturedAt:new Date().toISOString(),source:"Read-only PostgREST metadata; not a full RLS/trigger/function-body audit",resourceCount:Object.keys(resources).length,resources,functions};
mkdirSync(path.join(root,".local"),{recursive:true});
writeFileSync(path.join(root,".local/live-schema-inventory.json"),JSON.stringify(inventory,null,2));
console.log(JSON.stringify({resources:inventory.resourceCount,functions:functions.length,newReadModelInstalled:functions.includes("get_student_today"),output:".local/live-schema-inventory.json"}));
