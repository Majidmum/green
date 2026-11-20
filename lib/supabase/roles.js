import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Серверная проверка роли. Вызывать в начале каждого admin/manager layout,
// Server Action и Route Handler: middleware — первый рубеж, а не единственный.
export async function requireRole(allowed) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || !allowed.includes(profile.role)) redirect("/");
  return { supabase, user, profile };
}
