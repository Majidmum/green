"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminOnly, dbError } from "@/lib/admin/guard";

export async function moderateReview({ id, status }) {
  const p = z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected", "pending"]) }).safeParse({ id, status });
  if (!p.success) return { ok: false, error: "Неверные данные" };
  const { supabase } = await adminOnly();
  const { error, count } = await supabase.from("product_reviews").update({ status: p.data.status }, { count: "exact" }).eq("id", p.data.id);
  if (error) return { ok: false, error: dbError(error) };
  if (!count) return { ok: false, error: "Отзыв не найден" };
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  return { ok: true };
}

export async function removeReview(id) {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Неверные данные" };
  const { supabase } = await adminOnly();
  const { error, count } = await supabase.from("product_reviews").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  if (!count) return { ok: false, error: "Отзыв не найден" };
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  return { ok: true };
}
