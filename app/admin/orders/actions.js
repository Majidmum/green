"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminOnly, dbError } from "@/lib/admin/guard";

const STATUSES = ["pending", "confirmed", "assembling", "ready", "handed_to_courier", "on_the_way", "delivered", "cancelled"];
const uuid = z.string().uuid();

function done(orderId) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}

export async function changeOrderStatus({ orderId, status, note, courierName, courierPhone }) {
  const p = z.object({
    orderId: uuid,
    status: z.enum(STATUSES),
    note: z.string().trim().max(300).optional(),
    courierName: z.string().trim().max(80).optional(),
    courierPhone: z.string().trim().max(30).optional(),
  }).safeParse({ orderId, status, note, courierName, courierPhone });
  if (!p.success) return { ok: false, error: "Проверьте данные" };
  const { supabase } = await adminOnly();
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: p.data.orderId,
    p_status: p.data.status,
    p_note: p.data.note || null,
    p_courier_name: p.data.courierName || null,
    p_courier_phone: p.data.courierPhone || null,
  });
  if (error) return { ok: false, error: dbError(error, "Не удалось изменить статус") };
  done(orderId);
  return { ok: true };
}

export async function assignCourier({ orderId, name, phone }) {
  const p = z.object({ orderId: uuid, name: z.string().trim().min(2, "Укажите имя курьера").max(80), phone: z.string().trim().max(30).optional() }).safeParse({ orderId, name, phone });
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { supabase } = await adminOnly();
  const { error } = await supabase.rpc("assign_courier", { p_order_id: p.data.orderId, p_name: p.data.name, p_phone: p.data.phone || null });
  if (error) return { ok: false, error: dbError(error, "Не удалось назначить курьера") };
  done(orderId);
  return { ok: true };
}

export async function returnItems({ orderId, items, restock, reason }) {
  const p = z.object({
    orderId: uuid,
    items: z.array(z.object({ order_item_id: uuid, quantity: z.number().positive() })).min(1, "Выберите товары для возврата"),
    restock: z.boolean(),
    reason: z.string().trim().max(300).optional(),
  }).safeParse({ orderId, items, restock, reason });
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { supabase } = await adminOnly();
  const { data, error } = await supabase.rpc("return_order_items", {
    p_order_id: p.data.orderId, p_items: p.data.items, p_restock: p.data.restock, p_reason: p.data.reason || null,
  });
  if (error) return { ok: false, error: dbError(error, "Не удалось оформить возврат") };
  done(orderId);
  return { ok: true, refund: data };
}
