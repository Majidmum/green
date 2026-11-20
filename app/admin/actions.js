"use server";

import { revalidatePath } from "next/cache";
import { RESOURCES } from "@/lib/admin/resources";
import { buildSchema, toRow } from "@/lib/admin/schema";
import { adminOnly, dbError } from "@/lib/admin/guard";

export async function saveResource(key, id, values) {
  const res = RESOURCES[key];
  if (!res) return { ok: false, error: "Неизвестный раздел" };
  const { supabase, user } = await adminOnly();

  const parsed = buildSchema(res).safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path[0] };
  }
  const row = toRow(res, parsed.data);
  if (key === "categories" && id && row.parent_id === id) return { ok: false, error: "Категория не может быть родителем самой себя", field: "parent_id" };

  let q;
  if (id) q = supabase.from(res.table).update(row).eq("id", id);
  else q = supabase.from(res.table).insert(res.createdBy ? { ...row, created_by: user.id } : row);
  const { error } = await q;
  if (error) {
    const field = error.code === "23505" ? (key === "promo_codes" ? "code" : "slug") : undefined;
    return { ok: false, error: dbError(error), field };
  }
  revalidatePath(`/admin/${key}`);
  return { ok: true };
}

export async function deleteResource(key, id) {
  const res = RESOURCES[key];
  if (!res) return { ok: false, error: "Неизвестный раздел" };
  const { supabase } = await adminOnly();

  // Расходы не удаляются — только аннулируются (финансовая история сохраняется)
  const { error, count } = res.voidInsteadOfDelete
    ? await supabase.from(res.table).update({ is_voided: true }, { count: "exact" }).eq("id", id)
    : await supabase.from(res.table).delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  if (!count) return { ok: false, error: "Запись не найдена" };
  revalidatePath(`/admin/${key}`);
  return { ok: true };
}
