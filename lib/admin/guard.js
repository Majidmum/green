import "server-only";
import { requireRole } from "@/lib/supabase/roles";

// Каждое действие админки начинается с проверки роли на сервере.
export async function adminOnly() {
  return requireRole(["admin"]);
}

export function dbError(error, fallback = "Не удалось сохранить. Попробуйте ещё раз.") {
  const m = String(error?.message ?? "");
  if (error?.code === "23505") return "Такое значение уже существует";
  if (error?.code === "23503") return "Запись используется в других данных — удалить нельзя";
  if (error?.code === "23514") return "Проверьте значения полей";
  if (error?.code === "42501" || /row-level security/i.test(m)) return "Недостаточно прав";
  if (/[А-Яа-яЁё]/.test(m) && !/violates/i.test(m)) return m;
  return fallback;
}
