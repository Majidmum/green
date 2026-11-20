"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetSchema } from "@/lib/validations/auth";
import { translateAuthError } from "@/lib/utils/auth-errors";
import FormField from "@/components/auth/FormField";

export default function ForgotForm() {
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema) });

  async function onSubmit({ email }) {
    setServerError("");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    // Лимиты показываем; остальные ответы не раскрывают, есть ли такой email в системе
    if (error && /rate limit|too many/i.test(error.message)) {
      setServerError(translateAuthError(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
          <MailCheck size={28} />
        </span>
        <p className="text-sm text-brand-ink/70">
          Если аккаунт с таким email существует, мы отправили на него ссылку для смены пароля.
        </p>
        <Link href="/login" className="btn-outline w-full">Вернуться ко входу</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className="input" aria-describedby="email-error" {...register("email")} />
      </FormField>
      {serverError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Отправляем…" : "Отправить ссылку"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-brand hover:underline">Вернуться ко входу</Link>
      </p>
    </form>
  );
}
