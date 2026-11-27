"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { runStocktake } from "@/app/admin/stock/actions";
import { formatQty, unitLabel } from "@/lib/utils/format";

const num = (v) => Number(String(v).replace(",", "."));

export default function StocktakeForm({ products }) {
  const router = useRouter();
  const [actual, setActual] = useState({});
  const [q, setQ] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [products, q]);
  const filled = products.filter((p) => String(actual[p.id] ?? "").trim() !== "");
  const bad = filled.filter((p) => !(num(actual[p.id]) >= 0));

  const submit = () =>
    start(async () => {
      setMsg(null);
      const r = await runStocktake({ comment, items: filled.map((p) => ({ product_id: p.id, actual_quantity: num(actual[p.id]), expected_quantity: Number(p.quantity) })) });
      if (!r.ok) {
        if (r.stale) router.refresh();
        return setMsg({ ok: false, text: r.stale ? `${r.error} Список обновлён — введите данные заново для изменившихся товаров.` : r.error });
      }
      const x = r.result;
      setMsg({ ok: true, text: `Инвентаризация проведена. Корректировок: ${x.adjusted}, недостача: ${Number(x.shortage)}, излишек: ${Number(x.surplus)}` });
      setActual({});
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body/40" /><input className="input !pl-9" placeholder="Найти товар" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск товара" /></div>
        <p className="text-sm text-body/60">Заполнено: {filled.length}. Пустые строки не меняются.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="rt w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-heading/10 text-xs uppercase tracking-wide text-body/50"><tr><th className="px-4 py-3">Товар</th><th className="px-4 py-3">По учёту</th><th className="px-4 py-3">Фактически</th><th className="px-4 py-3">Разница</th></tr></thead>
          <tbody className="divide-y divide-heading/5">
            {shown.map((p) => {
              const v = actual[p.id] ?? "";
              const diff = String(v).trim() === "" ? null : num(v) - Number(p.quantity);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">{p.name}</td>
                  <td className="px-4 py-2.5">{formatQty(p.quantity, p.unit)}</td>
                  <td className="px-4 py-2.5"><input className="input !w-28 !py-1.5" inputMode="decimal" value={v} placeholder={unitLabel(p.unit)} onChange={(e) => setActual({ ...actual, [p.id]: e.target.value })} aria-label={`Фактический остаток: ${p.name}`} /></td>
                  <td className={`px-4 py-2.5 font-semibold ${diff === null ? "" : diff < 0 ? "text-rose-600" : diff > 0 ? "text-emerald-600" : "text-body/40"}`}>{diff === null ? "" : Number.isNaN(diff) ? "?" : `${diff > 0 ? "+" : ""}${Math.round(diff * 1000) / 1000}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <input className="input max-w-xl" placeholder="Комментарий (например, плановая инвентаризация)" maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Комментарий" />
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-tint text-heading" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <button className="btn-primary" disabled={pending || filled.length === 0 || bad.length > 0} onClick={submit}>{pending ? "Проводим…" : "Провести инвентаризацию"}</button>
      {bad.length > 0 && <p className="text-sm text-rose-600" role="alert">Проверьте числа в строках: {bad.map((p) => p.name).join(", ")}</p>}
    </div>
  );
}
