// Чистые функции без импортов: используются Server Action и тестами БД.

export function formatAddress(a = {}) {
  const parts = [
    a.city || "Душанбе",
    a.street,
    a.house ? `д. ${a.house}` : null,
    a.apartment ? `кв. ${a.apartment}` : null,
    a.entrance ? `подъезд ${a.entrance}` : null,
    a.floor ? `этаж ${a.floor}` : null,
  ].filter((x) => x && String(x).trim());
  const base = parts.join(", ");
  return a.note && String(a.note).trim() ? `${base} (${String(a.note).trim()})` : base;
}

// Собирает аргумент p для RPC create_order из провалидированного запроса.
export function buildOrderPayload(v, { addressText = null, addressId = null } = {}) {
  const delivery = v.delivery_type === "delivery";
  return {
    items: v.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    delivery_type: v.delivery_type,
    payment_method: delivery ? "cash_on_delivery" : "pay_on_pickup",
    delivery_zone_id: delivery ? v.delivery_zone_id : null,
    delivery_address: delivery ? addressText : null,
    address_id: delivery ? addressId : null,
    delivery_date: v.delivery_date,
    delivery_time_slot: v.delivery_time_slot || null,
    comment: v.comment || null,
    promo_code: v.promo_code || null,
    customer_name: v.customer_name,
    customer_phone: v.customer_phone,
    idempotency_key: v.idempotency_key,
  };
}

// Из ошибки Postgres/PostgREST оставляет только сообщения, написанные для пользователя
// (наши RAISE EXCEPTION на русском). Технические детали наружу не отдаём.
export function mapRpcError(error) {
  const code = error?.code;
  const message = String(error?.message ?? "");
  if (code === "28000") return { message: "Войдите в аккаунт, чтобы оформить заказ", needLogin: true };
  if (code === "42501") return { message: "Этот аккаунт не может оформлять заказы. Свяжитесь с магазином." };
  const ours = ["P0001", "23514"].includes(code) && /[А-Яа-яЁё]/.test(message);
  if (ours) return { message };
  return { message: "Не удалось оформить заказ. Попробуйте ещё раз." };
}
