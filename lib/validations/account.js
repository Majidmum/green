import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{9,18}$/, "Введите корректный номер телефона");

const opt = (max) => z.string().trim().max(max).optional().or(z.literal(""));

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Введите имя").max(100),
  phone,
});

export const addressSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  label: z.string().trim().min(1, "Укажите название").max(40),
  city: z.string().trim().min(2, "Укажите город").max(60),
  street: z.string().trim().min(3, "Укажите улицу").max(200),
  house: opt(30),
  apartment: opt(30),
  entrance: opt(30),
  floor: opt(30),
  note: opt(200),
  is_default: z.boolean().optional(),
});

export const passwordSchema = z
  .object({
    password: z.string().min(8, "Минимум 8 символов"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Пароли не совпадают" });

export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1, "Поставьте оценку").max(5),
  body: z.string().trim().max(1500, "Не более 1500 символов").optional().or(z.literal("")),
  photo_url: z.string().url().max(500).optional().or(z.literal("")).nullable(),
});
