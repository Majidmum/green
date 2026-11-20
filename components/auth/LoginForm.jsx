"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";
import { translateAuthError } from "@/lib/utils/auth-errors";
import { safeNext } from "@/lib/utils/safe-redirect";
import FormField from "@/components/auth/FormField";

export default function LoginForm({ next = "/", notice = "" }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    setServerError("");
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) {
      setServerError(translateAuthError(error));
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {notice && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">{notice}</p>}
      <FormField id="email" label="Email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className="input" aria-describedby="email-error" {...register("email")} />
      </FormField>
      <FormField id="password" label="Пароль" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="current-password" className="input" aria-describedby="password-error" {...register("password")} />
      </FormField>
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-brand hover:underline">Забыли пароль?</Link>
      </div>
      {serverError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Входим…" : "Войти"}
      </button>
      <p className="text-center text-sm text-brand-ink/70">
        Нет аккаунта?{" "}
        <Link href={`/register${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
