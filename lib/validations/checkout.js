import { z } from "zod";

const optional = (max) => z.string().trim().max(max).optional().or(z.literal(""));

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{9,18}$/, "Введите корректный номер телефона");

// Поля формы оформления (общие для клиента и сервера)
const base = z.object({
  delivery_type: z.enum(["delivery", "pickup"]),
  delivery_zone_id: optional(64),
  address_mode: z.enum(["saved", "new"]).default("new"),
  address_id: optional(64),
  street: optional(200),
  house: optional(30),
  apartment: optional(30),
  entrance: optional(30),
  floor: optional(30),
  address_note: optional(200),
  save_address: z.boolean().optional(),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите дату"),
  delivery_time_slot: optional(40),
  comment: optional(500),
  customer_name: z.string().trim().min(2, "Введите имя").max(100),
  customer_phone: phone,
});

function rules(v, ctx) {
  if (v.delivery_type !== "delivery") return;
  if (!v.delivery_zone_id) {
    ctx.addIssue({ code: "custom", path: ["delivery_zone_id"], message: "Выберите район доставки" });
  }
  if (v.address_mode === "saved") {
    if (!v.address_id) ctx.addIssue({ code: "custom", path: ["address_id"], message: "Выберите адрес" });
  } else if (!v.street || v.street.trim().length < 3) {
    ctx.addIssue({ code: "custom", path: ["street"], message: "Укажите улицу" });
  }
}

export const checkoutFormSchema = base.superRefine(rules);

// Запрос к Server Action: форма + корзина + ключ идемпотентности
export const orderRequestSchema = base
  .extend({
    items: z
      .array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().positive().max(10000),
        })
      )
      .min(1, "Корзина пуста")
      .max(100),
    promo_code: optional(40),
    idempotency_key: z.string().min(8).max(100),
  })
  .superRefine(rules);
