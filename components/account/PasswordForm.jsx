"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/validations/account";
import { translateAuthError } from "@/lib/utils/auth-errors";
import FormField from "@/components/auth/FormField";

export default function PasswordForm() {
  const [msg, setMsg] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  async function onSubmit({ password }) {
    setMsg(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) return setMsg({ ok: false, text: translateAuthError(error) });
    reset();
    setMsg({ ok: true, text: "Пароль изменён" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="pw-new" label="Новый пароль" error={errors.password?.message}>
          <input id="pw-new" type="password" autoComplete="new-password" className="input" {...register("password")} />
        </FormField>
        <FormField id="pw-confirm" label="Повторите пароль" error={errors.confirm?.message}>
          <input id="pw-confirm" type="password" autoComplete="new-password" className="input" {...register("confirm")} />
        </FormField>
      </div>
      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-tint text-heading" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}
      <button className="btn-outline" disabled={isSubmitting}>{isSubmitting ? "Сохраняем…" : "Изменить пароль"}</button>
    </form>
  );
}
