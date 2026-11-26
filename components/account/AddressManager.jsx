"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { addressSchema } from "@/lib/validations/account";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/app/(store)/(account)/actions";
import FormField from "@/components/auth/FormField";
import { formatAddress } from "@/lib/orders/payload";

const EMPTY = { id: "", label: "Дом", city: "Душанбе", street: "", house: "", apartment: "", entrance: "", floor: "", note: "", is_default: false };

function AddressForm({ initial, onDone }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(addressSchema), defaultValues: initial });

  const onSubmit = (v) =>
    start(async () => {
      setError("");
      const res = await saveAddress(v);
      if (!res.ok) return setError(res.error);
      onDone();
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4 rounded-2xl border border-heading/10 bg-page/50 p-3 sm:p-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="ad-label" label="Название" error={errors.label?.message}>
          <input id="ad-label" className="input" {...register("label")} />
        </FormField>
        <FormField id="ad-city" label="Город" error={errors.city?.message}>
          <input id="ad-city" className="input" {...register("city")} />
        </FormField>
        <FormField id="ad-street" label="Улица" error={errors.street?.message}>
          <input id="ad-street" className="input" {...register("street")} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField id="ad-house" label="Дом"><input id="ad-house" className="input" {...register("house")} /></FormField>
        <FormField id="ad-apt" label="Квартира"><input id="ad-apt" className="input" {...register("apartment")} /></FormField>
        <FormField id="ad-ent" label="Подъезд"><input id="ad-ent" className="input" {...register("entrance")} /></FormField>
        <FormField id="ad-floor" label="Этаж"><input id="ad-floor" className="input" {...register("floor")} /></FormField>
      </div>
      <FormField id="ad-note" label="Комментарий курьеру"><input id="ad-note" className="input" {...register("note")} /></FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand" {...register("is_default")} /> Основной адрес
      </label>
      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="btn-primary !py-2.5" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить адрес"}</button>
        <button type="button" className="btn-outline !py-2.5" onClick={onDone}>Отмена</button>
      </div>
    </form>
  );
}

export default function AddressManager({ addresses }) {
  const [editing, setEditing] = useState(null); // null | "new" | address
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const run = (fn) =>
    start(async () => {
      setError("");
      const res = await fn();
      if (!res.ok) setError(res.error);
    });

  return (
    <div>
      {addresses.length === 0 && editing !== "new" && (
        <p className="text-sm text-body/60">Сохранённых адресов пока нет.</p>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-2xl border border-heading/10 bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold"><MapPin size={16} className="text-brand" /> {a.label}</span>
              {a.is_default && <span className="rounded-full bg-tint px-2 py-0.5 text-xs font-semibold text-heading">Основной</span>}
            </div>
            <p className="mt-2 text-sm text-body/70">{formatAddress(a)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {!a.is_default && (
                <button className="inline-flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 font-medium text-heading" disabled={pending} onClick={() => run(() => setDefaultAddress(a.id))}>
                  <Star size={13} /> Сделать основным
                </button>
              )}
              <button className="inline-flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 font-medium text-heading" onClick={() => setEditing(a)}>
                <Pencil size={13} /> Изменить
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700"
                disabled={pending}
                onClick={() => confirm("Удалить адрес?") && run(() => deleteAddress(a.id))}
              >
                <Trash2 size={13} /> Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p>}
      {editing ? (
        <AddressForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? { ...EMPTY, is_default: addresses.length === 0 } : { ...EMPTY, ...Object.fromEntries(Object.entries(editing).map(([k, v]) => [k, v ?? ""])) }}
          onDone={() => setEditing(null)}
        />
      ) : (
        <button className="btn-outline mt-4 w-full !py-2.5 sm:w-auto" onClick={() => setEditing("new")}><Plus size={16} /> Добавить адрес</button>
      )}
    </div>
  );
}
