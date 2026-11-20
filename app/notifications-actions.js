"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/roles";

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireRole(["admin", "manager"]);
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  if (error) return { ok: false, error: "Не удалось отметить уведомления" };
  revalidatePath("/admin", "layout");
  revalidatePath("/manager", "layout");
  return { ok: true };
}
