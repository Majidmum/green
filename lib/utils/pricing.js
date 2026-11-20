// Предварительный расчёт итогов для корзины и оформления.
// Источник истины — функция create_order в БД: здесь та же логика, но только для показа.

const round2 = (n) => Math.round(Number(n) * 100) / 100;

export function calcTotals({ subtotal, promoDiscount = 0, zone = null, deliveryType = "delivery" }) {
  const sub = round2(subtotal || 0);
  const discount = Math.min(round2(promoDiscount || 0), sub);

  let fee = 0;
  let minOrder = 0;
  let belowMin = false;
  if (deliveryType === "delivery" && zone) {
    const freeFrom = zone.free_delivery_from;
    // Как в БД: бесплатная доставка и минимальная сумма считаются по сумме товаров до промокода
    fee = freeFrom !== null && freeFrom !== undefined && sub >= Number(freeFrom) ? 0 : Number(zone.delivery_fee || 0);
    minOrder = Number(zone.min_order_total || 0);
    belowMin = sub < minOrder;
  }
  return {
    subtotal: sub,
    discount,
    fee: round2(fee),
    total: round2(Math.max(sub - discount, 0) + fee),
    minOrder,
    belowMin,
  };
}
