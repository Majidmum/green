import { z } from "zod";

const num = (schema) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? null : typeof v === "string" ? Number(v.replace(",", ".")) : v), schema);

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Введите название").max(120),
    slug: z.string().trim().min(2, "Укажите адрес").max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Латиница, цифры и дефисы"),
    category_id: z.string().uuid("Выберите категорию"),
    description: z.string().trim().max(3000).optional().or(z.literal("")),
    price: num(z.number({ invalid_type_error: "Введите цену", required_error: "Введите цену" }).min(0, "Цена не может быть отрицательной").max(1000000)),
    old_price: num(z.number().min(0).max(1000000).nullable()),
    unit: z.enum(["kg", "g", "pcs", "pack"]),
    step: num(z.number({ invalid_type_error: "Введите шаг", required_error: "Введите шаг" }).positive("Шаг должен быть больше 0").max(1000)),
    min_stock: num(z.number().min(0, "Не меньше 0").max(1000000).nullable()),
    country_of_origin: z.string().trim().max(80).optional().or(z.literal("")),
    is_active: z.boolean(),
    is_featured: z.boolean(),
    is_new: z.boolean(),
    is_seasonal: z.boolean(),
    cost: num(z.number().min(0, "Не меньше 0").max(1000000).nullable()),
  })
  .superRefine((v, ctx) => {
    if (v.old_price !== null && v.old_price !== undefined && v.old_price <= v.price) {
      ctx.addIssue({ code: "custom", path: ["old_price"], message: "Старая цена должна быть выше текущей (или оставьте пустой)" });
    }
  });
