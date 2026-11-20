"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminOnly, dbError } from "@/lib/admin/guard";

const s = (max) => z.string().trim().max(max);
const storeInfo = z.object({
  name: s(80).min(1, "Укажите название магазина"),
  phone: s(40), whatsapp: s(40), telegram: s(80),
  email: s(120).refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Введите корректный email"),
  address: s(200), working_hours: s(120), city: s(60),
});
const slots = z.array(z.string().trim().regex(/^\d{2}:\d{2}[–-]\d{2}:\d{2}$/, "Формат интервала: 09:00–12:00")).min(1, "Добавьте хотя бы один интервал").max(12);
const legal = z.object({ title: s(120).min(1, "Укажите заголовок"), body: s(60000) });

export const LEGAL_SLUGS = ["offer", "privacy-policy", "terms", "delivery"];

export async function saveSetting(key, value) {
  let schema;
  let publicPath = "/";
  if (key === "store_info") { schema = storeInfo; publicPath = "/contacts"; }
  else if (key === "time_slots") { schema = slots; publicPath = "/checkout"; }
  else if (key.startsWith("page:") && LEGAL_SLUGS.includes(key.slice(5))) { schema = legal; publicPath = `/${key.slice(5)}`; }
  else return { ok: false, error: "Неизвестная настройка" };

  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await adminOnly();
  const { error } = await supabase.from("store_settings").upsert(
    { key, value: parsed.data, is_public: true, updated_by: user.id },
    { onConflict: "key" }
  );
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(publicPath);
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true };
}
