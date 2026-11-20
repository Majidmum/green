export const CURRENCY = "TJS";
export const CURRENCY_LABEL = "сом.";

export const ROLES = Object.freeze({
  CUSTOMER: "customer",
  ADMIN: "admin",
  MANAGER: "manager",
});

// Какие роли допускаются в какой раздел
export const ROUTE_ROLES = Object.freeze({
  "/admin": [ROLES.ADMIN],
  "/manager": [ROLES.MANAGER],
});

export const ORDER_STATUSES = Object.freeze([
  { value: "pending", label: "Заказ принят" },
  { value: "confirmed", label: "Подтверждён" },
  { value: "assembling", label: "Собирается" },
  { value: "ready", label: "Готов к отправке" },
  { value: "handed_to_courier", label: "Передан курьеру" },
  { value: "on_the_way", label: "В пути" },
  { value: "delivered", label: "Доставлен" },
  { value: "cancelled", label: "Отменён" },
]);

export const UNITS = Object.freeze([
  { value: "kg", label: "кг", fractional: true },
  { value: "g", label: "г", fractional: true },
  { value: "pcs", label: "шт.", fractional: false },
  { value: "pack", label: "упаковка", fractional: false },
]);

export const WRITE_OFF_REASONS = Object.freeze([
  { value: "spoilage", label: "Порча" },
  { value: "loss", label: "Потери" },
  { value: "supplier_return", label: "Возврат поставщику" },
  { value: "other", label: "Другое" },
]);

export const PAYMENT_METHODS = Object.freeze([
  { value: "cash_on_delivery", label: "Наличными при доставке" },
  { value: "pay_on_pickup", label: "Оплата при самовывозе" },
]);

export const LOCALES = Object.freeze(["ru", "tg", "en"]);
export const DEFAULT_LOCALE = "ru";
