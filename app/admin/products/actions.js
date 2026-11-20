"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { productSchema } from "@/lib/validations/product";
import { adminOnly, dbError } from "@/lib/admin/guard";

const uuid = z.string().uuid();

function revalidate(id) {
  revalidatePath("/admin/products");
  if (id) revalidatePath(`/admin/products/${id}`);
  revalidatePath("/catalog");
  revalidatePath("/");
}

export async function saveProduct(id, values) {
  if (id && !uuid.safeParse(id).success) return { ok: false, error: "Неверный товар" };
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i.message, field: i.path[0] };
  }
  const { supabase } = await adminOnly();
  const { cost, ...v } = parsed.data;
  const row = {
    ...v,
    description: v.description || null,
    country_of_origin: v.country_of_origin || null,
    old_price: v.old_price ?? null,
    min_stock: v.min_stock ?? 0,
  };

  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return { ok: false, error: dbError(error), field: error.code === "23505" ? "slug" : undefined };
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error) return { ok: false, error: dbError(error), field: error.code === "23505" ? "slug" : undefined };
    productId = data.id;
  }

  if (cost !== null && cost !== undefined) {
    const { error } = await supabase.rpc("set_product_cost", { p_product_id: productId, p_cost: cost, p_reason: "Изменено в карточке товара" });
    if (error) return { ok: false, error: `Товар сохранён, но закупочную цену изменить не удалось: ${dbError(error)}`, id: productId };
  }
  revalidate(productId);
  return { ok: true, id: productId };
}

// Товар с историей движений удалить нельзя (журнал склада неизменяем) — тогда скрываем его с витрины.
export async function deleteProduct(id) {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Неверный товар" };
  const { supabase } = await adminOnly();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503" || /violates|restrict/i.test(error.message)) {
      const { error: e2 } = await supabase.from("products").update({ is_active: false }).eq("id", id);
      if (e2) return { ok: false, error: dbError(e2) };
      revalidate(id);
      return { ok: true, hidden: true };
    }
    return { ok: false, error: dbError(error) };
  }
  revalidate();
  return { ok: true };
}

export async function addProductImage({ productId, url, path }) {
  const p = z.object({ productId: uuid, url: z.string().url().max(600), path: z.string().max(300) }).safeParse({ productId, url, path });
  if (!p.success) return { ok: false, error: "Неверные данные" };
  const { supabase } = await adminOnly();
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId, url: p.data.url, storage_path: p.data.path, sort_order: count ?? 0, is_primary: (count ?? 0) === 0,
  });
  if (error) return { ok: false, error: dbError(error) };
  revalidate(productId);
  return { ok: true };
}

export async function setPrimaryImage({ productId, imageId }) {
  if (!uuid.safeParse(productId).success || !uuid.safeParse(imageId).success) return { ok: false, error: "Неверные данные" };
  const { supabase } = await adminOnly();
  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  const { error } = await supabase.from("product_images").update({ is_primary: true, sort_order: -1 }).eq("id", imageId).eq("product_id", productId);
  if (error) return { ok: false, error: dbError(error) };
  revalidate(productId);
  return { ok: true };
}

export async function deleteProductImage({ productId, imageId }) {
  if (!uuid.safeParse(productId).success || !uuid.safeParse(imageId).success) return { ok: false, error: "Неверные данные" };
  const { supabase } = await adminOnly();
  const { data: img } = await supabase.from("product_images").select("id,storage_path,is_primary").eq("id", imageId).eq("product_id", productId).maybeSingle();
  if (!img) return { ok: false, error: "Фото не найдено" };
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: dbError(error) };
  if (img.storage_path) await supabase.storage.from("product-images").remove([img.storage_path]);
  if (img.is_primary) {
    const { data: rest } = await supabase.from("product_images").select("id").eq("product_id", productId).order("sort_order").limit(1);
    if (rest?.[0]) await supabase.from("product_images").update({ is_primary: true }).eq("id", rest[0].id);
  }
  revalidate(productId);
  return { ok: true };
}
