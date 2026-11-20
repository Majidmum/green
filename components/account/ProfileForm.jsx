"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@/lib/validations/account";
import { updateProfile } from "@/app/(store)/(account)/actions";
import FormField from "@/components/auth/FormField";

export default function ProfileForm({ initial, email }) {
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: initial });

  const onSubmit = (values) =>
    start(async () => {
      setMsg(null);
      const res = await updateProfile(values);
      setMsg(res.ok ? { ok: true, text: "Данные сохранены" } : { ok: false, text: res.error });
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="pf-email" label="Email">
        <input id="pf-email" className="input bg-brand-cream/60" value={email ?? ""} disabled readOnly />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="pf-name" label="Имя" error={errors.full_name?.message}>
          <input id="pf-name" className="input" autoComplete="name" {...register("full_name")} />
        </FormField>
        <FormField id="pf-phone" label="Телефон" error={errors.phone?.message}>
          <input id="pf-phone" className="input" type="tel" autoComplete="tel" {...register("phone")} />
        </FormField>
      </div>
      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-brand-light text-brand-dark" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
    </form>
  );
}
