"use server";

import { createClient } from "@/lib/supabase/server";
import { orderRequestSchema } from "@/lib/validations/checkout";
import { buildOrderPayload, formatAddress, mapRpcError } from "@/lib/orders/payload";
import { notifyTelegram } from "@/lib/notify/telegram";

/**
 * Оформление заказа. Выполняется на сервере:
 *  1. повторная валидация данных (клиентской валидации доверять нельзя);
 *  2. проверка сессии;
 *  3. адрес берётся из БД (если выбран сохранённый) — чужой address_id не пройдёт из-за RLS;
 *  4. заказ создаёт RPC create_order: цены, остатки, промокод и доставка пересчитываются в БД
 *     в одной транзакции; цены из браузера не используются вообще.
 */
export async function placeOrder(input) {
  const parsed = orderRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Проверьте правильность заполнения формы", fields };
  }
  const v = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Войдите в аккаунт, чтобы оформить заказ", needLogin: true };

  let addressText = null;
  let addressId = null;

  if (v.delivery_type === "delivery") {
    if (v.address_mode === "saved") {
      const { data: saved } = await supabase
        .from("addresses")
        .select("id,city,street,house,apartment,entrance,floor,note")
        .eq("id", v.address_id)
        .maybeSingle();
      if (!saved) return { ok: false, error: "Выбранный адрес не найден", fields: { address_id: "Выберите адрес" } };
      addressText = formatAddress(saved);
      addressId = saved.id;
    } else {
      const parts = {
        city: "Душанбе",
        street: v.street,
        house: v.house,
        apartment: v.apartment,
        entrance: v.entrance,
        floor: v.floor,
        note: v.address_note,
      };
      addressText = formatAddress(parts);
      if (v.save_address) {
        // Сохранение адреса — удобство, а не условие заказа: сбой не должен его блокировать
        const { data: created } = await supabase
          .from("addresses")
          .insert({
            user_id: user.id,
            label: "Адрес из заказа",
            city: "Душанбе",
            street: v.street,
            house: v.house || null,
            apartment: v.apartment || null,
            entrance: v.entrance || null,
            floor: v.floor || null,
            note: v.address_note || null,
          })
          .select("id")
          .maybeSingle();
        addressId = created?.id ?? null;
      }
    }
  }

  const payload = buildOrderPayload(v, { addressText, addressId });
  const { data, error } = await supabase.rpc("create_order", { p: payload });
  if (error) {
    const m = mapRpcError(error);
    return { ok: false, error: m.message, needLogin: Boolean(m.needLogin) };
  }

  if (!data.duplicate) {
    await notifyTelegram(
      [
        `Новый заказ ${data.order_number}`,
        `Сумма: ${data.total} сом.`,
        v.delivery_type === "delivery" ? `Доставка: ${addressText}` : "Самовывоз",
        `Клиент: ${v.customer_name}, ${v.customer_phone}`,
      ].join("\n")
    );
  }

  return {
    ok: true,
    orderId: data.order_id,
    orderNumber: data.order_number,
    total: data.total,
    duplicate: Boolean(data.duplicate),
  };
}
