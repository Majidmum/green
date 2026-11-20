"use client";

import { useState, useTransition } from "react";
import { writeOff } from "@/app/admin/stock/actions";
import { WRITE_OFF_REASONS } from "@/lib/constants";
import { formatQty } from "@/lib/utils/format";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Dushanbe" }).format(new Date());

export default function WriteOffForm({ products, suppliers }) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("spoilage");
  const [supplier, setSupplier] = useState("");
  const [comment, setComment] = useState("");
  const [date, setDate] = useState(today());
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const p = products.find((x) => x.id === productId);

  const submit = (e) => {
    e.preventDefault();
    start(async () => {
      setMsg(null);
      const q = Number(String(quantity).replace(",", "."));
      const r = await writeOff({ productId, quantity: q, reason, comment, date, supplierId: reason === "supplier_return" && supplier ? supplier : null });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: "Списание проведено" });
      setQuantity(""); setComment("");
    });
  };

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-5">
      <div><label htmlFor="w-p" className="mb-1.5 block text-sm font-medium">Товар *</label>
        <select id="w-p" className="input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">— выберите товар —</option>
          {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        {p && <p className="mt-1 text-xs text-brand-ink/60">Сейчас на складе: {formatQty(p.quantity, p.unit)}</p>}</div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label htmlFor="w-q" className="mb-1.5 block text-sm font-medium">Количество *</label><input id="w-q" className="input" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></div>
        <div><label htmlFor="w-r" className="mb-1.5 block text-sm font-medium">Причина *</label>
          <select id="w-r" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{WRITE_OFF_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
        <div><label htmlFor="w-d" className="mb-1.5 block text-sm font-medium">Дата</label><input id="w-d" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      {reason === "supplier_return" && (
        <div><label htmlFor="w-s" className="mb-1.5 block text-sm font-medium">Поставщик</label>
          <select id="w-s" className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">— не указан —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <p className="mt-1 text-xs text-brand-ink/60">Возврат поставщику не считается потерей в расчёте прибыли.</p></div>
      )}
      <div><label htmlFor="w-c" className="mb-1.5 block text-sm font-medium">Комментарий</label><input id="w-c" className="input" maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-brand-light text-brand-dark" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Списываем…" : "Списать"}</button>
    </form>
  );
}
