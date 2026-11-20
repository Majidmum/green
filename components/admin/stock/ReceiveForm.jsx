"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { receiveStock } from "@/app/admin/stock/actions";
import { formatMoney, unitLabel } from "@/lib/utils/format";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Dushanbe" }).format(new Date());
const num = (v) => Number(String(v ?? "").replace(",", "."));

export default function ReceiveForm({ products, suppliers }) {
  const [supplier, setSupplier] = useState("");
  const [doc, setDoc] = useState("");
  const [date, setDate] = useState(today());
  const [comment, setComment] = useState("");
  const [rows, setRows] = useState([{ product_id: "", quantity: "", unit_cost: "" }]);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();

  const upd = (i, patch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const byId = new Map(products.map((p) => [p.id, p]));
  const total = rows.reduce((s, r) => s + num(r.quantity) * num(r.unit_cost), 0);

  const submit = (e) => {
    e.preventDefault();
    const items = rows.filter((r) => r.product_id).map((r) => ({ product_id: r.product_id, quantity: num(r.quantity), unit_cost: num(r.unit_cost) }));
    if (items.some((i) => !(i.quantity > 0) || Number.isNaN(i.unit_cost))) return setMsg({ ok: false, text: "У каждой позиции укажите количество и закупочную цену" });
    start(async () => {
      setMsg(null);
      const r = await receiveStock({ supplierId: supplier || null, document: doc, date, comment, items });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: `Приход проведён. Позиций: ${r.count}` });
      setRows([{ product_id: "", quantity: "", unit_cost: "" }]);
      setDoc("");
      setComment("");
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card grid gap-4 p-5 sm:grid-cols-4">
        <div><label htmlFor="r-sup" className="mb-1.5 block text-sm font-medium">Поставщик</label>
          <select id="r-sup" className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">— без поставщика —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label htmlFor="r-doc" className="mb-1.5 block text-sm font-medium">№ документа *</label><input id="r-doc" className="input" value={doc} onChange={(e) => setDoc(e.target.value)} maxLength={60} required /></div>
        <div><label htmlFor="r-date" className="mb-1.5 block text-sm font-medium">Дата *</label><input id="r-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div><label htmlFor="r-com" className="mb-1.5 block text-sm font-medium">Комментарий</label><input id="r-com" className="input" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} /></div>
      </div>

      <div className="card space-y-3 p-5">
        {rows.map((r, i) => {
          const p = byId.get(r.product_id);
          return (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_9rem_auto]">
              <div><label className="mb-1.5 block text-xs font-medium text-body/60">Товар</label>
                <select className="input" value={r.product_id} onChange={(e) => upd(i, { product_id: e.target.value })} aria-label={`Товар, строка ${i + 1}`}>
                  <option value="">— выберите товар —</option>
                  {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
              <div><label className="mb-1.5 block text-xs font-medium text-body/60">Кол-во{p ? `, ${unitLabel(p.unit)}` : ""}</label><input className="input" inputMode="decimal" value={r.quantity} onChange={(e) => upd(i, { quantity: e.target.value })} aria-label={`Количество, строка ${i + 1}`} /></div>
              <div><label className="mb-1.5 block text-xs font-medium text-body/60">Закуп. цена, сом.</label><input className="input" inputMode="decimal" value={r.unit_cost} onChange={(e) => upd(i, { unit_cost: e.target.value })} aria-label={`Закупочная цена, строка ${i + 1}`} /></div>
              <button type="button" className="rounded-full p-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30" disabled={rows.length === 1} aria-label="Убрать строку" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
            </div>
          );
        })}
        <button type="button" className="btn-outline !py-2" onClick={() => setRows((r) => [...r, { product_id: "", quantity: "", unit_cost: "" }])}><Plus size={15} /> Добавить позицию</button>
        <p className="text-right text-sm text-body/70">Сумма документа: <strong className="text-body">{formatMoney(total)}</strong></p>
      </div>

      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-tint text-heading" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Проводим…" : "Провести приход"}</button>
    </form>
  );
}
