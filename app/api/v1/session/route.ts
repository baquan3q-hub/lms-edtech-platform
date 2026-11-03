import { cookies } from "next/headers";
import { z } from "zod";
import { api, jsonBody, requireSameOrigin } from "@/lib/api/http";
import { requireActorContext, AccessError } from "@/lib/auth/actor-context";

export async function GET() {
  return api(async () => {
    const actor = await requireActorContext();
    return { userId: actor.userId, schoolId: actor.schoolId, role: actor.currentRole, roles: actor.roles };
  });
}
export async function PATCH(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    const input = await jsonBody(request, z.object({ schoolId: z.uuid(), role: z.enum(["admin", "teacher", "student", "parent"]) }).strict());
    const actor = await requireActorContext(undefined, input.schoolId);
    if (!actor.roles.includes(input.role)) throw new AccessError(403);
    const store = await cookies();
    const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 21600 };
    store.set("lms-school-id", input.schoolId, options);
    store.set("lms-role", input.role, options);
    return { schoolId: input.schoolId, role: input.role };
  });
}
