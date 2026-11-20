"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminOnly, dbError } from "@/lib/admin/guard";

const uuid = z.string().uuid();
const qty = z.number().positive("Количество должно быть больше 0").max(10000000);

function done() {
  revalidatePath("/admin/stock", "layout");
  revalidatePath("/admin");
  revalidatePath("/catalog");
}

export async function receiveStock(input) {
  const p = z.object({
    supplierId: uuid.nullable(),
    document: z.string().trim().min(1, "Укажите номер документа").max(60),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату"),
    comment: z.string().trim().max(300).optional(),
    items: z.array(z.object({ product_id: uuid, quantity: qty, unit_cost: z.number().min(0, "Закупочная цена не может быть отрицательной").max(10000000) })).min(1, "Добавьте хотя бы одну позицию").max(300),
  }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { supabase } = await adminOnly();
  const { data, error } = await supabase.rpc("receive_stock", {
    p_supplier_id: p.data.supplierId, p_document_number: p.data.document, p_date: p.data.date,
    p_comment: p.data.comment || null, p_items: p.data.items,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Такой приходный документ уже вводился (поставщик + номер + товар)" };
    return { ok: false, error: dbError(error, "Не удалось провести приход") };
  }
  done();
  return { ok: true, count: data };
}

export async function writeOff(input) {
  const p = z.object({
    productId: uuid, quantity: qty,
    reason: z.enum(["spoilage", "loss", "supplier_return", "other"]),
    comment: z.string().trim().max(300).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    supplierId: uuid.nullable().optional(),
  }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { supabase } = await adminOnly();
  const { error } = await supabase.rpc("write_off_stock", {
    p_product_id: p.data.productId, p_quantity: p.data.quantity, p_reason: p.data.reason,
    p_comment: p.data.comment || null, p_date: p.data.date || null, p_supplier_id: p.data.supplierId ?? null,
  });
  if (error) return { ok: false, error: dbError(error, "Не удалось списать товар") };
  done();
  return { ok: true };
}

export async function runStocktake(input) {
  const p = z.object({
    comment: z.string().trim().max(300).optional(),
    items: z.array(z.object({ product_id: uuid, actual_quantity: z.number().min(0, "Количество не может быть отрицательным").max(10000000), expected_quantity: z.number().min(0) })).min(1, "Укажите фактическое количество хотя бы у одного товара").max(2000),
  }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { supabase } = await adminOnly();
  const { data, error } = await supabase.rpc("stocktake", { p_items: p.data.items, p_comment: p.data.comment || null });
  if (error) {
    if (error.code === "40001") return { ok: false, error: dbError(error), stale: true };
    return { ok: false, error: dbError(error, "Не удалось провести инвентаризацию") };
  }
  done();
  return { ok: true, result: data };
}
