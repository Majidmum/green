"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminOnly, dbError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserRole({ userId, role, active }) {
  const p = z.object({ userId: z.string().uuid(), role: z.enum(["customer", "admin", "manager"]), active: z.boolean() }).safeParse({ userId, role, active });
  if (!p.success) return { ok: false, error: "Неверные данные" };
  const { supabase, user } = await adminOnly();
  if (p.data.userId === user.id) return { ok: false, error: "Нельзя изменить собственную роль или заблокировать себя" };

  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: p.data.userId, p_role: p.data.role, p_active: p.data.active });
  if (error) return { ok: false, error: dbError(error, "Не удалось изменить пользователя") };

  // Блокировка закрывает и вход: бан в Supabase Auth (нужен service role, он остаётся только на сервере)
  let warning;
  try {
    const { error: banErr } = await createAdminClient().auth.admin.updateUserById(p.data.userId, { ban_duration: p.data.active ? "none" : "876000h" });
    if (banErr) warning = "Роль изменена, но вход в Auth заблокировать не удалось. Проверьте SUPABASE_SERVICE_ROLE_KEY.";
  } catch {
    warning = "Роль изменена, но вход в Auth заблокировать не удалось. Проверьте SUPABASE_SERVICE_ROLE_KEY.";
  }
  revalidatePath("/admin/users");
  return { ok: true, warning };
}
