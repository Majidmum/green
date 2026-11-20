"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, addressSchema, reviewSchema } from "@/lib/validations/account";

const GENERIC = "Не удалось сохранить. Попробуйте ещё раз.";

async function authed() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Войдите в аккаунт" };
  return { supabase, user };
}

function firstIssue(parsed) {
  return parsed.error.issues[0]?.message ?? "Проверьте данные";
}

// Из сообщения Postgres оставляем только то, что мы написали по-русски в RAISE EXCEPTION
function ours(error, fallback = GENERIC) {
  const m = String(error?.message ?? "");
  return /[А-Яа-яЁё]/.test(m) && !/row-level security|violates/i.test(m) ? m : fallback;
}

export async function updateProfile(input) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
  const a = await authed();
  if (a.error) return { ok: false, error: a.error };
  const { error } = await a.supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone })
    .eq("id", a.user.id);
  if (error) return { ok: false, error: GENERIC };
  revalidatePath("/profile");
  return { ok: true };
}

export async function saveAddress(input) {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
  const a = await authed();
  if (a.error) return { ok: false, error: a.error };
  const { id, is_default, ...fields } = parsed.data;
  const row = {
    ...fields,
    house: fields.house || null, apartment: fields.apartment || null,
    entrance: fields.entrance || null, floor: fields.floor || null, note: fields.note || null,
  };

  if (is_default) {
    await a.supabase.from("addresses").update({ is_default: false }).eq("user_id", a.user.id);
  }
  const res = id
    ? await a.supabase.from("addresses").update({ ...row, is_default: Boolean(is_default) }).eq("id", id).eq("user_id", a.user.id)
    : await a.supabase.from("addresses").insert({ ...row, user_id: a.user.id, is_default: Boolean(is_default) });
  if (res.error) return { ok: false, error: GENERIC };
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteAddress(id) {
  const a = await authed();
  if (a.error) return { ok: false, error: a.error };
  const { error } = await a.supabase.from("addresses").delete().eq("id", id).eq("user_id", a.user.id);
  if (error) return { ok: false, error: GENERIC };
  revalidatePath("/profile");
  return { ok: true };
}

export async function setDefaultAddress(id) {
  const a = await authed();
  if (a.error) return { ok: false, error: a.error };
  await a.supabase.from("addresses").update({ is_default: false }).eq("user_id", a.user.id);
  const { error } = await a.supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", a.user.id);
  if (error) return { ok: false, error: GENERIC };
  revalidatePath("/profile");
  return { ok: true };
}

export async function cancelOrder(orderId, reason) {
  const a = await authed();
  if (a.error) return { ok: false, error: a.error };
  const { error } = await a.supabase.rpc("cancel_my_order", {
    p_order_id: orderId,
    p_reason: String(reason ?? "").slice(0, 300) || null,
  });
  if (error) return { ok: false, error: ours(error, "Не удалось отменить заказ") };
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function saveReview(input) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
  const a = await authed();
  if (a.error) return { ok: false, error: a.error };
  const v = parsed.data;

  // Фото принимаем только из собственной папки bucket review-photos
  if (v.photo_url && !v.photo_url.includes(`/review-photos/${a.user.id}/`)) {
    return { ok: false, error: "Недопустимая ссылка на фото" };
  }
  const row = { rating: v.rating, body: v.body || null, photo_url: v.photo_url || null };

  const { data: existing } = await a.supabase
    .from("product_reviews").select("id").eq("product_id", v.product_id).eq("user_id", a.user.id).maybeSingle();
  const res = existing
    ? await a.supabase.from("product_reviews").update(row).eq("id", existing.id)
    : await a.supabase.from("product_reviews").insert({ ...row, product_id: v.product_id, user_id: a.user.id });
  if (res.error) {
    const denied = /row-level security/i.test(res.error.message);
    return { ok: false, error: denied ? "Отзыв можно оставить только на товар из доставленного заказа" : GENERIC };
  }
  revalidatePath("/my-reviews");
  revalidatePath("/orders");
  return { ok: true, pending: true };
}

export async function deleteReview(id) {
  const a = await authed();
  if (a.error) return { ok: false, error: a.error };
  const { error } = await a.supabase.from("product_reviews").delete().eq("id", id).eq("user_id", a.user.id);
  if (error) return { ok: false, error: GENERIC };
  revalidatePath("/my-reviews");
  return { ok: true };
}
