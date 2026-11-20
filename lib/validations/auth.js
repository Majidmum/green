import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{9,18}$/, "Введите корректный номер телефона");

export const loginSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Введите имя"),
    phone,
    email: z.string().trim().email("Введите корректный email"),
    password: z.string().min(8, "Минимум 8 символов"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Пароли не совпадают",
  });

export const resetSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Минимум 8 символов"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Пароли не совпадают",
  });
