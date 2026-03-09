import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Nếu đã login → redirect về dashboard theo role (dùng Admin Client để bypass RLS)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  const { data: userData } = await adminSupabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = userData?.role || "student";
  const routes: Record<string, string> = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
  };

  redirect(routes[role] || "/login");
}
