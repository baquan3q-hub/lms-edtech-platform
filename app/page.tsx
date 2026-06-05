import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPageClient from "@/components/shared/LandingPageClient";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPageClient />;
  }

  // Nếu đã login → redirect về dashboard theo role từ user_metadata
  const role = user.user_metadata?.role || "student";
  const routes: Record<string, string> = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
  };

  redirect(routes[role] || "/login");
}
