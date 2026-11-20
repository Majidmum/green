"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { returnItems } from "@/app/admin/orders/actions";
import { formatMoney, formatQty, round3 } from "@/lib/utils/format";

// items: [{ id, product_name, unit, quantity, unit_price, returned }]
export default function ReturnForm({ orderId, items }) {
  const router = useRouter();
  const [qty, setQty] = useState({});
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();

  const rows = items.map((i) => ({ ...i, left: round3(i.quantity - i.returned) })).filter((i) => i.left > 0);
  if (rows.length === 0) return <p className="text-sm text-brand-ink/60">Все позиции уже возвращены.</p>;

  const chosen = rows.map((i) => ({ order_item_id: i.id, quantity: Number(String(qty[i.id] ?? "").replace(",", ".")) || 0, max: i.left, price: i.unit_price })).filter((x) => x.quantity > 0);
  const invalid = chosen.some((c) => c.quantity > c.max);
  const refund = chosen.reduce((s, c) => s + c.quantity * c.price, 0);

  const submit = () =>
    start(async () => {
      setMsg(null);
      const r = await returnItems({ orderId, items: chosen.map(({ order_item_id, quantity }) => ({ order_item_id, quantity })), restock, reason });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: `Возврат оформлен. Сумма возврата: ${formatMoney(r.refund)}` });
      setQty({});
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-brand-dark/10 text-sm">
        {rows.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
            <span>{i.product_name} <span className="text-brand-ink/50">· можно вернуть до {formatQty(i.left, i.unit)}</span></span>
            <input className="input !w-28 !py-2" inputMode="decimal" placeholder="Кол-во" aria-label={`Количество к возврату: ${i.product_name}`} value={qty[i.id] ?? ""} onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })} />
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Товар годен — вернуть на склад</label>
      {!restock && <p className="text-xs text-amber-700">Негодный товар на склад не вернётся: его себестоимость останется убытком.</p>}
      <input className="input" placeholder="Причина возврата" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Причина возврата" />
      {invalid && <p className="text-sm text-rose-600" role="alert">Количество превышает доступное для возврата</p>}
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-brand-light text-brand-dark" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <button className="btn-primary !py-2.5" disabled={pending || chosen.length === 0 || invalid} onClick={submit}>
        {pending ? "Оформляем…" : `Оформить возврат${refund ? ` (≈ ${formatMoney(refund)})` : ""}`}
      </button>
    </div>
  );
}
