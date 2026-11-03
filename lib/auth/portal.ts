import "server-only";
import { redirect } from "next/navigation";
import { getActorContext, type Role } from "./actor-context";
import { getCurrentUserProfile } from "@/lib/supabase/auth";
import { checkAccountActivationStatus } from "./activation";

export async function requirePortalProfile(role: Role) {
  const [actor, profile] = await Promise.all([getActorContext(), getCurrentUserProfile()]);
  if (!profile) redirect("/login");
  if (!actor) {
    if (!(await checkAccountActivationStatus(profile.id)).isActivated) redirect("/activate");
    redirect("/access-denied");
  }
  if (actor.currentRole !== role && !(role === "admin" && actor.currentRole === "super_admin")) redirect(`/${actor.currentRole}`);
  return { ...profile, role: actor.currentRole };
}
