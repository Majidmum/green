"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/auth";
import { translateAuthError } from "@/lib/utils/auth-errors";
import { safeNext } from "@/lib/utils/safe-redirect";
import FormField from "@/components/auth/FormField";

export default function RegisterForm({ next = "/" }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values) {
    setServerError("");
    const target = safeNext(next);
    const { data, error } = await createClient().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name, phone: values.phone },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
      },
    });
    if (error) {
      setServerError(translateAuthError(error));
      return;
    }
    // Supabase не сообщает об уже существующем email ошибкой: возвращается пользователь без identities
    if (data.user && data.user.identities?.length === 0) {
      setServerError("Этот email уже зарегистрирован. Войдите или восстановите пароль.");
      return;
    }
    if (data.session) {
      router.replace(target);
      router.refresh();
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tint text-brand">
          <MailCheck size={28} />
        </span>
        <h2 className="text-lg font-semibold">Проверьте почту</h2>
        <p className="text-sm text-body/70">
          Мы отправили письмо на <strong>{sentTo}</strong>. Перейдите по ссылке из письма, чтобы подтвердить аккаунт.
        </p>
        <Link href="/login" className="btn-outline w-full">Перейти ко входу</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="full_name" label="Имя" error={errors.full_name?.message}>
        <input id="full_name" autoComplete="name" className="input" aria-describedby="full_name-error" {...register("full_name")} />
      </FormField>
      <FormField id="phone" label="Телефон" error={errors.phone?.message}>
        <input id="phone" type="tel" autoComplete="tel" placeholder="+992 ..." className="input" aria-describedby="phone-error" {...register("phone")} />
      </FormField>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className="input" aria-describedby="email-error" {...register("email")} />
      </FormField>
      <FormField id="password" label="Пароль" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="new-password" className="input" aria-describedby="password-error" {...register("password")} />
      </FormField>
      <FormField id="confirm" label="Повторите пароль" error={errors.confirm?.message}>
        <input id="confirm" type="password" autoComplete="new-password" className="input" aria-describedby="confirm-error" {...register("confirm")} />
      </FormField>
      {serverError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Создаём аккаунт…" : "Зарегистрироваться"}
      </button>
      <p className="text-xs text-body/60">
        Регистрируясь, вы соглашаетесь с <Link href="/offer" className="underline">офертой</Link> и{" "}
        <Link href="/privacy-policy" className="underline">политикой конфиденциальности</Link>.
      </p>
      <p className="text-center text-sm text-body/70">
        Уже есть аккаунт? <Link href="/login" className="font-semibold text-brand hover:underline">Войти</Link>
      </p>
    </form>
  );
}
