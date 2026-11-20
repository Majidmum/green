"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { newPasswordSchema } from "@/lib/validations/auth";
import { translateAuthError } from "@/lib/utils/auth-errors";
import FormField from "@/components/auth/FormField";

export default function ResetForm() {
  const router = useRouter();
  const [session, setSession] = useState("loading"); // loading | yes | no
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(newPasswordSchema) });

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setSession(data.user ? "yes" : "no"));
  }, []);

  async function onSubmit({ password }) {
    setServerError("");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setServerError(translateAuthError(error));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (session === "loading") return <p className="text-center text-sm text-body/60">Проверяем ссылку…</p>;
  if (session === "no") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-body/70">Ссылка недействительна или устарела. Запросите новую.</p>
        <Link href="/forgot-password" className="btn-primary w-full">Запросить ссылку</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="password" label="Новый пароль" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="new-password" className="input" aria-describedby="password-error" {...register("password")} />
      </FormField>
      <FormField id="confirm" label="Повторите пароль" error={errors.confirm?.message}>
        <input id="confirm" type="password" autoComplete="new-password" className="input" aria-describedby="confirm-error" {...register("confirm")} />
      </FormField>
      {serverError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Сохраняем…" : "Сохранить пароль"}
      </button>
    </form>
  );
}
